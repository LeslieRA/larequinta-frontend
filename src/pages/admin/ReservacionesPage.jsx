import { useState, useEffect, useMemo } from 'react'
import PageHeader        from '../../components/PageHeader.jsx'
import SearchBar         from '../../components/SearchBar.jsx'
import DataTable         from '../../components/DataTable.jsx'
import Modal             from '../../components/Modal.jsx'
import ConfirmDialog     from '../../components/ConfirmDialog.jsx'
import Badge             from '../../components/Badge.jsx'
import WizardCarrito     from '../../components/WizardCarrito.jsx'
import TicketReservacion from '../../components/TicketReservacion.jsx'
import '../../components/FilterBar.css'
import '../../components/Form.css'
import './ReservacionesPage.css'
import { getReservaciones, cambiarEstado, autorizarReservacion, getModificaciones } from '../../api/reservaciones.js'
import { getZonas } from '../../api/zonas.js'

const ESTADOS     = ['pendiente', 'confirmada', 'cancelada', 'cerrada']
const POR_PAGINA  = 10

export default function ReservacionesPage() {
  const [reservaciones, setReservaciones] = useState([])
  const [filtered, setFiltered]           = useState([])
  const [search, setSearch]               = useState('')
  const [filtroTipo, setFiltroTipo]       = useState('todos')
  const [filtroEstado, setFiltroEstado]   = useState('todos')
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [zonas, setZonas]                 = useState([])

  // ── Paginación ─────────────────────────────────────────
  const [pagina, setPagina] = useState(1)

  // ── Modales ────────────────────────────────────────────
  const [carritoOpen, setCarritoOpen]             = useState(false)
  const [detalleOpen, setDetalleOpen]             = useState(false)
  const [seleccionada, setSeleccionada]           = useState(null)
  const [nuevoEstado, setNuevoEstado]             = useState('')
  const [savingEstado, setSavingEstado]           = useState(false)
  const [confirmOpen, setConfirmOpen]             = useState(false)
  const [ticketOpen, setTicketOpen]               = useState(false)
  const [ticketReservacion, setTicketReservacion] = useState(null)
  const [autorizarOpen, setAutorizarOpen]         = useState(false)
  const [savingAuth, setSavingAuth]               = useState(false)
  const [formAuth, setFormAuth] = useState({
    autorizadoPor:'', notaAutorizacion:'',
    precioAutorizado:'', descuentoPorcentaje:'',
    nuevaFecha:'', nuevaHoraInicio:'',
    nuevaDuracionHoras:'', nuevaIdZona:''
  })
  const [historialOpen, setHistorialOpen]       = useState(false)
  const [historial, setHistorial]               = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  useEffect(() => {
    fetchReservaciones()
    getZonas().then(r => setZonas(r.data.filter(z => z.activo))).catch(() => {})
  }, [])

  async function fetchReservaciones() {
    try {
      setLoading(true)
      const res = await getReservaciones()
      // Ordenar por idReservacion DESC (más recientes primero)
      const ordenadas = [...res.data].sort((a, b) => b.idReservacion - a.idReservacion)
      setReservaciones(ordenadas)
      setFiltered(ordenadas)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Filtros ────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase()
    const resultado = reservaciones.filter(r => {
      const matchSearch =
        r.nombreCliente?.toLowerCase().includes(q) ||
        String(r.idReservacion).includes(q)        ||
        r.fecha?.includes(q)
      const matchTipo   = filtroTipo   === 'todos' || r.tipo   === filtroTipo
      const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado
      return matchSearch && matchTipo && matchEstado
    })
    setFiltered(resultado)
    setPagina(1) // volver a primera página al filtrar
  }, [search, filtroTipo, filtroEstado, reservaciones])

  // ── Paginación ─────────────────────────────────────────
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA))

  const paginaActual = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA
    return filtered.slice(inicio, inicio + POR_PAGINA)
  }, [filtered, pagina])

  // Páginas visibles (máx 7 botones)
  const paginasVisibles = useMemo(() => {
    const delta = 2
    const rango = []
    for (let i = Math.max(2, pagina - delta); i <= Math.min(totalPaginas - 1, pagina + delta); i++) {
      rango.push(i)
    }
    const pags = [1]
    if (rango[0] > 2) pags.push('...')
    pags.push(...rango)
    if (rango[rango.length - 1] < totalPaginas - 1) pags.push('...')
    if (totalPaginas > 1) pags.push(totalPaginas)
    return pags
  }, [pagina, totalPaginas])

  // ── Acciones ───────────────────────────────────────────
  function handleEdit(reservacion) {
    setSeleccionada(reservacion)
    setNuevoEstado(reservacion.estado)
    setDetalleOpen(true)
  }
  function handleDelete(reservacion) {
    setSeleccionada(reservacion)
    setConfirmOpen(true)
  }
  function handleTicket(reservacion) {
    setTicketReservacion(reservacion)
    setTicketOpen(true)
  }
  function handleAutorizar(reservacion) {
    setSeleccionada(reservacion)
    setFormAuth({
      autorizadoPor:'', notaAutorizacion:'',
      precioAutorizado: reservacion.precioTotal ?? '',
      descuentoPorcentaje:'',
      nuevaFecha: reservacion.fecha ?? '',
      nuevaHoraInicio: reservacion.salon?.horaInicio ?? '',
      nuevaDuracionHoras: reservacion.salon?.duracionHoras ?? '',
      nuevaIdZona: reservacion.salon?.idZona ?? ''
    })
    setAutorizarOpen(true)
  }
  async function handleVerHistorial(reservacion) {
    setSeleccionada(reservacion)
    setHistorialOpen(true)
    setLoadingHistorial(true)
    try {
      const res = await getModificaciones(reservacion.idReservacion)
      setHistorial(res.data)
    } catch { setHistorial([]) }
    finally { setLoadingHistorial(false) }
  }
  async function confirmarAutorizacion() {
    try {
      setSavingAuth(true)
      const payload = {}
      if (formAuth.autorizadoPor)       payload.autorizadoPor       = formAuth.autorizadoPor
      if (formAuth.notaAutorizacion)    payload.notaAutorizacion    = formAuth.notaAutorizacion
      if (formAuth.precioAutorizado)    payload.precioAutorizado    = Number(formAuth.precioAutorizado)
      if (formAuth.descuentoPorcentaje) payload.descuentoPorcentaje = Number(formAuth.descuentoPorcentaje)
      if (formAuth.nuevaFecha)          payload.nuevaFecha          = formAuth.nuevaFecha
      if (formAuth.nuevaHoraInicio)     payload.nuevaHoraInicio     = formAuth.nuevaHoraInicio + ':00'
      if (formAuth.nuevaDuracionHoras)  payload.nuevaDuracionHoras  = Number(formAuth.nuevaDuracionHoras)
      if (formAuth.nuevaIdZona)         payload.nuevaIdZona         = Number(formAuth.nuevaIdZona)
      await autorizarReservacion(seleccionada.idReservacion, payload)
      setAutorizarOpen(false)
      fetchReservaciones()
    } catch (e) { setError(e.message) }
    finally { setSavingAuth(false) }
  }
  async function confirmarCancelar() {
    try {
      await cambiarEstado(seleccionada.idReservacion, 'cancelada')
      setConfirmOpen(false); setSeleccionada(null)
      fetchReservaciones()
    } catch (e) { setError(e.message) }
  }
  async function handleCambiarEstado() {
    try {
      setSavingEstado(true)
      await cambiarEstado(seleccionada.idReservacion, nuevoEstado)
      setDetalleOpen(false)
      fetchReservaciones()
    } catch (e) { setError(e.message) }
    finally { setSavingEstado(false) }
  }

  // ── Columnas ───────────────────────────────────────────
  const COLUMNS = [
    { key: 'idReservacion', label: 'ID' },
    {
      key: 'tipo', label: 'Tipo',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge value={v} />
          {row.tieneModificaciones && (
            <span title="Tiene modificaciones de precio" style={{
              background: 'var(--teal-lt)', color: '#2a8a92',
              fontSize: 10, fontWeight: 700, padding: '2px 6px',
              borderRadius: 20, border: '1px solid var(--teal)', whiteSpace: 'nowrap'
            }}>🔑 MOD</span>
          )}
        </div>
      )
    },
    { key: 'nombreCliente', label: 'Cliente'  },
    { key: 'fecha',         label: 'Fecha'    },
    { key: 'noPersonas',    label: 'Personas' },
    { key: 'estado',        label: 'Estado',  render: v => <Badge value={v} /> },
    {
      key: 'precioTotal', label: 'Total',
      render: v => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    },
    {
      key: 'acciones', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); handleTicket(row) }}
            title="Ver ticket"
            style={{ background: 'var(--gold-lt)', color: 'var(--gold-dk)', border: '1px solid rgba(247,167,25,0.3)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🎫</button>
          <button onClick={e => { e.stopPropagation(); handleAutorizar(row) }}
            title="Autorización especial"
            style={{ background: 'var(--teal-lt)', color: '#2a8a92', border: '1px solid rgba(84,188,196,0.3)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔑</button>
          <button onClick={e => { e.stopPropagation(); handleVerHistorial(row) }}
            title="Ver historial"
            style={{ background: row.tieneModificaciones ? 'var(--teal-lt)' : '#f5f5f5', color: row.tieneModificaciones ? '#2a8a92' : '#bbb', border: `1px solid ${row.tieneModificaciones ? 'var(--teal)' : '#e0e0e0'}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📋</button>
        </div>
      )
    },
  ]

  if (error) return <div style={{ color: 'var(--danger)', padding: 24 }}>{error}</div>

  return (
    <div>
      <PageHeader
        title="Reservaciones"
        subtitle="Gestión de reservaciones de salón, catering y restaurante"
        onNew={() => setCarritoOpen(true)}
        btnLabel="+ Nueva reservación"
      />

      {/* ── Filtros ── */}
      <div className="filter-bar">
        <SearchBar value={search} onChange={v => { setSearch(v); setPagina(1) }}
          placeholder="Buscar por cliente, ID o fecha..." />
        <select className="filter-select" value={filtroTipo}
          onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}>
          <option value="todos">Todos los tipos</option>
          <option value="salon">Salón</option>
          <option value="catering">Catering</option>
          <option value="restaurante">Restaurante</option>
        </select>
        <select className="filter-select" value={filtroEstado}
          onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}>
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="cancelada">Cancelada</option>
          <option value="cerrada">Cerrada</option>
        </select>
      </div>

      {/* Info de resultados */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', fontSize:12.5, color:'var(--text-soft)' }}>
        <span>
          {filtered.length === 0
            ? 'Sin resultados'
            : `Mostrando ${(pagina-1)*POR_PAGINA+1}–${Math.min(pagina*POR_PAGINA,filtered.length)} de ${filtered.length} reservaciones`
          }
        </span>
        {filtered.length > 0 && (
          <span>Página {pagina} de {totalPaginas}</span>
        )}
      </div>

      {/* ── Tabla ── */}
      <DataTable
        columns={COLUMNS}
        data={paginaActual}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* ── Paginación ── */}
      {totalPaginas > 1 && (
        <div className="wc-pagination">
          {/* Anterior */}
          <button
            className="wc-page-btn"
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            ‹
          </button>

          {/* Números */}
          {paginasVisibles.map((p, i) =>
            p === '...'
              ? <span key={`sep-${i}`} className="wc-page-sep">…</span>
              : (
                <button
                  key={p}
                  className={`wc-page-btn ${pagina === p ? 'activa' : ''}`}
                  onClick={() => setPagina(p)}
                >
                  {p}
                </button>
              )
          )}

          {/* Siguiente */}
          <button
            className="wc-page-btn"
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
          >
            ›
          </button>

          <span className="wc-page-info">
            {filtered.length} registros
          </span>
        </div>
      )}

      {/* ══ MODAL CARRITO NUEVA RESERVACIÓN ══════════════════ */}
      <Modal
        open={carritoOpen}
        title="Nueva reservación"
        onClose={() => setCarritoOpen(false)}
        wide
      >
        <WizardCarrito
          onFinish={() => { setCarritoOpen(false); fetchReservaciones() }}
          onCancel={() => setCarritoOpen(false)}
        />
      </Modal>

      {/* ── Modal Detalle ── */}
      <Modal
        open={detalleOpen}
        title={`Reservación #${seleccionada?.idReservacion}`}
        onClose={() => setDetalleOpen(false)}
      >
        {seleccionada && (
          <div className="form-grid">
            <div className="detalle-section form-field-full">
              <h3>Información general</h3>
              <div className="resumen-rows">
                <div className="resumen-row-d"><span>Tipo</span><Badge value={seleccionada.tipo} /></div>
                <div className="resumen-row-d"><span>Fecha</span><strong>{seleccionada.fecha}</strong></div>
                <div className="resumen-row-d"><span>Personas</span><strong>{seleccionada.noPersonas}</strong></div>
                <div className="resumen-row-d">
                  <span>Total</span>
                  <strong>${Number(seleccionada.precioTotal).toLocaleString('es-MX',{minimumFractionDigits:2})}</strong>
                </div>
                {seleccionada.tieneModificaciones && (
                  <div className="resumen-row-d">
                    <span>Modificaciones</span>
                    <span style={{background:'var(--teal-lt)',color:'#2a8a92',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,border:'1px solid var(--teal)'}}>🔑 Precio modificado</span>
                  </div>
                )}
              </div>
            </div>

            {seleccionada.salon && (
              <div className="detalle-section form-field-full">
                <h3>Datos del salón</h3>
                <div className="resumen-rows">
                  <div className="resumen-row-d"><span>Zona</span><strong>{seleccionada.salon.nombreZona}</strong></div>
                  <div className="resumen-row-d"><span>Horario</span><strong>{seleccionada.salon.horaInicio} — {seleccionada.salon.horaFin}</strong></div>
                  <div className="resumen-row-d"><span>Duración</span><strong>{seleccionada.salon.duracionHoras}h</strong></div>
                </div>
              </div>
            )}
            {seleccionada.catering && (
              <div className="detalle-section form-field-full">
                <h3>Datos del catering</h3>
                <div className="resumen-rows">
                  <div className="resumen-row-d"><span>Lugar</span><strong>{seleccionada.catering.lugar}</strong></div>
                  <div className="resumen-row-d"><span>Horario</span><strong>{seleccionada.catering.horaInicio} — {seleccionada.catering.horaFin}</strong></div>
                </div>
              </div>
            )}
            {seleccionada.restaurante && (
              <div className="detalle-section form-field-full">
                <h3>Datos del restaurante</h3>
                <div className="resumen-rows">
                  <div className="resumen-row-d"><span>Hora llegada</span><strong>{seleccionada.restaurante.horaLlegada}</strong></div>
                </div>
              </div>
            )}

            <div className="detalle-section form-field-full">
              <h3>Cliente</h3>
              <div className="resumen-rows">
                <div className="resumen-row-d"><span>Nombre</span><strong>{seleccionada.nombreCliente}</strong></div>
              </div>
            </div>

            {seleccionada.platillos?.length > 0 && (
              <div className="detalle-section form-field-full">
                <h3>Platillos</h3>
                <div className="resumen-rows">
                  {seleccionada.platillos.map(p => (
                    <div key={p.idMenu} className="resumen-row-d">
                      <span>{p.nombrePlatillo} x{p.cantidad}</span>
                      <strong>${Number(p.subtotal).toLocaleString('es-MX',{minimumFractionDigits:2})}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {seleccionada.insumos?.length > 0 && (
              <div className="detalle-section form-field-full">
                <h3>Insumos y decoración</h3>
                <div className="resumen-rows">
                  {seleccionada.insumos.map((ins, i) => (
                    <div key={i} className="resumen-row-d">
                      <span>{ins.nombre} x{ins.cantidad}</span>
                      <strong>${Number(ins.subtotal).toLocaleString('es-MX',{minimumFractionDigits:2})}</strong>
                    </div>
                  ))}
                  <div className="resumen-row-d" style={{borderTop:'1px dashed var(--cream-dk)',marginTop:4,paddingTop:4}}>
                    <span style={{fontWeight:700}}>Subtotal insumos</span>
                    <strong style={{color:'var(--rose)'}}>
                      ${seleccionada.insumos.reduce((s,i)=>s+Number(i.subtotal??0),0)
                          .toLocaleString('es-MX',{minimumFractionDigits:2})}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {seleccionada.pago && (
              <div className="detalle-section form-field-full">
                <h3>Pago</h3>
                <div className="resumen-rows">
                  <div className="resumen-row-d">
                    <span>Código</span>
                    <strong style={{color:'var(--rose)',letterSpacing:1}}>{seleccionada.pago.codigoPago}</strong>
                  </div>
                  <div className="resumen-row-d"><span>Estado pago</span><Badge value={seleccionada.pago.estado}/></div>
                  <div className="resumen-row-d">
                    <span>Fecha límite</span>
                    <strong>{seleccionada.pago.fechaLimite ? new Date(seleccionada.pago.fechaLimite).toLocaleDateString('es-MX') : '—'}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="form-field form-field-full">
              <label>Cambiar estado de reservación</label>
              <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setDetalleOpen(false)}>Cerrar</button>
              <button
                style={{background:'var(--gold-lt)',color:'var(--gold-dk)',border:'1px solid rgba(247,167,25,0.3)',borderRadius:'var(--radius)',padding:'10px 22px',fontSize:13.5,fontWeight:600,cursor:'pointer'}}
                onClick={() => { setDetalleOpen(false); handleTicket(seleccionada) }}
              >🎫 Ver ticket</button>
              <button className="btn-primary" onClick={handleCambiarEstado}
                disabled={savingEstado || nuevoEstado===seleccionada.estado}>
                {savingEstado ? 'Guardando...' : 'Actualizar estado'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Autorización ── */}
      <Modal
        open={autorizarOpen}
        title={`🔑 Autorización especial — Reservación #${seleccionada?.idReservacion}`}
        onClose={() => setAutorizarOpen(false)}
      >
        {seleccionada && (
          <div className="form-grid">
            <div className="form-field-full" style={{background:'var(--gold-lt)',padding:'10px 14px',borderRadius:'var(--radius)',border:'1px solid var(--gold)',fontSize:13,color:'var(--gold-dk)'}}>
              ⚠️ Esta acción modifica la reservación de forma excepcional. Todos los cambios quedan registrados con tu nombre.
            </div>
            <div className="form-field form-field-full">
              <label>Autorizado por *</label>
              <input type="text" value={formAuth.autorizadoPor}
                onChange={e=>setFormAuth({...formAuth,autorizadoPor:e.target.value})}
                placeholder="Nombre del administrador"/>
            </div>
            <div className="form-field form-field-full">
              <label>Nota de autorización *</label>
              <textarea value={formAuth.notaAutorizacion}
                onChange={e=>setFormAuth({...formAuth,notaAutorizacion:e.target.value})}
                placeholder="Motivo de la modificación..." rows={3}/>
            </div>
            <div className="form-field">
              <label>Precio total autorizado</label>
              <input type="number" min="0" step="0.01" value={formAuth.precioAutorizado}
                onChange={e=>setFormAuth({...formAuth,precioAutorizado:e.target.value})}
                placeholder="Dejar vacío para no modificar"/>
            </div>
            <div className="form-field">
              <label>Descuento (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={formAuth.descuentoPorcentaje}
                onChange={e=>setFormAuth({...formAuth,descuentoPorcentaje:e.target.value})}
                placeholder="Ej: 10"/>
            </div>
            <div className="form-field">
              <label>Nueva fecha</label>
              <input type="date" value={formAuth.nuevaFecha}
                onChange={e=>setFormAuth({...formAuth,nuevaFecha:e.target.value})}/>
            </div>
            {seleccionada.tipo==='salon' && (
              <>
                <div className="form-field">
                  <label>Nueva hora de inicio</label>
                  <input type="time" value={formAuth.nuevaHoraInicio}
                    onChange={e=>setFormAuth({...formAuth,nuevaHoraInicio:e.target.value})}/>
                </div>
                <div className="form-field">
                  <label>Nueva duración (horas)</label>
                  <input type="number" min="1" max="24" value={formAuth.nuevaDuracionHoras}
                    onChange={e=>setFormAuth({...formAuth,nuevaDuracionHoras:e.target.value})}/>
                </div>
                <div className="form-field form-field-full">
                  <label>Nueva zona</label>
                  <select value={formAuth.nuevaIdZona}
                    onChange={e=>setFormAuth({...formAuth,nuevaIdZona:e.target.value})}>
                    <option value="">Sin cambio de zona</option>
                    {zonas.filter(z=>z.tipo==='evento').map(z=>(
                      <option key={z.idZona} value={z.idZona}>{z.nombre} — cap. {z.capacidad}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="form-actions">
              <button className="btn-cancel" onClick={()=>setAutorizarOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={confirmarAutorizacion}
                disabled={savingAuth||!formAuth.autorizadoPor||!formAuth.notaAutorizacion}
                style={{background:'linear-gradient(135deg,var(--teal),#2a8a92)'}}>
                {savingAuth?'Aplicando...':'🔑 Aplicar autorización'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Historial ── */}
      <Modal
        open={historialOpen}
        title={`📋 Historial — Reservación #${seleccionada?.idReservacion}`}
        onClose={() => setHistorialOpen(false)}
      >
        {loadingHistorial ? (
          <p style={{textAlign:'center',color:'var(--text-soft)',padding:24}}>Cargando historial...</p>
        ) : historial.length===0 ? (
          <p style={{textAlign:'center',color:'var(--text-soft)',padding:24}}>Sin modificaciones registradas.</p>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{background:'linear-gradient(135deg,var(--rose-lt),var(--rose-ultra))',border:'1.5px solid var(--rose)',borderRadius:'var(--radius-lg)',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <p style={{fontSize:11,color:'var(--rose-dk)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Precio actual</p>
                <p style={{fontSize:24,fontWeight:700,color:'var(--rose-dk)'}}>
                  ${Number(seleccionada?.precioTotal).toLocaleString('es-MX',{minimumFractionDigits:2})}
                </p>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{fontSize:11,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Modificaciones</p>
                <p style={{fontSize:24,fontWeight:700,color:'var(--rose-dk)'}}>{historial.length}</p>
              </div>
            </div>
            {historial.map((m,index)=>(
              <div key={m.idReservaModificada} style={{background:'var(--white)',borderRadius:'var(--radius-lg)',border:'1px solid var(--cream-dk)',overflow:'hidden',boxShadow:'var(--shadow-sm)'}}>
                <div style={{background:'var(--text)',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>Modificación #{historial.length-index}</span>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.6)'}}>
                    📅 {new Date(m.fechaModificacion).toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </span>
                </div>
                <div style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,flexWrap:'wrap'}}>
                    <div style={{flex:1,background:'var(--cream)',borderRadius:'var(--radius)',padding:'10px 14px',border:'1px solid var(--cream-dk)'}}>
                      <p style={{fontSize:10,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>Precio anterior</p>
                      <p style={{fontSize:18,fontWeight:700,color:'var(--gray-mid)',textDecoration:'line-through'}}>
                        ${Number(m.precioAnterior).toLocaleString('es-MX',{minimumFractionDigits:2})}
                      </p>
                    </div>
                    <span style={{fontSize:20,color:'var(--text-soft)'}}>→</span>
                    <div style={{flex:1,background:'var(--rose-ultra)',borderRadius:'var(--radius)',padding:'10px 14px',border:'1px solid var(--rose-lt)'}}>
                      <p style={{fontSize:10,color:'var(--rose-dk)',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>Precio nuevo</p>
                      <p style={{fontSize:18,fontWeight:700,color:'var(--rose)'}}>
                        ${Number(seleccionada?.precioTotal).toLocaleString('es-MX',{minimumFractionDigits:2})}
                      </p>
                    </div>
                    {m.descuentoAplicado&&(
                      <div style={{background:'var(--green-lt)',borderRadius:'var(--radius)',padding:'10px 14px',border:'1px solid var(--green)',textAlign:'center'}}>
                        <p style={{fontSize:10,color:'var(--green)',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>Descuento</p>
                        <p style={{fontSize:18,fontWeight:700,color:'var(--green)'}}>{m.descuentoAplicado}%</p>
                      </div>
                    )}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'start',borderTop:'1px solid var(--cream-dk)',paddingTop:12}}>
                    <div>
                      <p style={{fontSize:10,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Motivo</p>
                      <p style={{fontSize:13.5,color:'var(--text)',fontStyle:'italic',lineHeight:1.5,background:'var(--cream)',padding:'8px 12px',borderRadius:'var(--radius)',border:'1px solid var(--cream-dk)'}}>"{m.motivo}"</p>
                    </div>
                    <div style={{background:'var(--teal-lt)',borderRadius:'var(--radius)',padding:'10px 14px',border:'1px solid var(--teal)',textAlign:'center',minWidth:120}}>
                      <p style={{fontSize:10,color:'#2a8a92',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Autorizado por</p>
                      <p style={{fontSize:13,fontWeight:700,color:'#1a6a70'}}>🔑 {m.autorizadoPor}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Confirmar cancelar ── */}
      <ConfirmDialog
        open={confirmOpen}
        message={`¿Cancelar la reservación #${seleccionada?.idReservacion} de ${seleccionada?.nombreCliente}?`}
        onConfirm={confirmarCancelar}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* ── Ticket ── */}
      {ticketOpen && (
        <TicketReservacion
          reservacion={ticketReservacion}
          onClose={() => setTicketOpen(false)}
        />
      )}
    </div>
  )
}