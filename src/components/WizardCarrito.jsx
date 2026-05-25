import { useState, useEffect, useMemo, useRef } from 'react'
import './WizardCarrito.css'
import PhoneInput from './PhoneInput.jsx'
import { getMenu }       from '../api/menu.js'
import { getInsumos }    from '../api/insumos.js'
import { getZonas }      from '../api/zonas.js'
import { getPaquetes }   from '../api/paquetes.js'
import { getServicios }  from '../api/servicios.js'
import { getRangosParaPersonas } from '../api/rangos.js'
import { verificarDisponibilidadZona } from '../api/disponibilidad.js'
import { buscarClientePorCorreo } from '../api/clientes.js'
import { crearSalon, crearRestaurante, crearCatering } from '../api/reservaciones.js'
import CalendarioReserva from './CalendarioReserva.jsx'

// ── Paso 1: Tipo ──────────────────────────────────────────
function PasoTipo({ tipo, onChange }) {
  const opciones = [
    { key: 'salon',      icon: '🏛️', label: 'Salón',      desc: 'Evento con zona, horario y paquete opcional' },
    { key: 'restaurante',icon: '🍽️', label: 'Restaurante', desc: 'Reservación de mesa con menú' },
    { key: 'catering',   icon: '🚚', label: 'Catering',    desc: 'Servicio a domicilio personalizado' },
  ]
  return (
    <div className="wc-card">
      <span className="wc-card-title">Tipo de reservación</span>
      <div className="wc-tipo-grid">
        {opciones.map(o => (
          <button key={o.key} className={`wc-tipo-btn ${tipo===o.key?'sel':''}`} onClick={() => onChange(o.key)}>
            <span className="wc-tipo-icon">{o.icon}</span>
            <span className="wc-tipo-label">{o.label}</span>
            <span className="wc-tipo-desc">{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Buscador de cliente ───────────────────────────────────
function BuscadorCliente({ cliente, onChange }) {
  const [buscando, setBuscando] = useState(false)
  const [estado, setEstado]     = useState(null)
  const debRef = useRef(null)

  function handleCorreo(correo) {
    onChange({ ...cliente, correo })
    setEstado(null)
    if (debRef.current) clearTimeout(debRef.current)
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (regex.test(correo)) {
      debRef.current = setTimeout(async () => {
        setBuscando(true)
        try {
          const { data } = await buscarClientePorCorreo(correo)
          if (data.encontrado) {
            setEstado('encontrado')
            onChange({ correo, nombre: data.nombre||'', telefono: data.telefono||'', notas: data.notas||'' })
          } else {
            setEstado('nuevo')
          }
        } catch { setEstado(null) }
        finally { setBuscando(false) }
      }, 600)
    }
  }

  return (
    <div className="wc-card">
      <span className="wc-card-title">Datos del cliente</span>
      <p style={{fontSize:11.5,color:'var(--text-soft)',marginBottom:12}}>
        Ingresa el correo — si el cliente ya existe se completarán sus datos automáticamente
      </p>

      <div className="wc-field">
        <label>Correo electrónico *</label>
        <div style={{position:'relative'}}>
          <input className={`wc-input ${buscando?'':''}`.trim()}
            type="email" value={cliente.correo}
            onChange={e => handleCorreo(e.target.value)}
            placeholder="cliente@ejemplo.com"
          />
          {buscando && (
            <svg style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',animation:'spin .7s linear infinite',color:'var(--rose)'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          )}
        </div>
        {estado==='encontrado' && <p style={{fontSize:11.5,color:'#2a9437',marginTop:3}}>✓ Cliente encontrado — datos completados</p>}
        {estado==='nuevo'      && <p style={{fontSize:11.5,color:'var(--text-soft)',marginTop:3}}>ℹ Correo nuevo — completa los datos</p>}
      </div>

      <div className="wc-2col">
        <div className="wc-field">
          <label>Nombre completo *</label>
          <input className="wc-input" type="text" value={cliente.nombre}
            onChange={e => onChange({...cliente,nombre:e.target.value})}
            placeholder="Nombre del cliente"/>
        </div>
        <div className="wc-field">
          <label>Teléfono *</label>
          <PhoneInput
            value={cliente.telefono}
            onChange={tel => onChange({...cliente, telefono: tel})}
          />
        </div>
      </div>

      <div className="wc-field">
        <label>Notas adicionales</label>
        <textarea className="wc-input" rows={2} value={cliente.notas}
          onChange={e => onChange({...cliente,notas:e.target.value})}
          placeholder="Preferencias, alergias, peticiones especiales..."/>
      </div>
    </div>
  )
}

// ── Paso Salón ────────────────────────────────────────────
function PasoSalon({
  datos, onChange, zonas, rangos, loadingRangos, sinRangos,
  dispPorZona, loadingDisp, paquetes, menuItems, insumos,
  servicios, carrito, onCarritoChange, fechasBloqueadas=[]
}) {
  const [busqMenu,   setBusqMenu]   = useState('')
  const [busqIns,    setBusqIns]    = useState('')
  const [busqSvc,    setBusqSvc]    = useState('')
  const [nuevoLibre, setNuevoLibre] = useState('')
  const [seccion,    setSeccion]    = useState('zona')   // zona | paquete | menu | insumos | servicios
  const [cantInputMenu, setCantInputMenu] = useState({}) // idMenu -> string texto libre
  const [cantInputIns,  setCantInputIns]  = useState({}) // idInsumo -> string texto libre

  const paquetesSalon = paquetes.filter(p => p.tipo?.toLowerCase()==='salon' || p.tipo?.toLowerCase()==='salón')

  function calcHoraFin(inicio, horas) {
    if (!inicio) return ''
    const [h,m] = inicio.split(':').map(Number)
    return new Date(0,0,0,h+horas,m).toTimeString().slice(0,5)
  }

  function dispZona(idZona) { return dispPorZona[idZona] ?? null }

  function toggleMenu(item) {
    const ex = carrito.menu.find(m => m.idMenu===item.idMenu)
    if (ex) onCarritoChange({...carrito, menu: carrito.menu.filter(m=>m.idMenu!==item.idMenu)})
    else onCarritoChange({...carrito, menu: [...carrito.menu,{idMenu:item.idMenu,cantidad:1,nombre:item.nombre,precio:item.precio,imagen:item.imagen}]})
  }
  function setCantMenu(idMenu,cant) {
    if(cant<=0){onCarritoChange({...carrito,menu:carrito.menu.filter(m=>m.idMenu!==idMenu)});return}
    onCarritoChange({...carrito,menu:carrito.menu.map(m=>m.idMenu===idMenu?{...m,cantidad:cant}:m)})
  }
  function toggleIns(item) {
    const ex = carrito.insumos.find(i=>i.idInsumo===item.idInsumo)
    if(ex) onCarritoChange({...carrito,insumos:carrito.insumos.filter(i=>i.idInsumo!==item.idInsumo)})
    else onCarritoChange({...carrito,insumos:[...carrito.insumos,{idInsumo:item.idInsumo,cantidad:1,nombre:item.nombre,precio:item.precioUnitario??0,imagen:item.imagen}]})
  }
  function setCantIns(idInsumo,cant) {
    if(cant<=0){onCarritoChange({...carrito,insumos:carrito.insumos.filter(i=>i.idInsumo!==idInsumo)});return}
    onCarritoChange({...carrito,insumos:carrito.insumos.map(i=>i.idInsumo===idInsumo?{...i,cantidad:cant}:i)})
  }
  function toggleSvc(id) {
    const ex = carrito.servicios.includes(id)
    if(ex) onCarritoChange({...carrito,servicios:carrito.servicios.filter(s=>s!==id)})
    else onCarritoChange({...carrito,servicios:[...carrito.servicios,id]})
  }
  function agregarLibre() {
    if(!nuevoLibre.trim()) return
    onCarritoChange({...carrito,serviciosLibres:[...carrito.serviciosLibres,nuevoLibre.trim()]})
    setNuevoLibre('')
  }
  function quitarLibre(i) {
    onCarritoChange({...carrito,serviciosLibres:carrito.serviciosLibres.filter((_,j)=>j!==i)})
  }
  function togglePaquete(p) {
    const sel = carrito.paquete?.idPaquete===p.idPaquete
    onCarritoChange({...carrito,paquete:sel?null:p})
  }

  const menuFilt  = menuItems.filter(m=>m.nombre.toLowerCase().includes(busqMenu.toLowerCase()))
  const insFilt   = insumos.filter(i=>i.nombre.toLowerCase().includes(busqIns.toLowerCase()))
  const svcFilt   = servicios.filter(s=>s.nombre.toLowerCase().includes(busqSvc.toLowerCase()))

  const tabs = [
    {key:'zona',    label:'Zona y Horario'},
    {key:'paquete', label:`Paquete ${carrito.paquete?'✓':''}`},
    {key:'menu',    label:`Menú ${carrito.menu.length>0?`(${carrito.menu.length})`:''}`},
    {key:'insumos', label:`Insumos ${carrito.insumos.length>0?`(${carrito.insumos.length})`:''}`},
  ]

  return (
    <>
      {/* Tabs de sección */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        {tabs.map(t=>(
          <button key={t.key}
            onClick={()=>setSeccion(t.key)}
            style={{
              padding:'6px 14px',borderRadius:20,border:'1.5px solid',
              fontSize:12.5,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
              fontFamily:'inherit',
              borderColor: seccion===t.key ? 'var(--rose)' : 'var(--cream-dk)',
              background: seccion===t.key ? 'var(--rose)' : 'var(--white)',
              color: seccion===t.key ? 'white' : 'var(--text-soft)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Zona y Horario ── */}
      {seccion==='zona' && (
        <div className="wc-card">
          <span className="wc-card-title">Zona y Horario</span>
          <div className="wc-field" style={{marginBottom:14}}>
            <label>Fecha *</label>
            <CalendarioReserva
              fechaSeleccionada={datos.fecha}
              onSelect={f=>onChange({...datos,fecha:f})}
              fechasBloqueadas={fechasBloqueadas}
            />
          </div>
          <div className="wc-field">
            <label>Número de personas *</label>
            <input className="wc-input" type="number" min="1"
              value={datos.personas} onChange={e=>onChange({...datos,personas:e.target.value})}
              placeholder="¿Cuántas personas?"/>
          </div>
          <div className="wc-2col">
            <div className="wc-field">
              <label>Hora de inicio</label>
              <input className="wc-input" type="time"
                value={datos.horaInicio} onChange={e=>onChange({...datos,horaInicio:e.target.value})}/>
            </div>
            <div className="wc-field">
              <label>Duración (horas)</label>
              <select className="wc-input" value={datos.duracion}
                onChange={e=>onChange({...datos,duracion:Number(e.target.value)})}>
                {[2,3,4,5,6,7,8,10,12].map(h=><option key={h} value={h}>{h} horas</option>)}
              </select>
            </div>
          </div>
          {datos.horaInicio && (
            <p style={{fontSize:12.5,color:'var(--text-soft)',marginBottom:12}}>
              🕐 Horario: <strong style={{color:'var(--rose)'}}>{datos.horaInicio}</strong> — <strong style={{color:'var(--rose)'}}>{calcHoraFin(datos.horaInicio,datos.duracion)}</strong>
            </p>
          )}

          {loadingRangos && <p className="wc-sin-resultados">Buscando espacios disponibles...</p>}
          {sinRangos && datos.personas && <div className="wc-info-box">⚠️ No hay espacios disponibles para {datos.personas} personas.</div>}

          {rangos.length>0 && !loadingRangos && (
            <>
              {loadingDisp && <p style={{fontSize:12,color:'var(--text-soft)',fontStyle:'italic',marginBottom:8}}>Verificando disponibilidad...</p>}
              <div className="wc-zona-grid">
                {rangos.map(r => {
                  const zonaRep = r.zonas?.[0]
                  const disp = zonaRep ? dispZona(zonaRep.idZona) : null
                  const ocupado = datos.fecha && !loadingDisp && disp?.disponible===false
                  const isSel = datos.idZona===zonaRep?.idZona
                  return (
                    <div key={r.idRango}
                      className={`wc-zona-card ${isSel?'sel':''} ${ocupado?'ocupado':''}`}
                      onClick={()=>{ if(ocupado) return; onChange({...datos,idZona:zonaRep?.idZona,nombreZona:r.nombre,precioZona:r.precio}) }}>
                      <div className="wc-zona-img">
                        {zonaRep?.imagen?<img src={zonaRep.imagen} alt={r.nombre}/>:<span>🏛️</span>}
                        {isSel && <div className="wc-zona-sel-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Sel.</div>}
                        {ocupado && <div className="wc-zona-ocupado-badge">Ocupado</div>}
                      </div>
                      <div className="wc-zona-body">
                        <p className="wc-zona-nombre">{r.nombre}</p>
                        <p className="wc-zona-cap">👥 hasta {r.zonas?.[0]?.capacidad||'?'} pers.</p>
                        <p className="wc-zona-precio">${Number(r.precio).toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                        {ocupado && disp?.horariosLibres?.length>0 && (
                          <div style={{marginTop:6}}>
                            <p style={{fontSize:10,color:'var(--text-soft)',marginBottom:4}}>Horarios disponibles:</p>
                            <div className="wc-horas-libres">
                              {disp.horariosLibres.map((h,i)=><span key={i} className="wc-hora-chip">{h}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Paquete ── */}
      {seccion==='paquete' && (
        <div className="wc-card">
          <span className="wc-card-title">Paquete (opcional)</span>
          <p style={{fontSize:12.5,color:'var(--text-soft)',marginBottom:14}}>
            Selecciona un paquete base. Puedes personalizar el menú e insumos por separado aunque elijas un paquete.
          </p>
          {paquetesSalon.length===0
            ? <p className="wc-sin-resultados">No hay paquetes de salón disponibles</p>
            : (
              <div className="wc-paq-grid">
                {paquetesSalon.map(p=>{
                  const sel=carrito.paquete?.idPaquete===p.idPaquete
                  return (
                    <div key={p.idPaquete} className={`wc-paq-card ${sel?'sel':''}`} onClick={()=>togglePaquete(p)}>
                      <div className="wc-paq-img">
                        {p.imagen?<img src={p.imagen} alt={p.nombre}/>:<span>🎁</span>}
                        {sel&&<div className="wc-paq-sel-badge">✓ Seleccionado</div>}
                      </div>
                      <div className="wc-paq-body">
                        <p className="wc-paq-nombre">{p.nombre}</p>
                        <p className="wc-paq-precio">${Number(p.precioExtra).toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                        <div className="wc-paq-chips">
                          {p.servicios?.length>0&&<span className="wc-paq-chip">{p.servicios.length} svc</span>}
                          {p.menuItems?.length>0&&<span className="wc-paq-chip">{p.menuItems.length} plat.</span>}
                          {p.zonas?.length>0&&<span className="wc-paq-chip">Salón incl.</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      )}

      {/* ── Menú ── */}
      {seccion==='menu' && (
        <div className="wc-card">
          <span className="wc-card-title">Platillos del menú</span>
          <div className="wc-busq-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="wc-busq" placeholder="Buscar platillo..." value={busqMenu} onChange={e=>setBusqMenu(e.target.value)}/>
          </div>
          <div className="wc-items-grid">
            {menuFilt.map(item=>{
              const sel=carrito.menu.find(m=>m.idMenu===item.idMenu)
              return (
                <div key={item.idMenu} className={`wc-item-card ${sel?'sel':''}`} onClick={()=>toggleMenu(item)}>
                  <div className="wc-item-img">
                    {item.imagen?<img src={item.imagen} alt={item.nombre}/>:<span>🍳</span>}
                    {sel&&<div className="wc-item-check">✓</div>}
                  </div>
                  <div className="wc-item-body">
                    <p className="wc-item-nombre">{item.nombre}</p>
                    <p className="wc-item-precio">${Number(item.precio).toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                  </div>
                  {sel&&(
                    <div className="wc-item-cant" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>{setCantMenu(item.idMenu,sel.cantidad-1);setCantInputMenu(p=>({...p,[item.idMenu]:String(Math.max(1,sel.cantidad-1))}));}}>−</button>
                      <input
                        type="number" min="1"
                        value={cantInputMenu[item.idMenu]??String(sel.cantidad)}
                        onChange={e=>setCantInputMenu(p=>({...p,[item.idMenu]:e.target.value}))}
                        onBlur={e=>{const v=Math.max(1,parseInt(e.target.value)||1);setCantMenu(item.idMenu,v);setCantInputMenu(p=>({...p,[item.idMenu]:String(v)}));}}
                        onKeyDown={e=>{if(e.key==='Enter'){const v=Math.max(1,parseInt(e.target.value)||1);setCantMenu(item.idMenu,v);setCantInputMenu(p=>({...p,[item.idMenu]:String(v)}));e.target.blur();}}}
                        onClick={e=>{e.stopPropagation();e.target.select();}}
                      />
                      <button onClick={()=>{setCantMenu(item.idMenu,sel.cantidad+1);setCantInputMenu(p=>({...p,[item.idMenu]:String(sel.cantidad+1)}));}}>+</button>
                    </div>
                  )}
                </div>
              )
            })}
            {menuFilt.length===0&&<p className="wc-sin-resultados">Sin resultados para "{busqMenu}"</p>}
          </div>
        </div>
      )}

      {/* ── Insumos ── */}
      {seccion==='insumos' && (
        <div className="wc-card">
          <span className="wc-card-title">Insumos y decoración</span>
          <div className="wc-busq-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="wc-busq" placeholder="Buscar insumo..." value={busqIns} onChange={e=>setBusqIns(e.target.value)}/>
          </div>
          <div className="wc-items-grid">
            {insFilt.map(item=>{
              const sel=carrito.insumos.find(i=>i.idInsumo===item.idInsumo)
              return (
                <div key={item.idInsumo} className={`wc-item-card ${sel?'sel':''}`} onClick={()=>toggleIns(item)}>
                  <div className="wc-item-img">
                    {item.imagen?<img src={item.imagen} alt={item.nombre}/>:<span>🎀</span>}
                    {sel&&<div className="wc-item-check">✓</div>}
                  </div>
                  <div className="wc-item-body">
                    <p className="wc-item-nombre">{item.nombre}</p>
                    <p className="wc-item-precio">${Number(item.precioUnitario??0).toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                  </div>
                  {sel&&(
                    <div className="wc-item-cant" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>{setCantIns(item.idInsumo,sel.cantidad-1);setCantInputIns(p=>({...p,[item.idInsumo]:String(Math.max(1,sel.cantidad-1))}));}}>−</button>
                      <input
                        type="number" min="1"
                        value={cantInputIns[item.idInsumo]??String(sel.cantidad)}
                        onChange={e=>setCantInputIns(p=>({...p,[item.idInsumo]:e.target.value}))}
                        onBlur={e=>{const v=Math.max(1,parseInt(e.target.value)||1);setCantIns(item.idInsumo,v);setCantInputIns(p=>({...p,[item.idInsumo]:String(v)}));}}
                        onKeyDown={e=>{if(e.key==='Enter'){const v=Math.max(1,parseInt(e.target.value)||1);setCantIns(item.idInsumo,v);setCantInputIns(p=>({...p,[item.idInsumo]:String(v)}));e.target.blur();}}}
                        onClick={e=>{e.stopPropagation();e.target.select();}}
                      />
                      <button onClick={()=>{setCantIns(item.idInsumo,sel.cantidad+1);setCantInputIns(p=>({...p,[item.idInsumo]:String(sel.cantidad+1)}));}}>+</button>
                    </div>
                  )}
                </div>
              )
            })}
            {insFilt.length===0&&<p className="wc-sin-resultados">Sin resultados para "{busqIns}"</p>}
          </div>
        </div>
      )}
    </>
  )
}

// ── Paso Restaurante ──────────────────────────────────────
function PasoRestaurante({ datos, onChange, menuItems, carrito, onCarritoChange, fechasBloqueadas=[] }) {
  const [busq, setBusq] = useState('')
  const menuFilt = menuItems.filter(m=>m.nombre.toLowerCase().includes(busq.toLowerCase()) && (!m.tipos?.length || m.tipos.some(t=>t.toLowerCase()==='restaurante')))

  function toggleMenu(item) {
    const ex=carrito.menu.find(m=>m.idMenu===item.idMenu)
    if(ex) onCarritoChange({...carrito,menu:carrito.menu.filter(m=>m.idMenu!==item.idMenu)})
    else onCarritoChange({...carrito,menu:[...carrito.menu,{idMenu:item.idMenu,cantidad:1,nombre:item.nombre,precio:item.precio,imagen:item.imagen}]})
  }
  function setCant(idMenu,cant) {
    if(cant<=0){onCarritoChange({...carrito,menu:carrito.menu.filter(m=>m.idMenu!==idMenu)});return}
    onCarritoChange({...carrito,menu:carrito.menu.map(m=>m.idMenu===idMenu?{...m,cantidad:cant}:m)})
  }

  return (
    <>
      <div className="wc-card">
        <span className="wc-card-title">Datos de la reservación</span>
        <div className="wc-field" style={{marginBottom:14}}>
          <label>Fecha *</label>
          <CalendarioReserva
            fechaSeleccionada={datos.fecha}
            onSelect={f=>onChange({...datos,fecha:f})}
            fechasBloqueadas={fechasBloqueadas}
          />
        </div>
        <div className="wc-2col">
          <div className="wc-field">
            <label>Hora de llegada</label>
            <input className="wc-input" type="time"
              value={datos.horaLlegada} onChange={e=>onChange({...datos,horaLlegada:e.target.value})}/>
          </div>
        </div>
        <div className="wc-field">
          <label>Número de personas *</label>
          <input className="wc-input" type="number" min="1"
            value={datos.personas} onChange={e=>onChange({...datos,personas:e.target.value})}
            placeholder="¿Cuántas personas?"/>
        </div>
      </div>

      <div className="wc-card">
        <span className="wc-card-title">Platillos (opcional)</span>
        <p style={{fontSize:12.5,color:'var(--text-soft)',marginBottom:12}}>Puedes pre-seleccionar platillos de referencia para el cliente.</p>
        <div className="wc-busq-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="wc-busq" placeholder="Buscar platillo..." value={busq} onChange={e=>setBusq(e.target.value)}/>
        </div>
        <div className="wc-items-grid">
          {menuFilt.map(item=>{
            const sel=carrito.menu.find(m=>m.idMenu===item.idMenu)
            return (
              <div key={item.idMenu} className={`wc-item-card ${sel?'sel':''}`} onClick={()=>toggleMenu(item)}>
                <div className="wc-item-img">
                  {item.imagen?<img src={item.imagen} alt={item.nombre}/>:<span>🍽️</span>}
                  {sel&&<div className="wc-item-check">✓</div>}
                </div>
                <div className="wc-item-body">
                  <p className="wc-item-nombre">{item.nombre}</p>
                  <p className="wc-item-precio">${Number(item.precio).toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                </div>
                {sel&&(
                  <div className="wc-item-cant" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>setCant(item.idMenu,sel.cantidad-1)}>−</button>
                    <input
                      type="number" min="1"
                      value={sel.cantidad}
                      onChange={e=>setCant(item.idMenu,Number(e.target.value)||1)}
                      style={{width:36,textAlign:'center',border:'none',background:'transparent',fontWeight:700,fontSize:13,color:'var(--text)',fontFamily:'inherit',outline:'none'}}
                      onClick={e=>e.stopPropagation()}
                    />
                    <button onClick={()=>setCant(item.idMenu,sel.cantidad+1)}>+</button>
                  </div>
                )}
              </div>
            )
          })}
          {menuFilt.length===0&&<p className="wc-sin-resultados">Sin resultados</p>}
        </div>
      </div>
    </>
  )
}

// ── Paso Catering ─────────────────────────────────────────
function PasoCatering({ datos, onChange, menuItems, insumos, servicios, carrito, onCarritoChange, fechasBloqueadas=[] }) {
  const [busqMenu, setBusqMenu] = useState('')
  const [busqIns,  setBusqIns]  = useState('')
  const [busqSvc,  setBusqSvc]  = useState('')
  const [nuevoLibre, setNuevoLibre] = useState('')
  const [sec, setSec] = useState('datos')
  const [cantInputMenu, setCantInputMenu] = useState({})
  const [cantInputIns,  setCantInputIns]  = useState({})

  const menuFilt = menuItems.filter(m=>m.nombre.toLowerCase().includes(busqMenu.toLowerCase()))
  const insFilt  = insumos.filter(i=>i.nombre.toLowerCase().includes(busqIns.toLowerCase()))
  const svcFilt  = servicios.filter(s=>s.nombre.toLowerCase().includes(busqSvc.toLowerCase()))

  function toggleMenu(item) {
    const ex=carrito.menu.find(m=>m.idMenu===item.idMenu)
    if(ex) onCarritoChange({...carrito,menu:carrito.menu.filter(m=>m.idMenu!==item.idMenu)})
    else onCarritoChange({...carrito,menu:[...carrito.menu,{idMenu:item.idMenu,cantidad:1,nombre:item.nombre,precio:item.precio,imagen:item.imagen}]})
  }
  function setCantMenu(idMenu,cant) {
    if(cant<=0){onCarritoChange({...carrito,menu:carrito.menu.filter(m=>m.idMenu!==idMenu)});return}
    onCarritoChange({...carrito,menu:carrito.menu.map(m=>m.idMenu===idMenu?{...m,cantidad:cant}:m)})
  }
  function toggleIns(item) {
    const ex=carrito.insumos.find(i=>i.idInsumo===item.idInsumo)
    if(ex) onCarritoChange({...carrito,insumos:carrito.insumos.filter(i=>i.idInsumo!==item.idInsumo)})
    else onCarritoChange({...carrito,insumos:[...carrito.insumos,{idInsumo:item.idInsumo,cantidad:1,nombre:item.nombre,precio:item.precioUnitario??0,imagen:item.imagen}]})
  }
  function setCantIns(idInsumo,cant) {
    if(cant<=0){onCarritoChange({...carrito,insumos:carrito.insumos.filter(i=>i.idInsumo!==idInsumo)});return}
    onCarritoChange({...carrito,insumos:carrito.insumos.map(i=>i.idInsumo===idInsumo?{...i,cantidad:cant}:i)})
  }
  function toggleSvc(id) {
    const ex=carrito.servicios.includes(id)
    if(ex) onCarritoChange({...carrito,servicios:carrito.servicios.filter(s=>s!==id)})
    else onCarritoChange({...carrito,servicios:[...carrito.servicios,id]})
  }
  function agregarLibre() {
    if(!nuevoLibre.trim()) return
    onCarritoChange({...carrito,serviciosLibres:[...carrito.serviciosLibres,nuevoLibre.trim()]})
    setNuevoLibre('')
  }

  const tabs=[
    {key:'datos',label:'Datos'},
    {key:'menu',label:`Menú ${carrito.menu.length>0?`(${carrito.menu.length})`:''}`},
    {key:'insumos',label:`Insumos ${carrito.insumos.length>0?`(${carrito.insumos.length})`:''}`},
  ]

  return (
    <>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setSec(t.key)}
            style={{padding:'6px 14px',borderRadius:20,border:'1.5px solid',fontSize:12.5,fontWeight:600,cursor:'pointer',transition:'all 0.15s',fontFamily:'inherit',borderColor:sec===t.key?'var(--rose)':'var(--cream-dk)',background:sec===t.key?'var(--rose)':'var(--white)',color:sec===t.key?'white':'var(--text-soft)'}}>
            {t.label}
          </button>
        ))}
      </div>

      {sec==='datos' && (
        <div className="wc-card">
          <span className="wc-card-title">Datos del catering</span>
          <div className="wc-field" style={{marginBottom:14}}>
            <label>Fecha *</label>
            <CalendarioReserva
              fechaSeleccionada={datos.fecha}
              onSelect={f=>onChange({...datos,fecha:f})}
              fechasBloqueadas={fechasBloqueadas}
            />
          </div>
          <div className="wc-field">
            <label>Número de personas *</label>
            <input className="wc-input" type="number" min="1" value={datos.personas}
              onChange={e=>onChange({...datos,personas:e.target.value})} placeholder="Personas"/>
          </div>
          <div className="wc-2col">
            <div className="wc-field">
              <label>Hora de inicio</label>
              <input className="wc-input" type="time" value={datos.horaInicio}
                onChange={e=>onChange({...datos,horaInicio:e.target.value})}/>
            </div>
            <div className="wc-field">
              <label>Hora de fin</label>
              <input className="wc-input" type="time" value={datos.horaFin}
                onChange={e=>onChange({...datos,horaFin:e.target.value})}/>
            </div>
          </div>
          <div className="wc-field">
            <label>Lugar / Dirección *</label>
            <input className="wc-input" type="text" value={datos.lugar}
              onChange={e=>onChange({...datos,lugar:e.target.value})}
              placeholder="Dirección del evento"/>
          </div>
        </div>
      )}

      {sec==='menu' && (
        <div className="wc-card">
          <span className="wc-card-title">Platillos</span>
          <div className="wc-busq-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="wc-busq" placeholder="Buscar platillo..." value={busqMenu} onChange={e=>setBusqMenu(e.target.value)}/>
          </div>
          <div className="wc-items-grid">
            {menuFilt.map(item=>{
              const sel=carrito.menu.find(m=>m.idMenu===item.idMenu)
              return (
                <div key={item.idMenu} className={`wc-item-card ${sel?'sel':''}`} onClick={()=>toggleMenu(item)}>
                  <div className="wc-item-img">{item.imagen?<img src={item.imagen} alt={item.nombre}/>:<span>🍳</span>}{sel&&<div className="wc-item-check">✓</div>}</div>
                  <div className="wc-item-body">
                    <p className="wc-item-nombre">{item.nombre}</p>
                    <p className="wc-item-precio">${Number(item.precio).toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                  </div>
                  {sel&&(<div className="wc-item-cant" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{setCantMenu(item.idMenu,sel.cantidad-1);setCantInputMenu(p=>({...p,[item.idMenu]:String(Math.max(1,sel.cantidad-1))}));}}>−</button>
                    <input type="number" min="1"
                      value={cantInputMenu[item.idMenu]??String(sel.cantidad)}
                      onChange={e=>setCantInputMenu(p=>({...p,[item.idMenu]:e.target.value}))}
                      onBlur={e=>{const v=Math.max(1,parseInt(e.target.value)||1);setCantMenu(item.idMenu,v);setCantInputMenu(p=>({...p,[item.idMenu]:String(v)}));}}
                      onKeyDown={e=>{if(e.key==='Enter'){const v=Math.max(1,parseInt(e.target.value)||1);setCantMenu(item.idMenu,v);setCantInputMenu(p=>({...p,[item.idMenu]:String(v)}));e.target.blur();}}}
                      onClick={e=>{e.stopPropagation();e.target.select();}}/>
                    <button onClick={()=>{setCantMenu(item.idMenu,sel.cantidad+1);setCantInputMenu(p=>({...p,[item.idMenu]:String(sel.cantidad+1)}));}}>+</button>
                  </div>)}
                </div>
              )
            })}
            {menuFilt.length===0&&<p className="wc-sin-resultados">Sin resultados</p>}
          </div>
        </div>
      )}

      {sec==='insumos' && (
        <div className="wc-card">
          <span className="wc-card-title">Insumos y decoración</span>
          <div className="wc-busq-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="wc-busq" placeholder="Buscar insumo..." value={busqIns} onChange={e=>setBusqIns(e.target.value)}/>
          </div>
          <div className="wc-items-grid">
            {insFilt.map(item=>{
              const sel=carrito.insumos.find(i=>i.idInsumo===item.idInsumo)
              return (
                <div key={item.idInsumo} className={`wc-item-card ${sel?'sel':''}`} onClick={()=>toggleIns(item)}>
                  <div className="wc-item-img">{item.imagen?<img src={item.imagen} alt={item.nombre}/>:<span>🎀</span>}{sel&&<div className="wc-item-check">✓</div>}</div>
                  <div className="wc-item-body">
                    <p className="wc-item-nombre">{item.nombre}</p>
                    <p className="wc-item-precio">${Number(item.precioUnitario??0).toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                  </div>
                  {sel&&(<div className="wc-item-cant" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{setCantIns(item.idInsumo,sel.cantidad-1);setCantInputIns(p=>({...p,[item.idInsumo]:String(Math.max(1,sel.cantidad-1))}));}}>−</button>
                    <input type="number" min="1"
                      value={cantInputIns[item.idInsumo]??String(sel.cantidad)}
                      onChange={e=>setCantInputIns(p=>({...p,[item.idInsumo]:e.target.value}))}
                      onBlur={e=>{const v=Math.max(1,parseInt(e.target.value)||1);setCantIns(item.idInsumo,v);setCantInputIns(p=>({...p,[item.idInsumo]:String(v)}));}}
                      onKeyDown={e=>{if(e.key==='Enter'){const v=Math.max(1,parseInt(e.target.value)||1);setCantIns(item.idInsumo,v);setCantInputIns(p=>({...p,[item.idInsumo]:String(v)}));e.target.blur();}}}
                      onClick={e=>{e.stopPropagation();e.target.select();}}/>
                    <button onClick={()=>{setCantIns(item.idInsumo,sel.cantidad+1);setCantInputIns(p=>({...p,[item.idInsumo]:String(sel.cantidad+1)}));}}>+</button>
                  </div>)}
                </div>
              )
            })}
            {insFilt.length===0&&<p className="wc-sin-resultados">Sin resultados</p>}
          </div>
        </div>
      )}
    </>
  )
}

// ══ COMPONENTE PRINCIPAL ══════════════════════════════════
const CARRITO_EMPTY = {
  menu: [], insumos: [], paquete: null,
  servicios: [], serviciosLibres: []
}

export default function WizardCarrito({ onFinish, onCancel }) {
  const [tipo,    setTipo]    = useState('')
  const [cliente, setCliente] = useState({ correo:'', nombre:'', telefono:'', notas:'' })
  const [datosSalon, setDatosSalon] = useState({ fecha:'', personas:'', horaInicio:'13:00', duracion:5, idZona:null, nombreZona:'', precioZona:0 })
  const [datosRest,  setDatosRest]  = useState({ fecha:'', personas:'', horaLlegada:'14:00' })
  const [datosCat,   setDatosCat]   = useState({ fecha:'', personas:'', horaInicio:'', horaFin:'', lugar:'' })
  const [carrito,    setCarrito]     = useState(CARRITO_EMPTY)
  const [precioManual, setPrecioManual] = useState('')
  const [errores,  setErrores]  = useState({})
  const [error,    setError]    = useState(null)
  const [saving,   setSaving]   = useState(false)

  // Catálogos
  const [menuItems,  setMenuItems]  = useState([])
  const [insumos,    setInsumos]    = useState([])
  const [zonas,      setZonas]      = useState([])
  const [paquetes,   setPaquetes]   = useState([])
  const [servicios,  setServicios]  = useState([])
  const [rangos,     setRangos]     = useState([])
  const [loadingRangos, setLoadingRangos] = useState(false)
  const [sinRangos,  setSinRangos]  = useState(false)
  const [dispPorZona, setDispPorZona] = useState({})
  const [loadingDisp, setLoadingDisp] = useState(false)

  const [fechasBloqueadas, setFechasBloqueadas] = useState([])

  useEffect(() => {
    Promise.all([
      getMenu().then(r=>setMenuItems(r.data.filter(m=>m.estado==='activo'))),
      getInsumos().then(r=>setInsumos(r.data.filter(i=>!i.eliminado))),
      getZonas().then(r=>setZonas(r.data.filter(z=>z.activo))),
      getPaquetes().then(r=>setPaquetes(r.data.filter(p=>!p.eliminado))),
      getServicios().then(r=>setServicios(r.data)),
    ]).catch(()=>{})
  }, [])

  // Cargar rangos cuando cambia personas (solo salón)
  useEffect(()=>{
    if(tipo!=='salon' || !datosSalon.personas || Number(datosSalon.personas)<1){
      setRangos([]); setSinRangos(false); return
    }
    setLoadingRangos(true); setSinRangos(false)
    getRangosParaPersonas(Number(datosSalon.personas))
      .then(r=>{setRangos(r.data);setSinRangos(r.data.length===0)})
      .catch(()=>setSinRangos(true))
      .finally(()=>setLoadingRangos(false))
  },[datosSalon.personas, tipo])

  // Verificar disponibilidad cuando cambian fecha/hora/duracion/rangos
  useEffect(()=>{
    if(!datosSalon.fecha||!datosSalon.horaInicio||rangos.length===0){setDispPorZona({});return}
    const zonasUnicas=[]
    rangos.forEach(r=>r.zonas?.forEach(z=>{if(!zonasUnicas.find(x=>x.idZona===z.idZona))zonasUnicas.push(z)}))
    if(zonasUnicas.length===0) return
    setLoadingDisp(true); setDispPorZona({})
    Promise.allSettled(
      zonasUnicas.map(z=>
        verificarDisponibilidadZona(z.idZona,datosSalon.fecha,datosSalon.horaInicio,datosSalon.duracion)
          .then(r=>({idZona:z.idZona,data:r.data}))
          .catch(()=>({idZona:z.idZona,data:null}))
      )
    ).then(results=>{
      const mapa={}
      results.forEach(r=>{
        if(r.status==='fulfilled'&&r.value.data)
          mapa[r.value.idZona]={disponible:r.value.data.disponible,horariosLibres:r.value.data.horariosLibres??[],motivo:r.value.data.mensaje??null}
      })
      setDispPorZona(mapa)
    }).finally(()=>setLoadingDisp(false))
  },[datosSalon.fecha,datosSalon.horaInicio,datosSalon.duracion,rangos])

  // Precio calculado del carrito
  const precioCalculado = useMemo(()=>{
    const pm = carrito.menu.reduce((s,m)=>s+Number(m.precio)*m.cantidad,0)
    const pi = carrito.insumos.reduce((s,i)=>s+Number(i.precio)*i.cantidad,0)
    const pp = carrito.paquete ? Number(carrito.paquete.precioExtra) : 0
    const pz = tipo==='salon' ? Number(datosSalon.precioZona||0) : 0
    return pm+pi+pp+pz
  },[carrito,tipo,datosSalon.precioZona])

  const precioFinal = precioManual!=='' ? Number(precioManual) : precioCalculado

  // Total items carrito
  const totalItems = carrito.menu.length+carrito.insumos.length+
    (carrito.paquete?1:0)+carrito.servicios.length+carrito.serviciosLibres.length

  // Pasos
  const PASOS = [
    {num:1,label:'Tipo'},
    {num:2,label:'Cliente'},
    {num:3,label:tipo==='salon'?'Salón':tipo==='restaurante'?'Restaurante':'Catering'},
  ]
  const [pasoActual, setPasoActual] = useState(1)

  function validarPaso() {
    const e = {}
    if(pasoActual===1 && !tipo) e.tipo='Selecciona un tipo'
    if(pasoActual===2){
      if(!cliente.nombre.trim()) e.nombre='El nombre es obligatorio'
      if(!cliente.correo.trim()) e.correo='El correo es obligatorio'
      if(!cliente.telefono.trim()) {
        e.telefono='El teléfono es obligatorio'
      } else {
        // Extraer solo dígitos quitando lada y separadores
        const soloDigitos = cliente.telefono.replace(/[^\d]/g,'')
        // Si tiene lada +52 (2 dígitos de país), quedan 12 dígitos → 10 del número
        // Si tiene lada de otro país, validar entre 6 y 15 dígitos
        const esMexico = cliente.telefono.startsWith('+52') || cliente.telefono.startsWith('52')
        if (esMexico) {
          const num = soloDigitos.startsWith('52') ? soloDigitos.slice(2) : soloDigitos
          if (num.length !== 10) e.telefono = 'El número mexicano debe tener 10 dígitos'
          else if (!/^[1-9]/.test(num)) e.telefono = 'El número no puede empezar con 0'
        } else {
          if (soloDigitos.length < 6)  e.telefono = 'El número es muy corto'
          if (soloDigitos.length > 18) e.telefono = 'El número es muy largo'
        }
      }
    }
    if(pasoActual===3){
      if(tipo==='salon'){
        if(!datosSalon.fecha) e.fecha='Selecciona una fecha'
        if(!datosSalon.personas) e.personas='Indica el número de personas'
      }
      if(tipo==='restaurante'){
        if(!datosRest.fecha) e.fecha='Selecciona una fecha'
        if(!datosRest.personas) e.personas='Indica el número de personas'
      }
      if(tipo==='catering'){
        if(!datosCat.fecha) e.fecha='Selecciona una fecha'
        if(!datosCat.personas) e.personas='Indica el número de personas'
        if(!datosCat.lugar.trim()) e.lugar='Indica el lugar'
      }
    }
    setErrores(e)
    return Object.keys(e).length===0
  }

  function siguiente() {
    if(!validarPaso()) return
    if(pasoActual<3) setPasoActual(pasoActual+1)
    else guardar()
  }

  async function guardar() {
    if(!validarPaso()) return
    try {
      setSaving(true); setError(null)
      const clientePayload = { nombre:cliente.nombre, telefono:cliente.telefono, correo:cliente.correo, notas:cliente.notas }

      if(tipo==='salon'){
        const payload = {
          fecha:datosSalon.fecha, noPersonas:Number(datosSalon.personas),
          horaInicio:datosSalon.horaInicio+':00', duracionHoras:Number(datosSalon.duracion),
          idZona:datosSalon.idZona,
          idPaquete:carrito.paquete?.idPaquete??null,
          platillos:carrito.menu.map(m=>({idMenu:m.idMenu,cantidad:m.cantidad})),
          insumos:carrito.insumos.map(i=>({idInsumo:i.idInsumo,cantidad:i.cantidad})),
          idServicios:carrito.servicios,
          serviciosLibres:carrito.serviciosLibres,
          precioPersonalizado: precioManual!=='' ? Number(precioManual) : undefined,
          cliente: clientePayload,
        }
        console.log('[WizardCarrito] payload salón →', JSON.stringify(payload, null, 2))
        await crearSalon(payload)
      } else if(tipo==='restaurante'){
        const payload = {
          fecha:datosRest.fecha, noPersonas:Number(datosRest.personas),
          horaLlegada:datosRest.horaLlegada ? datosRest.horaLlegada+':00' : undefined,
          platillos:carrito.menu.map(m=>({idMenu:m.idMenu,cantidad:m.cantidad})),
          precioPersonalizado: precioManual!=='' ? Number(precioManual) : undefined,
          cliente: clientePayload,
        }
        console.log('[WizardCarrito] payload restaurante →', JSON.stringify(payload, null, 2))
        await crearRestaurante(payload)
      } else {
        const payload = {
          fecha:datosCat.fecha, noPersonas:Number(datosCat.personas),
          horaInicio:datosCat.horaInicio ? datosCat.horaInicio+':00' : undefined,
          horaFin:datosCat.horaFin ? datosCat.horaFin+':00' : undefined,
          lugar:datosCat.lugar,
          platillos:carrito.menu.map(m=>({idMenu:m.idMenu,cantidad:m.cantidad})),
          insumos:carrito.insumos.map(i=>({idInsumo:i.idInsumo,cantidad:i.cantidad})),
          idServicios:carrito.servicios,
          serviciosLibres:carrito.serviciosLibres,
          precioPersonalizado: precioManual!=='' ? Number(precioManual) : undefined,
          cliente: clientePayload,
        }
        console.log('[WizardCarrito] payload catering →', JSON.stringify(payload, null, 2))
        await crearCatering(payload)
      }
      onFinish?.()
    } catch(ex){
      console.error('[WizardCarrito] status:', ex.response?.status)
      console.error('[WizardCarrito] data:', JSON.stringify(ex.response?.data))
      const msg = ex.response?.data?.message
        ?? ex.response?.data?.error
        ?? (typeof ex.response?.data === 'string' ? ex.response.data : null)
        ?? ex.message
        ?? 'Error al crear la reservación'
      setError(msg)
    } finally { setSaving(false) }
  }

  const formatMXN = n => `$${Number(n).toLocaleString('es-MX',{minimumFractionDigits:2})}`

  return (
    <div className="wc-root">
      {/* Pasos */}
      <div className="wc-steps">
        {PASOS.map((p,i)=>(
          <div key={p.num} style={{display:'flex',alignItems:'center',gap:0,flex:i<PASOS.length-1?1:undefined}}>
            <div className={`wc-step ${pasoActual===p.num?'activo':''} ${pasoActual>p.num?'hecho':''}`}>
              <div className="wc-step-num">
                {pasoActual>p.num ? '✓' : p.num}
              </div>
              <span>{p.label}</span>
            </div>
            {i<PASOS.length-1 && <div className="wc-step-sep"/>}
          </div>
        ))}
      </div>

      <div className="wc-body">
        {/* Panel principal */}
        <div className="wc-main">
          {error && (
            <div className="wc-error-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Paso 1: Tipo */}
          {pasoActual===1 && <PasoTipo tipo={tipo} onChange={v=>{setTipo(v);setCarrito(CARRITO_EMPTY)}}/>}
          {errores.tipo && <p className="wc-field-err">⚠ {errores.tipo}</p>}

          {/* Paso 2: Cliente */}
          {pasoActual===2 && (
            <>
              <BuscadorCliente cliente={cliente} onChange={setCliente}/>
              {Object.values(errores).some(Boolean) && (
                <div className="wc-error-box">⚠ Completa todos los campos obligatorios</div>
              )}
            </>
          )}

          {/* Paso 3: Detalles según tipo */}
          {pasoActual===3 && tipo==='salon' && (
            <PasoSalon
              datos={datosSalon} onChange={setDatosSalon}
              zonas={zonas} rangos={rangos} loadingRangos={loadingRangos} sinRangos={sinRangos}
              dispPorZona={dispPorZona} loadingDisp={loadingDisp}
              paquetes={paquetes} menuItems={menuItems} insumos={insumos}
              servicios={servicios} carrito={carrito} onCarritoChange={setCarrito}
              fechasBloqueadas={fechasBloqueadas}
            />
          )}
          {pasoActual===3 && tipo==='restaurante' && (
            <PasoRestaurante
              datos={datosRest} onChange={setDatosRest}
              menuItems={menuItems} carrito={carrito} onCarritoChange={setCarrito}
              fechasBloqueadas={fechasBloqueadas}
            />
          )}
          {pasoActual===3 && tipo==='catering' && (
            <PasoCatering
              datos={datosCat} onChange={setDatosCat}
              menuItems={menuItems} insumos={insumos} servicios={servicios}
              carrito={carrito} onCarritoChange={setCarrito}
              fechasBloqueadas={fechasBloqueadas}
            />
          )}

          {/* Navegación */}
          <div style={{display:'flex',justifyContent:'space-between',gap:10,paddingTop:4}}>
            <button onClick={pasoActual>1?()=>setPasoActual(pasoActual-1):onCancel}
              style={{height:42,padding:'0 20px',background:'var(--white)',color:'var(--text-soft)',border:'1.5px solid var(--cream-dk)',borderRadius:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}
              onMouseOver={e=>{e.target.style.borderColor='var(--rose)';e.target.style.color='var(--rose)'}}
              onMouseOut={e=>{e.target.style.borderColor='var(--cream-dk)';e.target.style.color='var(--text-soft)'}}>
              {pasoActual===1 ? 'Cancelar' : '← Atrás'}
            </button>
            <button onClick={siguiente} disabled={saving}
              style={{height:42,padding:'0 28px',background:'linear-gradient(135deg,var(--rose),var(--rose-dk,#c01870))',color:'white',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(222,41,137,0.3)',transition:'all 0.2s',opacity:saving?0.6:1}}>
              {saving ? 'Guardando...' : pasoActual===3 ? '✓ Crear reservación' : 'Siguiente →'}
            </button>
          </div>
        </div>

        {/* ── Carrito ── */}
        <div className="wc-carrito">
          <div className="wc-carrito-header">
            <h3>🛒 Resumen</h3>
            <span className="wc-carrito-count">{totalItems} elementos</span>
          </div>

          <div className="wc-carrito-body">
            {totalItems===0 && !tipo && (
              <div className="wc-carrito-empty"><span>🛒</span><p>Selecciona un tipo de reservación para comenzar</p></div>
            )}
            {totalItems===0 && tipo && (
              <div className="wc-carrito-empty"><span>✨</span><p>Agrega elementos en el paso 3</p></div>
            )}

            {/* Cliente */}
            {cliente.nombre && (
              <>
                <p className="wc-c-sec-label">👤 Cliente</p>
                <div className="wc-c-item">
                  <div className="wc-c-img">👤</div>
                  <div className="wc-c-info">
                    <p className="wc-c-nombre">{cliente.nombre}</p>
                    <p className="wc-c-detalle">{cliente.correo}</p>
                  </div>
                </div>
              </>
            )}

            {/* Tipo y fecha */}
            {tipo && (
              <>
                <p className="wc-c-sec-label">📋 Reservación</p>
                <div className="wc-c-item">
                  <div className="wc-c-img">{tipo==='salon'?'🏛️':tipo==='restaurante'?'🍽️':'🚚'}</div>
                  <div className="wc-c-info">
                    <p className="wc-c-nombre" style={{textTransform:'capitalize'}}>{tipo}</p>
                    <p className="wc-c-detalle">
                      {tipo==='salon'&&datosSalon.fecha&&`${datosSalon.fecha} · ${datosSalon.personas||'?'} pers.`}
                      {tipo==='restaurante'&&datosRest.fecha&&`${datosRest.fecha} · ${datosRest.personas||'?'} pers.`}
                      {tipo==='catering'&&datosCat.fecha&&`${datosCat.fecha} · ${datosCat.personas||'?'} pers.`}
                    </p>
                  </div>
                </div>
                {tipo==='salon'&&datosSalon.nombreZona&&(
                  <div className="wc-c-item">
                    <div className="wc-c-img">📍</div>
                    <div className="wc-c-info">
                      <p className="wc-c-nombre">{datosSalon.nombreZona}</p>
                      <p className="wc-c-detalle">{formatMXN(datosSalon.precioZona)}</p>
                    </div>
                    <p className="wc-c-subtotal">{formatMXN(datosSalon.precioZona)}</p>
                  </div>
                )}
              </>
            )}

            {/* Paquete */}
            {carrito.paquete && (
              <>
                <p className="wc-c-sec-label">🎁 Paquete</p>
                <div className="wc-c-item">
                  <div className="wc-c-img">{carrito.paquete.imagen?<img src={carrito.paquete.imagen} alt=""/>:'🎁'}</div>
                  <div className="wc-c-info">
                    <p className="wc-c-nombre">{carrito.paquete.nombre}</p>
                    <p className="wc-c-detalle">Paquete</p>
                  </div>
                  <p className="wc-c-subtotal">{formatMXN(carrito.paquete.precioExtra)}</p>
                  <button className="wc-c-quitar" onClick={()=>setCarrito({...carrito,paquete:null})}>✕</button>
                </div>
              </>
            )}

            {/* Menú */}
            {carrito.menu.length>0 && (
              <>
                <p className="wc-c-sec-label">🍳 Menú</p>
                {carrito.menu.map(m=>(
                  <div key={m.idMenu} className="wc-c-item">
                    <div className="wc-c-img">{m.imagen?<img src={m.imagen} alt=""/>:'🍳'}</div>
                    <div className="wc-c-info">
                      <p className="wc-c-nombre">{m.nombre}</p>
                      <p className="wc-c-detalle">{formatMXN(m.precio)} × {m.cantidad}</p>
                    </div>
                    <div className="wc-c-controles">
                      <button onClick={()=>{const nu=carrito.menu.map(x=>x.idMenu===m.idMenu?{...x,cantidad:Math.max(1,x.cantidad-1)}:x);setCarrito({...carrito,menu:nu})}}>−</button>
                      <span>{m.cantidad}</span>
                      <button onClick={()=>{const nu=carrito.menu.map(x=>x.idMenu===m.idMenu?{...x,cantidad:x.cantidad+1}:x);setCarrito({...carrito,menu:nu})}}>+</button>
                    </div>
                    <p className="wc-c-subtotal">{formatMXN(Number(m.precio)*m.cantidad)}</p>
                    <button className="wc-c-quitar" onClick={()=>setCarrito({...carrito,menu:carrito.menu.filter(x=>x.idMenu!==m.idMenu)})}>✕</button>
                  </div>
                ))}
              </>
            )}

            {/* Insumos */}
            {carrito.insumos.length>0 && (
              <>
                <p className="wc-c-sec-label">🎀 Insumos</p>
                {carrito.insumos.map(i=>(
                  <div key={i.idInsumo} className="wc-c-item">
                    <div className="wc-c-img">{i.imagen?<img src={i.imagen} alt=""/>:'🎀'}</div>
                    <div className="wc-c-info">
                      <p className="wc-c-nombre">{i.nombre}</p>
                      <p className="wc-c-detalle">{formatMXN(i.precio)} × {i.cantidad}</p>
                    </div>
                    <div className="wc-c-controles">
                      <button onClick={()=>{const nu=carrito.insumos.map(x=>x.idInsumo===i.idInsumo?{...x,cantidad:Math.max(1,x.cantidad-1)}:x);setCarrito({...carrito,insumos:nu})}}>−</button>
                      <input type="number" min="1" value={i.cantidad}
                        onChange={e=>{const v=Math.max(1,Number(e.target.value)||1);const nu=carrito.insumos.map(x=>x.idInsumo===i.idInsumo?{...x,cantidad:v}:x);setCarrito({...carrito,insumos:nu})}}
                        style={{width:36,textAlign:'center',border:'1.5px solid rgba(222,41,137,0.25)',borderRadius:5,fontWeight:700,fontSize:13,color:'var(--rose)',fontFamily:'inherit',outline:'none',background:'white',MozAppearance:'textfield'}}
                        onClick={e=>e.stopPropagation()}/>
                      <button onClick={()=>{const nu=carrito.insumos.map(x=>x.idInsumo===i.idInsumo?{...x,cantidad:x.cantidad+1}:x);setCarrito({...carrito,insumos:nu})}}>+</button>
                    </div>
                    <p className="wc-c-subtotal">{formatMXN(Number(i.precio)*i.cantidad)}</p>
                    <button className="wc-c-quitar" onClick={()=>setCarrito({...carrito,insumos:carrito.insumos.filter(x=>x.idInsumo!==i.idInsumo)})}>✕</button>
                  </div>
                ))}
              </>
            )}


          </div>

          {/* Precio */}
          <div className="wc-carrito-precio">
            <div className="wc-precio-fila">
              <span>Subtotal calculado</span>
              <span>{formatMXN(precioCalculado)}</span>
            </div>

            <div className="wc-precio-edit-wrap">
              <label>Precio final (editable por admin)</label>
              <div style={{position:'relative'}}>
                <span className="wc-precio-symbol">$</span>
                <input className="wc-precio-input" type="number" min="0" step="0.01"
                  value={precioManual}
                  onChange={e=>setPrecioManual(e.target.value)}
                  placeholder={precioCalculado.toFixed(2)}/>
              </div>
              {precioManual==='' && <p style={{fontSize:10.5,color:'var(--text-soft)',marginTop:2}}>Vacío = usa precio calculado</p>}
              {precioManual!=='' && Number(precioManual)<precioCalculado && (
                <p style={{fontSize:10.5,color:'#b05a1a',marginTop:2}}>⚠ Precio menor al calculado ({formatMXN(precioCalculado)})</p>
              )}
            </div>

            <div className="wc-precio-fila total">
              <span>Total reservación</span>
              <span>{formatMXN(precioFinal)}</span>
            </div>
          </div>{/* wc-carrito-precio */}
        </div>{/* wc-carrito */}
      </div>{/* wc-body */}

      {/* CSS del spinner */}
      <style dangerouslySetInnerHTML={{__html:'@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'}}/>
    </div>
  )
}