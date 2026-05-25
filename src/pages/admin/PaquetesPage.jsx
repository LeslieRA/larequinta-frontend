import { useState, useEffect, useMemo } from 'react'
import { getPaquetes, createPaquete, updatePaquete, deletePaquete } from '../../api/paquetes.js'
import { getMenu }              from '../../api/menu.js'
import { getInsumos }           from '../../api/insumos.js'
import { getZonas }             from '../../api/zonas.js'
import { getServicios, crearServicio } from '../../api/servicios.js'
import ImageUpload              from '../../components/ImageUpload.jsx'
import ConfirmDialog            from '../../components/ConfirmDialog.jsx'
import '../../components/Form.css'
import './PaquetesPage.css'

const TIPOS_DEFAULT = ['Salon', 'Catering', 'Restaurante']

const SECCIONES = [
  { key: 'alimentos', label: 'Alimentos', icon: '🍳' },
  { key: 'insumos',   label: 'Insumos',   icon: '🎀' },
  { key: 'zonas',     label: 'Lugar',     icon: '📍' },
  { key: 'servicios', label: 'Servicios', icon: '⭐' },
]

const FORM_EMPTY = {
  nombre: '', tipo: 'Salon', descripcion: '', imagen: '', precioManual: ''
}

export default function PaquetesPage() {
  const [paquetes,  setPaquetes]  = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [insumos,   setInsumos]   = useState([])
  const [zonas,     setZonas]     = useState([])
  const [servicios, setServicios] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const [vista,       setVista]       = useState('lista')
  const [editando,    setEditando]    = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [elimTarget,  setElimTarget]  = useState(null)
  const [saving,      setSaving]      = useState(false)

  const [form,    setForm]    = useState(FORM_EMPTY)
  const [errores, setErrores] = useState({})

  const [tiposGuardados,   setTiposGuardados]   = useState(TIPOS_DEFAULT)
  const [nuevoTipo,        setNuevoTipo]        = useState('')
  const [mostrarNuevoTipo, setMostrarNuevoTipo] = useState(false)

  const [secActivas, setSecActivas] = useState({
    alimentos: false, insumos: false, zonas: false, servicios: false
  })

  const [selMenu,         setSelMenu]        = useState([])
  const [selInsumos,      setSelInsumos]     = useState([])
  const [selZonas,        setSelZonas]       = useState([])
  const [selServicios,    setSelServicios]   = useState([])
  const [serviciosLibres, setServiciosLibres] = useState([])

  const [busqAlimentos, setBusqAlimentos] = useState('')
  const [busqInsumos,   setBusqInsumos]   = useState('')
  const [busqZonas,     setBusqZonas]     = useState('')
  const [busqServicios, setBusqServicios] = useState('')
  const [nuevoLibre,    setNuevoLibre]    = useState('')

  // ✅ FIX: sin campo icono
  const [nuevoServicio,   setNuevoServicio]   = useState({ nombre: '' })
  const [mostrarNuevoSvc, setMostrarNuevoSvc] = useState(false)

  useEffect(() => {
    Promise.all([
      getPaquetes().then(r  => setPaquetes(r.data)),
      getMenu().then(r      => setMenuItems(r.data.filter(m => m.estado === 'activo'))),
      getInsumos().then(r   => setInsumos(r.data.filter(i => !i.eliminado))),
      getZonas().then(r     => setZonas(r.data.filter(z => z.activo))),
      getServicios().then(r => setServicios(r.data)),
    ]).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const precioCalculado = useMemo(() => {
    const sm = selMenu.reduce((s, i)    => s + Number(i.precio) * i.cantidad, 0)
    const si = selInsumos.reduce((s, i) => s + Number(i.precio) * i.cantidad, 0)
    return sm + si
  }, [selMenu, selInsumos])

  const precioFinal = useMemo(() => {
    if (form.precioManual !== '') return Number(form.precioManual)
    return precioCalculado
  }, [form.precioManual, precioCalculado])

  const totalItems = selMenu.length + selInsumos.length + selZonas.length +
                     selServicios.length + serviciosLibres.length

  const iconoTipo = t =>
    t === 'Salon' ? '🏛️' : t === 'Catering' ? '🚚' : t === 'Restaurante' ? '🍽️' : '📦'

  // ── Tipos ────────────────────────────────────────────────
  function agregarTipo() {
    const t = nuevoTipo.trim()
    if (!t) return
    if (!tiposGuardados.includes(t)) setTiposGuardados(prev => [...prev, t])
    setForm(f => ({ ...f, tipo: t }))
    setNuevoTipo('')
    setMostrarNuevoTipo(false)
  }

  function quitarTipo(t) {
    setTiposGuardados(prev => prev.filter(x => x !== t))
    if (form.tipo === t) setForm(f => ({ ...f, tipo: 'Salon' }))
  }

  // ── Menú ─────────────────────────────────────────────────
  function toggleMenu(item) {
    const existe = selMenu.find(m => m.idMenu === item.idMenu)
    if (existe) setSelMenu(selMenu.filter(m => m.idMenu !== item.idMenu))
    else setSelMenu([...selMenu, {
      idMenu: item.idMenu, cantidad: 1,
      nombre: item.nombre, precio: item.precio, imagen: item.imagen
    }])
  }

  function setCantMenu(idMenu, cant) {
    if (cant <= 0) { setSelMenu(selMenu.filter(m => m.idMenu !== idMenu)); return }
    setSelMenu(selMenu.map(m => m.idMenu === idMenu ? { ...m, cantidad: cant } : m))
  }

  // ── Insumos ──────────────────────────────────────────────
  function toggleInsumo(item) {
    const existe = selInsumos.find(i => i.idInsumo === item.idInsumo)
    if (existe) setSelInsumos(selInsumos.filter(i => i.idInsumo !== item.idInsumo))
    else setSelInsumos([...selInsumos, {
      idInsumo: item.idInsumo, cantidad: 1,
      nombre: item.nombre, precio: item.precioUnitario ?? 0, imagen: item.imagen
    }])
  }

  function setCantInsumo(idInsumo, cant) {
    if (cant <= 0) { setSelInsumos(selInsumos.filter(i => i.idInsumo !== idInsumo)); return }
    setSelInsumos(selInsumos.map(i => i.idInsumo === idInsumo ? { ...i, cantidad: cant } : i))
  }

  // ── Zonas ────────────────────────────────────────────────
  function toggleZona(zona) {
    const existe = selZonas.find(z => z.idZona === zona.idZona)
    if (existe) setSelZonas(selZonas.filter(z => z.idZona !== zona.idZona))
    else setSelZonas([...selZonas, {
      idZona: zona.idZona, nombre: zona.nombre,
      precio: zona.precioRenta ?? 0, imagen: zona.imagen
    }])
  }

  // ── Servicios catálogo ───────────────────────────────────
  function toggleServicio(idServicio) {
    if (selServicios.includes(idServicio))
      setSelServicios(selServicios.filter(id => id !== idServicio))
    else
      setSelServicios([...selServicios, idServicio])
  }

  async function agregarServicioCatalogo() {
    if (!nuevoServicio.nombre.trim()) return
    try {
      // ✅ FIX: sin icono en el payload
      const res = await crearServicio({
        nombre: nuevoServicio.nombre.trim(),
      })
      setServicios(prev => [...prev, res.data])
      setSelServicios(prev => [...prev, res.data.idServicio])
      // ✅ FIX: reset sin icono
      setNuevoServicio({ nombre: '' })
      setMostrarNuevoSvc(false)
    } catch (e) { setError(e.message) }
  }

  // ── Abrir formularios ────────────────────────────────────
  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_EMPTY)
    setSecActivas({ alimentos: false, insumos: false, zonas: false, servicios: false })
    setSelMenu([]); setSelInsumos([]); setSelZonas([])
    setSelServicios([]); setServiciosLibres([]); setNuevoLibre('')
    setBusqAlimentos(''); setBusqInsumos(''); setBusqZonas(''); setBusqServicios('')
    setNuevoTipo(''); setMostrarNuevoTipo(false)
    setMostrarNuevoSvc(false)
    setErrores({})
    setVista('form')
  }

  function abrirEditar(p) {
    setEditando(p)
    setForm({
      nombre:       p.nombre,
      tipo:         p.tipo,
      descripcion:  p.descripcion ?? '',
      imagen:       p.imagen ?? '',
      precioManual: String(p.precioExtra ?? ''),
    })

    // ✅ FIX: usar p.platillos (no p.menuItems)
    const menuSel = (p.platillos ?? []).map(m => ({
      idMenu: m.idMenu, cantidad: m.cantidad ?? 1,
      nombre: m.nombrePlatillo ?? '', precio: 0, imagen: null
    }))
    // ✅ FIX: usar p.insumos y nombreInsumo (no p.insumoItems)
    const insSel = (p.insumos ?? []).map(i => ({
      idInsumo: i.idInsumo, cantidad: i.cantidad ?? 1,
      nombre: i.nombreInsumo ?? '', precio: 0, imagen: null
    }))
    const zonSel = (p.zonas ?? []).map(z => ({
      idZona: z.idZona, nombre: z.nombre, precio: z.precioRenta ?? 0, imagen: z.imagen
    }))
    const svcSel = (p.servicios ?? [])
      .filter(s => s.idServicio != null).map(s => s.idServicio)
    const svcLibres = (p.servicios ?? [])
      .filter(s => s.idServicio == null).map(s => s.descripcionLibre ?? s.nombre)

    setSelMenu(menuSel); setSelInsumos(insSel); setSelZonas(zonSel)
    setSelServicios(svcSel); setServiciosLibres(svcLibres)

    setSecActivas({
      alimentos: menuSel.length > 0,
      insumos:   insSel.length  > 0,
      zonas:     zonSel.length  > 0,
      servicios: svcSel.length  > 0 || svcLibres.length > 0,
    })

    if (p.tipo && !tiposGuardados.includes(p.tipo))
      setTiposGuardados(prev => [...prev, p.tipo])

    setErrores({})
    setVista('form')
  }

  // ── Validar y guardar ────────────────────────────────────
  function validar() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!form.tipo.trim())   e.tipo   = 'Selecciona un tipo'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!validar()) return
    try {
      setSaving(true)
      const payload = {
        nombre:          form.nombre,
        tipo:            form.tipo,
        descripcion:     form.descripcion,
        imagen:          form.imagen,
        precioExtra:     precioFinal,
        idZonas:         selZonas.map(z => z.idZona),
        platillos:       selMenu.map(m => ({ idMenu: m.idMenu, cantidad: m.cantidad })),
        insumos:         selInsumos.map(i => ({ idInsumo: i.idInsumo, cantidad: i.cantidad })),
        idServicios:     selServicios,
        serviciosLibres: serviciosLibres,
      }
      if (editando) await updatePaquete(editando.idPaquete, payload)
      else          await createPaquete(payload)
      const res = await getPaquetes()
      setPaquetes(res.data)
      setVista('lista')
    } catch (e) {
      setError(e.response?.data?.message ?? e.message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmarEliminar() {
    try {
      await deletePaquete(elimTarget.idPaquete)
      setPaquetes(paquetes.filter(p => p.idPaquete !== elimTarget.idPaquete))
      setConfirmOpen(false)
    } catch (e) { setError(e.message) }
  }

  // ── Filtros ──────────────────────────────────────────────
  const menuFiltrado      = menuItems.filter(m => m.nombre.toLowerCase().includes(busqAlimentos.toLowerCase()))
  const insumosFiltrado   = insumos.filter(i   => i.nombre.toLowerCase().includes(busqInsumos.toLowerCase()))
  const zonasFiltrado     = zonas.filter(z     => z.nombre.toLowerCase().includes(busqZonas.toLowerCase()))
  const serviciosFiltrado = servicios.filter(s => s.nombre.toLowerCase().includes(busqServicios.toLowerCase()))

  if (loading) return <div className="pq-loading">Cargando paquetes...</div>
  if (error)   return <div className="pq-error">{error}</div>

  // ════════════════════════════════════════════════════════
  //  VISTA LISTA
  // ════════════════════════════════════════════════════════
  if (vista === 'lista') return (
    <div className="pq-root">
      <div className="pq-header">
        <div>
          <h1 className="pq-titulo">Paquetes</h1>
          <p className="pq-subtitulo">{paquetes.length} paquetes registrados</p>
        </div>
        <button className="pq-btn-nuevo" onClick={abrirNuevo}>+ Nuevo paquete</button>
      </div>

      {paquetes.length === 0 ? (
        <div className="pq-empty">
          <span>🎁</span>
          <p>No hay paquetes registrados</p>
          <button className="pq-btn-nuevo" onClick={abrirNuevo}>Crear el primer paquete</button>
        </div>
      ) : (
        <div className="pq-grid">
          {paquetes.map(p => (
            <div key={p.idPaquete} className="pq-card">
              <div className="pq-card-img">
                {p.imagen ? <img src={p.imagen} alt={p.nombre} /> : <span>🎁</span>}
                <span className="pq-card-tipo">{iconoTipo(p.tipo)} {p.tipo}</span>
              </div>
              <div className="pq-card-body">
                <h3 className="pq-card-nombre">{p.nombre}</h3>
                {p.descripcion && <p className="pq-card-desc">{p.descripcion}</p>}
                <div className="pq-card-tags">
                  {/* ✅ FIX: usar p.platillos e p.insumos */}
                  {p.platillos?.length > 0 && <span>🍳 {p.platillos.length} platillos</span>}
                  {p.insumos?.length   > 0 && <span>🎀 {p.insumos.length} insumos</span>}
                  {p.zonas?.length     > 0 && <span>📍 {p.zonas.length} zona(s)</span>}
                  {p.servicios?.length > 0 && <span>⭐ {p.servicios.length} servicios</span>}
                </div>
                {/* Lista de servicios incluidos — ✅ FIX: sin icono */}
                {p.servicios?.length > 0 && (
                  <div className="pq-card-servicios">
                    {p.servicios.slice(0, 4).map((s, i) => (
                      <div key={i} className="pq-card-svc-item">
                        <span>{s.nombre}</span>
                      </div>
                    ))}
                    {p.servicios.length > 4 && (
                      <div className="pq-card-svc-item pq-card-svc-mas">
                        +{p.servicios.length - 4} más
                      </div>
                    )}
                  </div>
                )}
                <div className="pq-card-precio">
                  ${Number(p.precioExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
                <div className="pq-card-acciones">
                  <button className="pq-btn-editar"   onClick={() => abrirEditar(p)}>✏️ Editar</button>
                  <button className="pq-btn-eliminar" onClick={() => { setElimTarget(p); setConfirmOpen(true) }}>
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        message={`¿Eliminar el paquete "${elimTarget?.nombre}"?`}
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )

  // ════════════════════════════════════════════════════════
  //  VISTA FORMULARIO
  // ════════════════════════════════════════════════════════
  return (
    <div className="pq-root">
      <div className="pq-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="pq-btn-back" onClick={() => setVista('lista')}>← Regresar</button>
          <div>
            <h1 className="pq-titulo">{editando ? 'Editar paquete' : 'Nuevo paquete'}</h1>
            <p className="pq-subtitulo">
              {editando ? `Editando: ${editando.nombre}` : 'Configura los detalles del paquete'}
            </p>
          </div>
        </div>
      </div>

      <div className="pq-form-layout">

        {/* ── Panel izquierdo ── */}
        <div className="pq-form-left">

          {/* Info básica */}
          <div className="pq-form-card">
            <h3 className="pq-form-card-title">📦 Información básica</h3>

            <div className="form-field">
              <label>Nombre del paquete *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => {
                  setForm({ ...form, nombre: e.target.value })
                  setErrores(err => ({ ...err, nombre: null }))
                }}
                placeholder="Ej: Paquete Premium Bodas"
                className={errores.nombre ? 'input-error' : ''}
              />
              {errores.nombre && <p className="wizard-field-error">⚠ {errores.nombre}</p>}
            </div>

            {/* Tipos */}
            <div className="form-field">
              <label>Tipo de paquete *</label>
              <div className="pq-tipos-wrap">
                {tiposGuardados.map(t => (
                  <div key={t} className="pq-tipo-item">
                    <button
                      type="button"
                      className={`pq-tipo-btn ${form.tipo === t ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, tipo: t })}
                    >
                      {iconoTipo(t)} {t}
                    </button>
                    {!TIPOS_DEFAULT.includes(t) && (
                      <button type="button" className="pq-tipo-quitar"
                        onClick={() => quitarTipo(t)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="pq-tipo-agregar"
                  onClick={() => setMostrarNuevoTipo(v => !v)}>
                  {mostrarNuevoTipo ? '✕ Cancelar' : '+ Nuevo tipo'}
                </button>
              </div>

              {mostrarNuevoTipo && (
                <div className="pq-nuevo-tipo-wrap">
                  <input
                    autoFocus type="text" value={nuevoTipo}
                    onChange={e => setNuevoTipo(e.target.value)}
                    placeholder="Ej: Quinceañera, Corporativo..."
                    className="pq-nuevo-tipo-input"
                    onKeyDown={e => { if (e.key === 'Enter') agregarTipo() }}
                  />
                  <button type="button" className="pq-nuevo-tipo-ok" onClick={agregarTipo}>
                    ✓ Agregar
                  </button>
                </div>
              )}
              {errores.tipo && <p className="wizard-field-error">⚠ {errores.tipo}</p>}
            </div>

            <div className="form-field">
              <label>Descripción</label>
              <textarea rows={3} value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describe brevemente qué incluye este paquete..." />
            </div>

            <div className="form-field">
              <label>Imagen del paquete</label>
              <ImageUpload
                value={form.imagen}
                onChange={url => setForm({ ...form, imagen: url })}
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="pq-form-card">
            <h3 className="pq-form-card-title">✅ ¿Qué incluye el paquete?</h3>
            <p className="pq-form-card-sub">Activa las secciones para agregar elementos</p>

            <div className="pq-checks">
              {SECCIONES.map(s => (
                <label key={s.key} className={`pq-check-label ${secActivas[s.key] ? 'activa' : ''}`}>
                  <input
                    type="checkbox"
                    checked={secActivas[s.key]}
                    onChange={e => {
                      setSecActivas({ ...secActivas, [s.key]: e.target.checked })
                      if (!e.target.checked) {
                        if (s.key === 'alimentos') setSelMenu([])
                        if (s.key === 'insumos')   setSelInsumos([])
                        if (s.key === 'zonas')     setSelZonas([])
                        if (s.key === 'servicios') { setSelServicios([]); setServiciosLibres([]) }
                      }
                    }}
                  />
                  <span className="pq-check-icon">{s.icon}</span>
                  <span className="pq-check-text">{s.label}</span>
                  {s.key === 'alimentos' && selMenu.length    > 0 && <span className="pq-check-badge">{selMenu.length}</span>}
                  {s.key === 'insumos'   && selInsumos.length > 0 && <span className="pq-check-badge">{selInsumos.length}</span>}
                  {s.key === 'zonas'     && selZonas.length   > 0 && <span className="pq-check-badge">{selZonas.length}</span>}
                  {s.key === 'servicios' && (selServicios.length + serviciosLibres.length) > 0 &&
                    <span className="pq-check-badge">{selServicios.length + serviciosLibres.length}</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Alimentos */}
          {secActivas.alimentos && (
            <div className="pq-form-card pq-seccion">
              <h3 className="pq-form-card-title">🍳 Alimentos del menú</h3>
              <input className="pq-busq" placeholder="Buscar platillo..."
                value={busqAlimentos} onChange={e => setBusqAlimentos(e.target.value)} />
              <div className="pq-items-grid">
                {menuFiltrado.map(item => {
                  const sel = selMenu.find(m => m.idMenu === item.idMenu)
                  return (
                    <div key={item.idMenu}
                      className={`pq-item-card ${sel ? 'seleccionado' : ''}`}
                      onClick={() => toggleMenu(item)}>
                      <div className="pq-item-img">
                        {item.imagen ? <img src={item.imagen} alt={item.nombre} /> : <span>🍳</span>}
                        {sel && <div className="pq-item-check">✓</div>}
                      </div>
                      <div className="pq-item-info">
                        <p className="pq-item-nombre">{item.nombre}</p>
                        <p className="pq-item-precio">
                          ${Number(item.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        {item.descripcion && <p className="pq-item-desc">{item.descripcion}</p>}
                      </div>
                      {sel && (
                        <div className="pq-item-cant" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setCantMenu(item.idMenu, sel.cantidad - 1)}>−</button>
                          <span>{sel.cantidad}</span>
                          <button onClick={() => setCantMenu(item.idMenu, sel.cantidad + 1)}>+</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {menuFiltrado.length === 0 && (
                  <p className="pq-sin-resultados">Sin resultados para "{busqAlimentos}"</p>
                )}
              </div>
            </div>
          )}

          {/* Insumos */}
          {secActivas.insumos && (
            <div className="pq-form-card pq-seccion">
              <h3 className="pq-form-card-title">🎀 Insumos y decoración</h3>
              <input className="pq-busq" placeholder="Buscar insumo..."
                value={busqInsumos} onChange={e => setBusqInsumos(e.target.value)} />
              <div className="pq-items-grid">
                {insumosFiltrado.map(item => {
                  const sel = selInsumos.find(i => i.idInsumo === item.idInsumo)
                  return (
                    <div key={item.idInsumo}
                      className={`pq-item-card ${sel ? 'seleccionado' : ''}`}
                      onClick={() => toggleInsumo(item)}>
                      <div className="pq-item-img">
                        {item.imagen ? <img src={item.imagen} alt={item.nombre} /> : <span>🎀</span>}
                        {sel && <div className="pq-item-check">✓</div>}
                      </div>
                      <div className="pq-item-info">
                        <p className="pq-item-nombre">{item.nombre}</p>
                        <p className="pq-item-precio">
                          ${Number(item.precioUnitario ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        {item.descripcion && <p className="pq-item-desc">{item.descripcion}</p>}
                      </div>
                      {sel && (
                        <div className="pq-item-cant" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setCantInsumo(item.idInsumo, sel.cantidad - 1)}>−</button>
                          <span>{sel.cantidad}</span>
                          <button onClick={() => setCantInsumo(item.idInsumo, sel.cantidad + 1)}>+</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {insumosFiltrado.length === 0 && (
                  <p className="pq-sin-resultados">Sin resultados para "{busqInsumos}"</p>
                )}
              </div>
            </div>
          )}

          {/* Zonas */}
          {secActivas.zonas && (
            <div className="pq-form-card pq-seccion">
              <h3 className="pq-form-card-title">📍 Lugar / Zona</h3>
              <input className="pq-busq" placeholder="Buscar zona..."
                value={busqZonas} onChange={e => setBusqZonas(e.target.value)} />
              <div className="pq-items-grid pq-items-grid-zonas">
                {zonasFiltrado.map(zona => {
                  const sel = selZonas.find(z => z.idZona === zona.idZona)
                  return (
                    <div key={zona.idZona}
                      className={`pq-item-card ${sel ? 'seleccionado' : ''}`}
                      onClick={() => toggleZona(zona)}>
                      <div className="pq-item-img pq-zona-img">
                        {zona.imagen ? <img src={zona.imagen} alt={zona.nombre} /> : <span>🏛️</span>}
                        {sel && <div className="pq-item-check">✓</div>}
                      </div>
                      <div className="pq-item-info">
                        <p className="pq-item-nombre">{zona.nombre}</p>
                        <p className="pq-item-precio">
                          Renta: ${Number(zona.precioRenta ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="pq-item-desc">👥 Cap. {zona.capacidad} personas</p>
                      </div>
                    </div>
                  )
                })}
                {zonasFiltrado.length === 0 && (
                  <p className="pq-sin-resultados">Sin resultados para "{busqZonas}"</p>
                )}
              </div>
            </div>
          )}

          {/* Servicios */}
          {secActivas.servicios && (
            <div className="pq-form-card pq-seccion">
              <h3 className="pq-form-card-title">⭐ Servicios incluidos</h3>

              <p className="pq-form-card-sub">Selecciona del catálogo</p>
              <input className="pq-busq" placeholder="Buscar servicio..."
                value={busqServicios} onChange={e => setBusqServicios(e.target.value)} />

              <div className="pq-servicios-grid">
                {serviciosFiltrado.map(s => {
                  const sel = selServicios.includes(s.idServicio)
                  return (
                    <div key={s.idServicio}
                      className={`pq-svc-chip ${sel ? 'seleccionado' : ''}`}
                      onClick={() => toggleServicio(s.idServicio)}>
                      {/* ✅ FIX: sin icono — puede ser null */}
                      <span>{s.nombre}</span>
                      {sel && <span className="pq-svc-check">✓</span>}
                    </div>
                  )
                })}
                {serviciosFiltrado.length === 0 && (
                  <p style={{ color: '#b090a8', fontSize: 13 }}>
                    Sin resultados para "{busqServicios}"
                  </p>
                )}
              </div>

              {/* Agregar al catálogo — ✅ FIX: sin input de icono */}
              <div className="pq-svc-nuevo-catalogo">
                <button type="button" className="pq-tipo-agregar"
                  onClick={() => setMostrarNuevoSvc(v => !v)}>
                  {mostrarNuevoSvc ? '✕ Cancelar' : '+ Agregar al catálogo'}
                </button>
                {mostrarNuevoSvc && (
                  <div className="pq-nuevo-svc-wrap">
                    <input
                      autoFocus type="text"
                      value={nuevoServicio.nombre}
                      onChange={e => setNuevoServicio({ nombre: e.target.value })}
                      placeholder="Nombre del servicio..."
                      className="pq-nuevo-tipo-input"
                      onKeyDown={e => { if (e.key === 'Enter') agregarServicioCatalogo() }}
                    />
                    <button type="button" className="pq-nuevo-tipo-ok"
                      onClick={agregarServicioCatalogo}>✓</button>
                  </div>
                )}
              </div>

              {/* Servicios libres */}
              <div className="pq-svc-libres">
                <p className="pq-form-card-sub" style={{ marginTop: 14 }}>
                  O escribe elementos adicionales
                </p>

                {serviciosLibres.map((texto, i) => (
                  <div key={i} className="pq-svc-libre-item">
                    <span>📝 {texto}</span>
                    <button type="button"
                      onClick={() => setServiciosLibres(serviciosLibres.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </div>
                ))}

                <div className="pq-nuevo-libre-wrap">
                  <input
                    type="text"
                    value={nuevoLibre}
                    onChange={e => setNuevoLibre(e.target.value)}
                    placeholder="Ej: 1 hora de recepción con open bar..."
                    className="pq-busq"
                    style={{ marginBottom: 0 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && nuevoLibre.trim()) {
                        setServiciosLibres([...serviciosLibres, nuevoLibre.trim()])
                        setNuevoLibre('')
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="pq-nuevo-tipo-ok"
                    style={{ marginTop: 6, width: '100%', height: 38, borderRadius: 10 }}
                    onClick={() => {
                      if (nuevoLibre.trim()) {
                        setServiciosLibres([...serviciosLibres, nuevoLibre.trim()])
                        setNuevoLibre('')
                      }
                    }}
                  >
                    + Agregar elemento
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Carrito ── */}
        <div className="pq-carrito">
          <div className="pq-carrito-header">
            <h3>🛒 Resumen del paquete</h3>
            <span className="pq-carrito-count">{totalItems} elementos</span>
          </div>

          <div className="pq-carrito-body">
            {totalItems === 0 ? (
              <div className="pq-carrito-empty">
                <span>🎁</span>
                <p>Activa una sección y selecciona elementos</p>
              </div>
            ) : (
              <>
                {/* Alimentos */}
                {selMenu.length > 0 && (
                  <div className="pq-carrito-seccion">
                    <p className="pq-carrito-sec-label">🍳 Alimentos</p>
                    {selMenu.map(m => (
                      <div key={m.idMenu} className="pq-carrito-item">
                        {m.imagen
                          ? <img src={m.imagen} alt={m.nombre} className="pq-ci-img" />
                          : <div className="pq-ci-img pq-ci-placeholder">🍳</div>
                        }
                        <div className="pq-ci-info">
                          <p className="pq-ci-nombre">{m.nombre}</p>
                          <p className="pq-ci-precio">
                            ${Number(m.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u
                          </p>
                        </div>
                        <div className="pq-ci-controles">
                          <button onClick={() => setCantMenu(m.idMenu, m.cantidad - 1)}>−</button>
                          <span>{m.cantidad}</span>
                          <button onClick={() => setCantMenu(m.idMenu, m.cantidad + 1)}>+</button>
                        </div>
                        <p className="pq-ci-subtotal">
                          ${(Number(m.precio) * m.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        <button className="pq-ci-quitar"
                          onClick={() => setSelMenu(selMenu.filter(x => x.idMenu !== m.idMenu))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Insumos */}
                {selInsumos.length > 0 && (
                  <div className="pq-carrito-seccion">
                    <p className="pq-carrito-sec-label">🎀 Insumos</p>
                    {selInsumos.map(i => (
                      <div key={i.idInsumo} className="pq-carrito-item">
                        {i.imagen
                          ? <img src={i.imagen} alt={i.nombre} className="pq-ci-img" />
                          : <div className="pq-ci-img pq-ci-placeholder">🎀</div>
                        }
                        <div className="pq-ci-info">
                          <p className="pq-ci-nombre">{i.nombre}</p>
                          <p className="pq-ci-precio">
                            ${Number(i.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u
                          </p>
                        </div>
                        <div className="pq-ci-controles">
                          <button onClick={() => setCantInsumo(i.idInsumo, i.cantidad - 1)}>−</button>
                          <span>{i.cantidad}</span>
                          <button onClick={() => setCantInsumo(i.idInsumo, i.cantidad + 1)}>+</button>
                        </div>
                        <p className="pq-ci-subtotal">
                          ${(Number(i.precio) * i.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        <button className="pq-ci-quitar"
                          onClick={() => setSelInsumos(selInsumos.filter(x => x.idInsumo !== i.idInsumo))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Zonas */}
                {selZonas.length > 0 && (
                  <div className="pq-carrito-seccion">
                    <p className="pq-carrito-sec-label">📍 Zonas</p>
                    {selZonas.map(z => (
                      <div key={z.idZona} className="pq-carrito-item">
                        {z.imagen
                          ? <img src={z.imagen} alt={z.nombre} className="pq-ci-img" />
                          : <div className="pq-ci-img pq-ci-placeholder">🏛️</div>
                        }
                        <div className="pq-ci-info" style={{ flex: 1 }}>
                          <p className="pq-ci-nombre">{z.nombre}</p>
                          <p className="pq-ci-precio">Incluida en el paquete</p>
                        </div>
                        <button className="pq-ci-quitar"
                          onClick={() => setSelZonas(selZonas.filter(x => x.idZona !== z.idZona))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Servicios */}
                {(selServicios.length > 0 || serviciosLibres.length > 0) && (
                  <div className="pq-carrito-seccion">
                    <p className="pq-carrito-sec-label">⭐ Servicios</p>
                    {servicios
                      .filter(s => selServicios.includes(s.idServicio))
                      .map(s => (
                        <div key={s.idServicio} className="pq-carrito-item">
                          {/* ✅ FIX: emoji fijo en vez de s.icono que puede ser null */}
                          <div className="pq-ci-img pq-ci-placeholder">⭐</div>
                          <div className="pq-ci-info" style={{ flex: 1 }}>
                            <p className="pq-ci-nombre">{s.nombre}</p>
                            <p className="pq-ci-precio">Del catálogo</p>
                          </div>
                          {/* ✅ FIX: actualiza secActivas si queda vacío */}
                          <button className="pq-ci-quitar"
                            onClick={() => {
                              const nuevo = selServicios.filter(id => id !== s.idServicio)
                              setSelServicios(nuevo)
                              if (nuevo.length === 0 && serviciosLibres.length === 0)
                                setSecActivas(prev => ({ ...prev, servicios: false }))
                            }}>✕</button>
                        </div>
                      ))
                    }
                    {serviciosLibres.map((texto, i) => (
                      <div key={`libre-${i}`} className="pq-carrito-item">
                        <div className="pq-ci-img pq-ci-placeholder">📝</div>
                        <div className="pq-ci-info" style={{ flex: 1 }}>
                          <p className="pq-ci-nombre">{texto}</p>
                          <p className="pq-ci-precio">Personalizado</p>
                        </div>
                        {/* ✅ FIX: actualiza secActivas si queda vacío */}
                        <button className="pq-ci-quitar"
                          onClick={() => {
                            const nuevos = serviciosLibres.filter((_, j) => j !== i)
                            setServiciosLibres(nuevos)
                            if (nuevos.length === 0 && selServicios.length === 0)
                              setSecActivas(prev => ({ ...prev, servicios: false }))
                          }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Precio */}
          <div className="pq-carrito-precio">
            <div className="pq-precio-calculado">
              <span>Precio calculado</span>
              <span>${precioCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="form-field" style={{ margin: '4px 0' }}>
              <label>Precio final (editable)</label>
              <div className="pq-precio-input-wrap">
                <span className="pq-precio-symbol">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={form.precioManual}
                  onChange={e => setForm({ ...form, precioManual: e.target.value })}
                  placeholder={precioCalculado.toFixed(2)}
                  className="pq-precio-input"
                />
              </div>
              {form.precioManual === '' && (
                <p style={{ fontSize: 11, color: '#b090a8', marginTop: 3 }}>
                  Déjalo vacío para usar el precio calculado
                </p>
              )}
            </div>

            <div className="pq-precio-final">
              <span>Total del paquete</span>
              <strong>${precioFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
            </div>

            <button className="pq-btn-guardar" onClick={guardar} disabled={saving}>
              {saving ? 'Guardando...' : editando ? '💾 Guardar cambios' : '✓ Crear paquete'}
            </button>

            <button className="pq-btn-cancelar" onClick={() => setVista('lista')}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}