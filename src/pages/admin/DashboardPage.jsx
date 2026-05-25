import { useState, useEffect } from 'react'
import { getReservacionesCalendario } from '../../api/reservaciones.js'
import './DashboardPage.css'

const TIPO_COLOR = {
  salon:       { bg: '#fce8f3', border: '#de2989', text: '#a82060', dot: '#de2989' },
  catering:    { bg: '#e3f2fd', border: '#196792', text: '#0d4f73', dot: '#196792' },
  restaurante: { bg: '#e8f5e9', border: '#2a9437', text: '#1b5e20', dot: '#2a9437' },
}

const ESTADO_COLOR = {
  pendiente:  '#f9b71b',
  confirmada: '#2a9437',
  cancelada:  '#999',
  cerrada:    '#196792',
}

const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const HORAS = Array.from({ length: 16 }, (_, i) => i + 7)

// ── Modal de detalle completo ─────────────────────────────
function ModalDetalle({ r, onClose }) {
  if (!r) return null
  const cfg    = TIPO_COLOR[r.tipo] ?? TIPO_COLOR.restaurante
  const fmtMXN = n => `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal db-modal-wide" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="db-modal-header" style={{ borderColor: cfg.border }}>
          <div>
            <div className="db-modal-tipo-badge"
              style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
              {r.tipo === 'salon' ? '🏛️' : r.tipo === 'catering' ? '🚚' : '🍽️'} {r.tipo}
            </div>
            <h3 className="db-modal-nombre">{r.nombreCliente}</h3>
            <p className="db-modal-folio">Reservación #{r.idReservacion}</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
            <div className="db-modal-precio-total">
              <span style={{ fontSize:10, color:'#b090a8', textTransform:'uppercase', letterSpacing:1 }}>Total</span>
              <strong style={{ fontSize:24, fontWeight:800, color:'#de2989', fontFamily:"'Cormorant Garamond',Georgia,serif" }}>
                {fmtMXN(r.precioTotal)}
              </strong>
            </div>
            <span style={{
              padding:'3px 12px', borderRadius:20, fontSize:11.5, fontWeight:700,
              background: ESTADO_COLOR[r.estado] + '20',
              color: ESTADO_COLOR[r.estado],
              border: `1px solid ${ESTADO_COLOR[r.estado]}50`,
              textTransform:'capitalize'
            }}>{r.estado}</span>
          </div>
          <button className="db-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="db-modal-body">

          {/* Info general */}
          <div className="db-modal-section">
            <h4>📋 Información general</h4>
            <div className="db-modal-grid">
              <div className="db-modal-field">
                <span>Fecha</span>
                <strong>{new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-MX', {
                  weekday:'long', year:'numeric', month:'long', day:'numeric'
                })}</strong>
              </div>
              <div className="db-modal-field">
                <span>Personas</span>
                <strong>👥 {r.noPersonas}</strong>
              </div>
              {r.horaInicio && (
                <div className="db-modal-field">
                  <span>Horario</span>
                  <strong>🕐 {r.horaInicio}{r.horaFin ? ` — ${r.horaFin}` : ''}</strong>
                </div>
              )}
              {r.duracionHoras && (
                <div className="db-modal-field">
                  <span>Duración</span>
                  <strong>⏱ {r.duracionHoras} horas</strong>
                </div>
              )}
              {r.zona && (
                <div className="db-modal-field">
                  <span>Zona</span>
                  <strong>📍 {r.zona}</strong>
                </div>
              )}
              {r.lugar && (
                <div className="db-modal-field">
                  <span>Lugar</span>
                  <strong>📍 {r.lugar}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Paquete */}
          {r.paquete && (
            <div className="db-modal-section">
              <h4>🎁 Paquete incluido</h4>
              <div className="db-paquete-row">
                {r.paquete.imagen && (
                  <img src={r.paquete.imagen} alt={r.paquete.nombre}
                    style={{ width:56, height:56, borderRadius:10, objectFit:'cover', flexShrink:0 }}/>
                )}
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:14, color:'#1a0812', marginBottom:3 }}>{r.paquete.nombre}</p>
                  {r.paquete.descripcion && (
                    <p style={{ fontSize:12, color:'#7a4a66', marginBottom:4 }}>{r.paquete.descripcion}</p>
                  )}
                  <p style={{ fontSize:14, fontWeight:700, color:'#de2989' }}>{fmtMXN(r.paquete.precioExtra)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Platillos */}
          {r.platillos?.length > 0 && (
            <div className="db-modal-section">
              <h4>🍳 Platillos
                <span className="db-sec-badge">{r.platillos.length}</span>
              </h4>
              <div className="db-modal-platillos">
                {r.platillos.map((p, i) => (
                  <div key={i} className="db-modal-platillo">
                    <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                      {p.imagen && <img src={p.imagen} alt=""
                        style={{ width:32, height:32, borderRadius:7, objectFit:'cover', flexShrink:0 }}/>}
                      <span style={{ fontSize:13, color:'#1a0812', fontWeight:600 }}>
                        {p.nombrePlatillo ?? p.nombre}
                      </span>
                    </div>
                    <div className="db-modal-platillo-right">
                      <span className="db-modal-cantidad">×{p.cantidad}</span>
                      {p.precioUnitario != null && (
                        <span style={{ fontSize:11.5, color:'#9a7090' }}>
                          {fmtMXN(p.precioUnitario)} c/u
                        </span>
                      )}
                      <span className="db-modal-subtotal">{fmtMXN(p.subtotal)}</span>
                    </div>
                  </div>
                ))}
                <div style={{
                  display:'flex', justifyContent:'space-between', padding:'8px 12px',
                  background:'#fce8f3', borderRadius:8, marginTop:4,
                  fontSize:13, fontWeight:700, color:'#a82060'
                }}>
                  <span>Subtotal platillos</span>
                  <span>{fmtMXN(r.platillos.reduce((s, p) => s + Number(p.subtotal ?? 0), 0))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Insumos */}
          {r.insumos?.length > 0 && (
            <div className="db-modal-section">
              <h4>🎀 Insumos y decoración
                <span className="db-sec-badge">{r.insumos.length}</span>
              </h4>
              <div className="db-modal-platillos">
                {r.insumos.map((ins, i) => (
                  <div key={i} className="db-modal-platillo">
                    <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                      {ins.imagen && <img src={ins.imagen} alt=""
                        style={{ width:32, height:32, borderRadius:7, objectFit:'cover', flexShrink:0 }}/>}
                      <span style={{ fontSize:13, color:'#1a0812', fontWeight:600 }}>{ins.nombre}</span>
                    </div>
                    <div className="db-modal-platillo-right">
                      <span className="db-modal-cantidad">×{ins.cantidad}</span>
                      {ins.precioUnitario != null && (
                        <span style={{ fontSize:11.5, color:'#9a7090' }}>
                          {fmtMXN(ins.precioUnitario)} c/u
                        </span>
                      )}
                      <span className="db-modal-subtotal">{fmtMXN(ins.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Servicios */}
          {(r.servicios?.length > 0 || r.serviciosLibres?.length > 0) && (
            <div className="db-modal-section">
              <h4>⭐ Servicios adicionales
                <span className="db-sec-badge">
                  {(r.servicios?.length ?? 0) + (r.serviciosLibres?.length ?? 0)}
                </span>
              </h4>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {r.servicios?.map((s, i) => (
                  <div key={i} className="db-svc-item">
                    <span>{s.icono ?? '⭐'}</span>
                    <span>{s.nombre}</span>
                  </div>
                ))}
                {r.serviciosLibres?.map((t, i) => (
                  <div key={`libre-${i}`} className="db-svc-item" style={{ background:'#f5f0ff', borderColor:'#c9b8e8' }}>
                    <span>📝</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen de precios */}
          <div className="db-modal-section">
            <h4>💰 Resumen de precios</h4>
            <div className="db-precios-resumen">
              {Number(r.subtotalZona) > 0 && (
                <div className="db-precio-fila"><span>📍 Renta de zona</span><span>{fmtMXN(r.subtotalZona)}</span></div>
              )}
              {Number(r.subtotalBase) > 0 && (
                <div className="db-precio-fila"><span>👥 Base por persona ({r.noPersonas} pers.)</span><span>{fmtMXN(r.subtotalBase)}</span></div>
              )}
              {Number(r.subtotalPaquete) > 0 && (
                <div className="db-precio-fila"><span>🎁 Paquete</span><span>{fmtMXN(r.subtotalPaquete)}</span></div>
              )}
              {Number(r.subtotalMenu) > 0 && (
                <div className="db-precio-fila"><span>🍳 Menú</span><span>{fmtMXN(r.subtotalMenu)}</span></div>
              )}
              <div className="db-precio-fila db-precio-fila-total">
                <span>Total reservación</span>
                <strong>{fmtMXN(r.precioTotal)}</strong>
              </div>
            </div>
          </div>

          {/* Pago */}
          {r.pago && (
            <div className="db-modal-section">
              <h4>💳 Pago</h4>
              <div className="db-modal-grid">
                <div className="db-modal-field">
                  <span>Código</span>
                  <strong style={{ color:'#de2989', letterSpacing:1, fontFamily:'monospace' }}>
                    {r.pago.codigoPago}
                  </strong>
                </div>
                <div className="db-modal-field">
                  <span>Estado</span>
                  <strong style={{ color: r.pago.estado === 'pagado' ? '#2a9437' : '#f9b71b' }}>
                    {r.pago.estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}
                  </strong>
                </div>
                <div className="db-modal-field">
                  <span>Monto</span>
                  <strong>{fmtMXN(r.pago.monto ?? r.precioTotal)}</strong>
                </div>
                <div className="db-modal-field">
                  <span>Fecha límite</span>
                  <strong>{r.pago.fechaLimite
                    ? new Date(r.pago.fechaLimite).toLocaleDateString('es-MX') : '—'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Lista de preparación */}
          <div className="db-modal-section db-modal-checklist">
            <h4 style={{ color:'#2a9437' }}>✅ Lista de preparación</h4>
            <div className="db-modal-checks">
              {r.tipo === 'salon' && r.zona && (
                <div className="db-check-item">
                  <span className="db-check-icon">🏛️</span>
                  <span>Preparar zona <strong>{r.zona}</strong> para <strong>{r.noPersonas} personas</strong></span>
                </div>
              )}
              {(r.tipo === 'salon' || r.tipo === 'catering') && r.horaInicio && (
                <div className="db-check-item">
                  <span className="db-check-icon">⏰</span>
                  <span>
                    {r.tipo === 'salon' ? 'Zona lista' : 'Servicio'} de <strong>{r.horaInicio}</strong>
                    {r.horaFin ? <> a <strong>{r.horaFin}</strong></> : ''}
                    {r.duracionHoras ? ` (${r.duracionHoras}h)` : ''}
                  </span>
                </div>
              )}
              {r.tipo === 'catering' && r.lugar && (
                <div className="db-check-item">
                  <span className="db-check-icon">🚚</span>
                  <span>Traslado a <strong>{r.lugar}</strong></span>
                </div>
              )}
              {r.tipo === 'restaurante' && r.horaInicio && (
                <div className="db-check-item">
                  <span className="db-check-icon">🍽️</span>
                  <span>Mesa lista para las <strong>{r.horaInicio}</strong></span>
                </div>
              )}
              {r.platillos?.length > 0 && (
                <div className="db-check-item">
                  <span className="db-check-icon">🍳</span>
                  <span>
                    Preparar <strong>
                      {r.platillos.reduce((s, p) => s + (p.cantidad ?? 1), 0)} porciones
                    </strong> · {r.platillos.length} platillos diferentes
                  </span>
                </div>
              )}
              {r.insumos?.length > 0 && (
                <div className="db-check-item">
                  <span className="db-check-icon">🎀</span>
                  <span>Preparar <strong>{r.insumos.length} insumos</strong> de decoración</span>
                </div>
              )}
              {r.paquete && (
                <div className="db-check-item">
                  <span className="db-check-icon">🎁</span>
                  <span>Activar paquete <strong>{r.paquete.nombre}</strong></span>
                </div>
              )}
              {(r.servicios?.length > 0 || r.serviciosLibres?.length > 0) && (
                <div className="db-check-item">
                  <span className="db-check-icon">⭐</span>
                  <span>
                    Coordinar <strong>
                      {(r.servicios?.length ?? 0) + (r.serviciosLibres?.length ?? 0)} servicios
                    </strong> adicionales
                  </span>
                </div>
              )}
              {r.pago?.estado === 'pendiente' && (
                <div className="db-check-item db-check-warn">
                  <span className="db-check-icon">⚠️</span>
                  <span>
                    Pago pendiente — código: <strong>{r.pago.codigoPago}</strong>
                    {r.pago.fechaLimite && <> · Vence: <strong>{new Date(r.pago.fechaLimite).toLocaleDateString('es-MX')}</strong></>}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ══ COMPONENTE PRINCIPAL ══════════════════════════════════
export default function DashboardPage() {
  const [reservaciones, setReservaciones] = useState([])
  const [loading, setLoading]             = useState(true)
  const [vista, setVista]                 = useState('mes')
  const [hoy]                             = useState(new Date())
  const [fechaBase, setFechaBase]         = useState(new Date())
  const [seleccionada, setSeleccionada]   = useState(null)

  useEffect(() => {
    getReservacionesCalendario()
      .then(r => setReservaciones(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function mismaFecha(fechaStr, date) {
    const f = new Date(fechaStr + 'T00:00:00')
    return f.getFullYear() === date.getFullYear() &&
           f.getMonth()    === date.getMonth()    &&
           f.getDate()     === date.getDate()
  }
  function reservasDia(date) {
    return reservaciones.filter(r => mismaFecha(r.fecha, date))
  }
  function getDiasMes() {
    const año = fechaBase.getFullYear(), mes = fechaBase.getMonth()
    const primero = new Date(año, mes, 1), ultimo = new Date(año, mes + 1, 0)
    const dias = []
    for (let i = 0; i < primero.getDay(); i++) dias.push(null)
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(año, mes, d))
    return dias
  }
  function navMes(dir) {
    const f = new Date(fechaBase); f.setMonth(f.getMonth() + dir); setFechaBase(f)
  }
  function getDiasSemana() {
    const inicio = new Date(fechaBase)
    inicio.setDate(inicio.getDate() - inicio.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio); d.setDate(d.getDate() + i); return d
    })
  }
  function navSemana(dir) {
    const f = new Date(fechaBase); f.setDate(f.getDate() + dir * 7); setFechaBase(f)
  }
  function horaAMinutos(hora) {
    if (!hora) return 0
    const [h, m] = hora.split(':').map(Number)
    return h * 60 + m
  }

  const pendientes  = reservaciones.filter(r => r.estado === 'pendiente').length
  const confirmadas = reservaciones.filter(r => r.estado === 'confirmada').length
  const hoyCount    = reservasDia(hoy).length
  const totalMes    = reservaciones.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00')
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear()
  }).length

  const diasSemana = getDiasSemana()
  const diasMes    = getDiasMes()

  return (
    <div className="db-root">
      <div className="db-stats">
        {[
          { label:'Hoy',         value:hoyCount,    icon:'📅', color:'#196792' },
          { label:'Este mes',    value:totalMes,    icon:'📆', color:'#de2989' },
          { label:'Pendientes',  value:pendientes,  icon:'⏳', color:'#f9b71b' },
          { label:'Confirmadas', value:confirmadas, icon:'✅', color:'#2a9437' },
        ].map(s => (
          <div key={s.label} className="db-stat" style={{ '--stat-color': s.color }}>
            <span className="db-stat-icon">{s.icon}</span>
            <div>
              <p className="db-stat-value">{s.value}</p>
              <p className="db-stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="db-cal-card">
        <div className="db-cal-header">
          <div className="db-cal-nav">
            <button onClick={() => vista === 'mes' ? navMes(-1) : navSemana(-1)}>‹</button>
            <h2 className="db-cal-titulo">
              {vista === 'mes'
                ? `${MESES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`
                : `Semana del ${diasSemana[0].getDate()} al ${diasSemana[6].getDate()} de ${MESES[diasSemana[0].getMonth()]}`}
            </h2>
            <button onClick={() => vista === 'mes' ? navMes(1) : navSemana(1)}>›</button>
          </div>
          <div className="db-cal-controles">
            <button className="db-hoy-btn" onClick={() => setFechaBase(new Date())}>Hoy</button>
            <div className="db-vista-tabs">
              <button className={vista === 'mes' ? 'active' : ''} onClick={() => setVista('mes')}>Mes</button>
              <button className={vista === 'semana' ? 'active' : ''} onClick={() => setVista('semana')}>Semana</button>
            </div>
          </div>
        </div>

        {loading && <div className="db-loading">Cargando reservaciones...</div>}

        {!loading && vista === 'mes' && (
          <div className="db-mes">
            <div className="db-mes-header">
              {DIAS.map(d => <div key={d} className="db-mes-dia-nombre">{d}</div>)}
            </div>
            <div className="db-mes-grid">
              {diasMes.map((dia, i) => {
                if (!dia) return <div key={`empty-${i}`} className="db-mes-celda db-mes-vacia" />
                const esHoy = mismaFecha(hoy.toISOString().split('T')[0], dia)
                const reservas = reservasDia(dia)
                return (
                  <div key={dia.toISOString()}
                    className={`db-mes-celda ${esHoy?'hoy':''} ${reservas.length>0?'tiene-reservas':''}`}>
                    <span className={`db-mes-num ${esHoy?'hoy':''}`}>{dia.getDate()}</span>
                    <div className="db-mes-eventos">
                      {reservas.slice(0,3).map(r => {
                        const cfg = TIPO_COLOR[r.tipo] ?? TIPO_COLOR.restaurante
                        return (
                          <div key={r.idReservacion} className="db-mes-evento"
                            style={{ background:cfg.bg, borderColor:cfg.border, color:cfg.text }}
                            onClick={() => setSeleccionada(r)} title={r.nombreCliente}>
                            <span className="db-mes-evento-dot" style={{ background:cfg.dot }} />
                            <span className="db-mes-evento-nombre">{r.nombreCliente}</span>
                          </div>
                        )
                      })}
                      {reservas.length > 3 && <div className="db-mes-mas">+{reservas.length-3} más</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && vista === 'semana' && (
          <div className="db-semana">
            <div className="db-semana-header">
              <div className="db-semana-hora-col" />
              {diasSemana.map(dia => {
                const esHoy = mismaFecha(hoy.toISOString().split('T')[0], dia)
                const reservas = reservasDia(dia)
                return (
                  <div key={dia.toISOString()} className={`db-semana-dia-col ${esHoy?'hoy':''}`}>
                    <p className="db-semana-dia-nombre">{DIAS[dia.getDay()]}</p>
                    <p className={`db-semana-dia-num ${esHoy?'hoy':''}`}>{dia.getDate()}</p>
                    {reservas.length > 0 && <span className="db-semana-badge">{reservas.length}</span>}
                  </div>
                )
              })}
            </div>
            <div className="db-semana-body">
              {HORAS.map(hora => (
                <div key={hora} className="db-semana-row">
                  <div className="db-semana-hora-col"><span>{String(hora).padStart(2,'0')}:00</span></div>
                  {diasSemana.map(dia => {
                    const reservas = reservasDia(dia).filter(r => Math.floor(horaAMinutos(r.horaInicio)/60) === hora)
                    return (
                      <div key={dia.toISOString()} className="db-semana-celda">
                        {reservas.map(r => {
                          const cfg = TIPO_COLOR[r.tipo] ?? TIPO_COLOR.restaurante
                          return (
                            <div key={r.idReservacion} className="db-semana-evento"
                              style={{ background:cfg.bg, borderColor:cfg.border }}
                              onClick={() => setSeleccionada(r)}>
                              <p className="db-se-nombre" style={{ color:cfg.text }}>{r.nombreCliente}</p>
                              <p className="db-se-hora" style={{ color:cfg.dot }}>
                                {r.horaInicio ?? 'Sin hora'}{r.horaFin ? ` — ${r.horaFin}` : ''}
                              </p>
                              <p className="db-se-tipo" style={{ color:cfg.text }}>{r.tipo} · {r.noPersonas} pers.</p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ModalDetalle r={seleccionada} onClose={() => setSeleccionada(null)} />
    </div>
  )
} 