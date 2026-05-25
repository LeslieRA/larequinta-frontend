import { useState, useEffect } from 'react'
import './VistaZonas.css'
import { getZonasPorDia } from '../api/disponibilidad.js'

const HORA_INICIO = 7   // 7am
const HORA_FIN    = 23  // 11pm
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => i + HORA_INICIO)

export default function VistaZonas({ fecha, zonaSeleccionada, onSelectZona, horaInicio, duracion }) {
  const [zonas, setZonas]             = useState([])
  const [loading, setLoading]         = useState(false)
  const [vistaActiva, setVistaActiva] = useState('cuadricula')

  useEffect(() => {
    if (!fecha) return
    setLoading(true)
    getZonasPorDia(fecha)
      .then(r => setZonas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fecha])

  if (!fecha) return (
    <div className="vista-empty">
      📅 Selecciona una fecha para ver disponibilidad
    </div>
  )

  if (loading) return (
    <div className="vista-empty">
      <div className="vista-spinner" /> Cargando zonas...
    </div>
  )

  if (zonas.length === 0) return (
    <div className="vista-empty">No hay zonas disponibles</div>
  )

  // ── Helpers ─────────────────────────────────────────────
  function horaAMinutos(hora) {
    const [h, m] = hora.split(':').map(Number)
    return h * 60 + m
  }

  function hayConflicto(zona) {
    if (!horaInicio || !duracion) return false
    const inicio = horaAMinutos(horaInicio)
    const fin    = inicio + Number(duracion) * 60
    return zona.reservaciones.some(r => {
      const rI = horaAMinutos(r.horaInicio)
      const rF = horaAMinutos(r.horaFin)
      return inicio < rF && fin > rI
    })
  }

  function getEstado(zona) {
    if (!zona.disponible)    return 'llena'
    if (hayConflicto(zona))  return 'conflicto'
    if (zona.ocupacion === 1) return 'parcial'
    return 'libre'
  }

  const ESTADOS = {
    libre:     { label: 'Disponible',      color: '#2c9434', bg: '#e8f5e9', border: '#a5d6a7', icon: '✓' },
    parcial:   { label: '1 reservación',   color: '#e65100', bg: '#fff3e0', border: '#ffb74d', icon: '◑' },
    conflicto: { label: 'Horario ocupado', color: '#a82060', bg: '#fce8f3', border: '#f48fb1', icon: '⚠' },
    llena:     { label: 'Sin disponibilidad', color: '#646464', bg: '#f5f5f5', border: '#e0e0e0', icon: '✕' },
  }

  // Calcular posición en el timeline (porcentaje)
  function calcPosicion(hora) {
    const min = horaAMinutos(hora)
    const total = (HORA_FIN - HORA_INICIO) * 60
    return ((min - HORA_INICIO * 60) / total) * 100
  }

  function calcAncho(horaI, horaF) {
    const ini = horaAMinutos(horaI)
    const fin = horaAMinutos(horaF)
    const total = (HORA_FIN - HORA_INICIO) * 60
    return ((fin - ini) / total) * 100
  }

  // Calcular bloque propuesto
  const bloqueHoraFin = horaInicio
    ? `${String(Math.floor((horaAMinutos(horaInicio) + Number(duracion) * 60) / 60)).padStart(2, '0')}:${String((horaAMinutos(horaInicio) + Number(duracion) * 60) % 60).padStart(2, '0')}`
    : null

  return (
    <div className="vista-zonas">

      {/* Tabs */}
      <div className="vista-tabs">
        <button className={`vista-tab ${vistaActiva === 'cuadricula' ? 'active' : ''}`}
          onClick={() => setVistaActiva('cuadricula')}>
          ⊞ Zonas
        </button>
        <button className={`vista-tab ${vistaActiva === 'timeline' ? 'active' : ''}`}
          onClick={() => setVistaActiva('timeline')}>
          ⏱ Horarios
        </button>
      </div>

      {/* ── Vista cuadrícula compacta ── */}
      {vistaActiva === 'cuadricula' && (
        <div className="cuadricula-compact">
          {zonas.map(zona => {
            const estado    = getEstado(zona)
            const cfg       = ESTADOS[estado]
            const seleccion = zonaSeleccionada?.idZona === zona.idZona
            const clickable = estado !== 'llena' && estado !== 'conflicto'

            return (
              <div
                key={zona.idZona}
                className={`zona-item ${seleccion ? 'selected' : ''} ${!clickable ? 'disabled' : ''}`}
                onClick={() => clickable && onSelectZona(zona)}
                style={{ borderColor: seleccion ? '#dc3484' : cfg.border }}
              >
                {/* Imagen pequeña */}
                <div className="zona-item-img">
                  {zona.imagen
                    ? <img src={zona.imagen} alt={zona.nombre} />
                    : <span>🏛️</span>
                  }
                </div>

                {/* Info */}
                <div className="zona-item-info">
                  <div className="zona-item-header">
                    <span className="zona-item-nombre">{zona.nombre}</span>
                    <span className="zona-item-badge"
                      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div className="zona-item-meta">
                    <span>👥 {zona.capacidad} personas</span>
                    <span>💰 ${Number(zona.precioRenta).toLocaleString('es-MX')}</span>
                  </div>

                  {/* Horarios ocupados inline */}
                  {zona.reservaciones.length > 0 && (
                    <div className="zona-item-ocupados">
                      <span className="ocupados-label">Ocupado:</span>
                      {zona.reservaciones.map((r, i) => (
                        <span key={i} className="ocupado-pill">
                          🕐 {r.horaInicio}–{r.horaFin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {seleccion && <div className="zona-check">✓</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Vista timeline ── */}
      {vistaActiva === 'timeline' && (
        <div className="timeline-wrapper">

          {/* Regla de horas */}
          <div className="timeline-regla">
            <div className="timeline-label-col" />
            <div className="timeline-bar-col">
              <div className="timeline-horas">
                {HORAS.filter(h => h % 2 === 0).map(h => (
                  <span key={h} style={{ left: `${((h - HORA_INICIO) / (HORA_FIN - HORA_INICIO)) * 100}%` }}>
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Filas por zona */}
          {zonas.map(zona => {
            const estado    = getEstado(zona)
            const seleccion = zonaSeleccionada?.idZona === zona.idZona
            const clickable = estado !== 'llena'

            return (
              <div key={zona.idZona}
                className={`timeline-row ${seleccion ? 'selected' : ''} ${!clickable ? 'disabled' : ''}`}
                onClick={() => clickable && onSelectZona(zona)}
              >
                {/* Nombre zona */}
                <div className="timeline-label-col">
                  <span className="timeline-zona-nombre">{zona.nombre}</span>
                  <span className="timeline-zona-cap">cap. {zona.capacidad}</span>
                </div>

                {/* Barra de tiempo */}
                <div className="timeline-bar-col">
                  <div className="timeline-bar">

                    {/* Franjas de hora de fondo */}
                    {HORAS.map(h => (
                      <div key={h} className="timeline-franja"
                        style={{ left: `${((h - HORA_INICIO) / (HORA_FIN - HORA_INICIO)) * 100}%`,
                                 width: `${(1 / (HORA_FIN - HORA_INICIO)) * 100}%` }} />
                    ))}

                    {/* Bloques ocupados */}
                    {zona.reservaciones.map((r, i) => (
                      <div key={i} className="timeline-bloque ocupado"
                        style={{
                          left:  `${calcPosicion(r.horaInicio)}%`,
                          width: `${calcAncho(r.horaInicio, r.horaFin)}%`,
                        }}
                        title={`Ocupado: ${r.horaInicio} – ${r.horaFin}`}
                      >
                        <span className="bloque-label">{r.horaInicio}–{r.horaFin}</span>
                      </div>
                    ))}

                    {/* Bloque propuesto */}
                    {seleccion && horaInicio && bloqueHoraFin && (
                      <div className="timeline-bloque propuesto"
                        style={{
                          left:  `${calcPosicion(horaInicio)}%`,
                          width: `${calcAncho(horaInicio, bloqueHoraFin)}%`,
                        }}
                        title={`Tu reservación: ${horaInicio} – ${bloqueHoraFin}`}
                      >
                        <span className="bloque-label">📍 {horaInicio}–{bloqueHoraFin}</span>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )
          })}

          {/* Leyenda */}
          <div className="timeline-leyenda">
            <span><span className="leyenda-dot libre" /> Disponible</span>
            <span><span className="leyenda-dot ocupado" /> Ocupado</span>
            <span><span className="leyenda-dot propuesto" /> Tu reservación</span>
          </div>
        </div>
      )}
    </div>
  )
}