import { useState, useEffect } from 'react'
import { getPaquetes }         from '../../api/paquetes.js'
import { getMenu }             from '../../api/menu.js'
import { getCategorias } from '../../api/categoriaMenu.js'
import { getZonas }            from '../../api/zonas.js'
import { getZonasPorDia } from '../../api/disponibilidad.js'
import { crearSalon, crearRestaurante } from '../../api/reservaciones.js'
import CalendarioReserva       from '../../components/CalendarioReserva.jsx'
import VistaZonas              from '../../components/VistaZonas.jsx'
import PhoneInput              from '../../components/PhoneInput.jsx'
import EmailInput              from '../../components/EmailInput.jsx'
import TicketReservacion       from '../../components/TicketReservacion.jsx'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './ReservaPage.css'

const WA_NUMBER  = '5551234567'
const WA_MESSAGE = 'Hola, me gustaría cotizar un servicio de catering para mi evento.'

// ── Pasos del flujo ──────────────────────────────────────
// PANTALLA_INICIO → EVENTOS o RESTAURANTE
// EVENTOS → SALON_O_CATERING
// SALON_O_CATERING → SALON_PAQUETE o CATERING_WA
// SALON_PAQUETE → SALON_FORM
// RESTAURANTE → RESTAURANTE_MENU → RESTAURANTE_FORM

export default function ReservaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [paso, setPaso] = useState(searchParams.get('tipo') ?? 'inicio')

  // Datos del servidor
  const [paquetes,    setPaquetes]    = useState([])
  const [menuItems,   setMenuItems]   = useState([])
  const [categorias,  setCategorias]  = useState([])
  const [zonas,       setZonas]       = useState([])

  // Selecciones salón
  const [conPaquete,     setConPaquete]     = useState(null)  // true | false
  const [paqueteEleg,    setPaqueteEleg]    = useState(null)
  const [fechaSel,       setFechaSel]       = useState(null)
  const [zonaSel,        setZonaSel]        = useState(null)
  const [horaInicio,     setHoraInicio]     = useState('13:00')
  const [duracion,       setDuracion]       = useState(5)
  const [personas,       setPersonas]       = useState('')
  const [disponibilidad, setDisponibilidad] = useState([])

  // Selecciones restaurante
  const [catTab,         setCatTab]         = useState(null)
  const [fechaRest,      setFechaRest]      = useState('')
  const [horaRest,       setHoraRest]       = useState('14:00')
  const [personasRest,   setPersonasRest]   = useState('')

  // Datos del cliente
  const [cliente, setCliente] = useState({
    nombre: '', telefono: '', correo: '', notas: ''
  })

  // Resultado
  const [resultado,  setResultado]  = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)
  const [errores,    setErrores]    = useState({})

  useEffect(() => {
    getPaquetes().then(r => setPaquetes(r.data.filter(p => !p.eliminado))).catch(() => {})
    getMenu().then(r    => setMenuItems(r.data.filter(m => m.estado === 'activo'))).catch(() => {})
    getCategorias().then(r => setCategorias(r.data)).catch(() => {})
    getZonas().then(r   => setZonas(r.data.filter(z => z.activo))).catch(() => {})
  }, [])

  useEffect(() => {
    if (fechaSel) {
      getZonasPorDia(fechaSel)
      .then(r => setDisponibilidad(r.data))
      .catch(() => {})
    }
  }, [fechaSel])

  const paquetesSalon = paquetes.filter(p =>
    p.tipo?.toLowerCase() === 'salon' || p.tipo?.toLowerCase() === 'salón'
  )

  // ── Navegar hacia atrás ──────────────────────────────────
  function atras() {
    const flujo = {
      eventos:        'inicio',
      salon_o_catering: 'eventos',
      salon_paquete:  'salon_o_catering',
      salon_form:     conPaquete ? 'salon_paquete' : 'salon_o_catering',
      restaurante:    'inicio',
      restaurante_form: 'restaurante',
    }
    const ant = flujo[paso]
    if (ant) setPaso(ant)
    else navigate('/')
  }

  // ── Validaciones ─────────────────────────────────────────
  function validarSalon() {
    const e = {}
    if (!personas || Number(personas) < 1)  e.personas  = 'Indica el número de personas'
    if (!fechaSel)                           e.fecha     = 'Selecciona una fecha'
    if (!zonaSel)                            e.zona      = 'Selecciona una zona'
    if (!cliente.nombre.trim())             e.nombre    = 'Tu nombre es obligatorio'
    if (!cliente.correo.trim())             e.correo    = 'Tu correo es obligatorio'
    if (!cliente.telefono.trim())           e.telefono  = 'Tu teléfono es obligatorio'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  function validarRestaurante() {
    const e = {}
    if (!personasRest || Number(personasRest) < 1) e.personas = 'Indica el número de personas'
    if (!fechaRest)                                 e.fecha    = 'Selecciona una fecha'
    if (!cliente.nombre.trim())                    e.nombre   = 'Tu nombre es obligatorio'
    if (!cliente.correo.trim())                    e.correo   = 'Tu correo es obligatorio'
    if (!cliente.telefono.trim())                  e.telefono = 'Tu teléfono es obligatorio'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  // ── Enviar salón ─────────────────────────────────────────
  async function confirmarSalon() {
    if (!validarSalon()) return
    try {
      setSaving(true); setError(null)
      const payload = {
        fecha:        fechaSel,
        noPersonas:   Number(personas),
        horaInicio:   horaInicio,
        duracionHoras: duracion,
        idZona:       zonaSel.idZona,
        idPaquete:    paqueteEleg?.idPaquete ?? null,
        platillos:    [],
        cliente: {
          nombre:   cliente.nombre,
          telefono: cliente.telefono,
          correo:   cliente.correo,
          notas:    cliente.notas,
        }
      }
      const res = await crearSalon(payload)
      setResultado(res.data)
      setPaso('exito')
    } catch (e) {
      setError(e.response?.data?.message ?? 'Error al crear la reservación')
    } finally {
      setSaving(false)
    }
  }

  // ── Enviar restaurante ───────────────────────────────────
  async function confirmarRestaurante() {
    if (!validarRestaurante()) return
    try {
      setSaving(true); setError(null)
      const payload = {
        fecha:        fechaRest,
        noPersonas:   Number(personasRest),
        horaLlegada:  horaRest,
        platillos:    [],
        cliente: {
          nombre:   cliente.nombre,
          telefono: cliente.telefono,
          correo:   cliente.correo,
          notas:    cliente.notas,
        }
      }
      const res = await crearSalon(payload)
      setResultado(res.data)
      setPaso('exito')
    } catch (e) {
      setError(e.response?.data?.message ?? 'Error al crear la reservación')
    } finally {
      setSaving(false)
    }
  }

  const menuPorCategoria = categorias.map(cat => ({
    ...cat,
    platillos: menuItems.filter(m =>
      m.idCategoria === cat.idCategoria &&
      (m.tipos?.some(t => t.toLowerCase() === 'restaurante') || !m.tipos?.length)
    )
  })).filter(cat => cat.platillos.length > 0)

  // ════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════

  return (
    <div className="rv-root">

      {/* Header */}
      <header className="rv-header">
        <button className="rv-back" onClick={atras}>
          {paso === 'inicio' ? '← Regresar al inicio' : '← Atrás'}
        </button>
        <div className="rv-header-brand">
          <img src="/larequinta.png" alt="La Requinta" />
          <span>La Requinta</span>
        </div>
        <div style={{ width: 140 }} />
      </header>

      <div className="rv-body">

        {/* ════════════════════════════════════════════════
            PASO: INICIO — 2 botones grandes
        ════════════════════════════════════════════════ */}
        {paso === 'inicio' && (
          <div className="rv-inicio">
            <div className="rv-inicio-header">
              <h1 className="rv-titulo">¿Qué tipo de reservación deseas?</h1>
              <p className="rv-subtitulo">Selecciona la opción que mejor se adapte a tu celebración</p>
            </div>

            <div className="rv-opciones-grid">
              <button className="rv-opcion-btn rv-opcion-eventos"
                onClick={() => setPaso('eventos')}>
                <div className="rv-opcion-icon">🏛️</div>
                <div className="rv-opcion-content">
                  <h2>Reservación de Eventos</h2>
                  <p>Salón de eventos y servicio de catering para tu celebración especial</p>
                  <div className="rv-opcion-tags">
                    <span>🎉 Bodas</span>
                    <span>👑 XV Años</span>
                    <span>🎓 Graduaciones</span>
                    <span>🚚 Catering</span>
                  </div>
                </div>
                <span className="rv-opcion-arrow">→</span>
              </button>

              <button className="rv-opcion-btn rv-opcion-restaurante"
                onClick={() => setPaso('restaurante')}>
                <div className="rv-opcion-icon">🍽️</div>
                <div className="rv-opcion-content">
                  <h2>Reservación en el Restaurante</h2>
                  <p>Reserva tu mesa y disfruta de nuestra cocina en un ambiente único</p>
                  <div className="rv-opcion-tags">
                    <span>👨‍👩‍👧 Familiar</span>
                    <span>💑 Romántico</span>
                    <span>🍳 Cocina tradicional</span>
                  </div>
                </div>
                <span className="rv-opcion-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            PASO: EVENTOS — Salón o Catering
        ════════════════════════════════════════════════ */}
        {paso === 'eventos' && (
          <div className="rv-inicio">
            <div className="rv-inicio-header">
              <div className="rv-breadcrumb">Reservación de Eventos</div>
              <h1 className="rv-titulo">¿Qué tipo de evento tienes en mente?</h1>
              <p className="rv-subtitulo">Cuéntanos más sobre tu celebración</p>
            </div>

            <div className="rv-opciones-grid">
              <button className="rv-opcion-btn rv-opcion-salon"
                onClick={() => { setConPaquete(null); setPaso('salon_o_catering') }}>
                <div className="rv-opcion-icon">🏛️</div>
                <div className="rv-opcion-content">
                  <h2>Reservar el Salón</h2>
                  <p>Celebra en nuestras instalaciones con o sin paquete de servicio incluido</p>
                  <div className="rv-opcion-tags">
                    <span>📍 En nuestro salón</span>
                    <span>🎁 Paquetes disponibles</span>
                  </div>
                </div>
                <span className="rv-opcion-arrow">→</span>
              </button>

              <button className="rv-opcion-btn rv-opcion-catering"
                onClick={() => setPaso('catering_wa')}>
                <div className="rv-opcion-icon">🚚</div>
                <div className="rv-opcion-content">
                  <h2>Reservación de Catering</h2>
                  <p>Llevamos el sabor de La Requinta a donde tú elijas. Servicio personalizado</p>
                  <div className="rv-opcion-tags">
                    <span>🏠 A domicilio</span>
                    <span>📍 Donde tú quieras</span>
                  </div>
                </div>
                <span className="rv-opcion-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            PASO: CATERING — WhatsApp
        ════════════════════════════════════════════════ */}
        {paso === 'catering_wa' && (
          <div className="rv-catering-wa">
            <div className="rv-catering-icon">🚚</div>
            <h1 className="rv-titulo">Servicio de Catering</h1>
            <p className="rv-catering-desc">
              Nuestro servicio de catering es completamente personalizado. Para brindarte
              la mejor cotización adaptada a tus necesidades, te atendemos directamente
              por WhatsApp.
            </p>

            <div className="rv-catering-pasos">
              {[
                { n: '1', texto: 'Envíanos un mensaje con los detalles de tu evento' },
                { n: '2', texto: 'Te respondemos con una cotización personalizada' },
                { n: '3', texto: 'Confirmamos la reservación juntos' },
              ].map(p => (
                <div key={p.n} className="rv-catering-paso">
                  <div className="rv-catering-num">{p.n}</div>
                  <p>{p.texto}</p>
                </div>
              ))}
            </div>

            <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rv-wa-btn">

            
              
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Cotizar por WhatsApp
            </a>

            <p className="rv-catering-nota">
              También puedes llamarnos al <strong>(555) 123-4567</strong>
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            PASO: SALON — ¿Con o sin paquete?
        ════════════════════════════════════════════════ */}
        {paso === 'salon_o_catering' && (
          <div className="rv-inicio">
            <div className="rv-inicio-header">
              <div className="rv-breadcrumb">Eventos → Salón</div>
              <h1 className="rv-titulo">¿Cómo deseas tu evento?</h1>
              <p className="rv-subtitulo">Puedes reservar solo el salón o elegir uno de nuestros paquetes</p>
            </div>

            <div className="rv-opciones-grid">
              <button className="rv-opcion-btn rv-opcion-solo-salon"
                onClick={() => { setConPaquete(false); setPaqueteEleg(null); setPaso('salon_form') }}>
                <div className="rv-opcion-icon">🏛️</div>
                <div className="rv-opcion-content">
                  <h2>Solo el salón</h2>
                  <p>Reserva el espacio y organiza el resto a tu manera</p>
                  <div className="rv-opcion-tags">
                    <span>✅ Más flexible</span>
                    <span>🎨 A tu estilo</span>
                  </div>
                </div>
                <span className="rv-opcion-arrow">→</span>
              </button>

              <button className="rv-opcion-btn rv-opcion-con-paquete"
                onClick={() => { setConPaquete(true); setPaso('salon_paquete') }}>
                <div className="rv-opcion-icon">🎁</div>
                <div className="rv-opcion-content">
                  <h2>Con paquete incluido</h2>
                  <p>Todo listo para tu evento: servicios, decoración y más</p>
                  <div className="rv-opcion-tags">
                    <span>⭐ Todo incluido</span>
                    <span>🎉 {paquetesSalon.length} paquetes disponibles</span>
                  </div>
                </div>
                <span className="rv-opcion-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            PASO: SALON PAQUETE — Elegir paquete
        ════════════════════════════════════════════════ */}
        {paso === 'salon_paquete' && (
          <div className="rv-seccion">
            <div className="rv-inicio-header">
              <div className="rv-breadcrumb">Eventos → Salón → Paquetes</div>
              <h1 className="rv-titulo">Elige tu paquete</h1>
              <p className="rv-subtitulo">Selecciona el que mejor se adapte a tu celebración</p>
            </div>

            {paquetesSalon.length === 0 ? (
              <div className="rv-empty">
                <span>🎁</span>
                <p>No hay paquetes disponibles por el momento</p>
                <button className="rv-btn-sec"
                  onClick={() => { setConPaquete(false); setPaso('salon_form') }}>
                  Continuar sin paquete
                </button>
              </div>
            ) : (
              <>
                <div className="rv-paquetes-grid">
                  {paquetesSalon.map(p => (
                    <div
                      key={p.idPaquete}
                      className={`rv-paq-card ${paqueteEleg?.idPaquete === p.idPaquete ? 'elegido' : ''}`}
                      onClick={() => setPaqueteEleg(p)}
                    >
                      <div className="rv-paq-img">
                        {p.imagen
                          ? <img src={p.imagen} alt={p.nombre} />
                          : <span>🎁</span>
                        }
                        {paqueteEleg?.idPaquete === p.idPaquete && (
                          <div className="rv-paq-check">✓ Elegido</div>
                        )}
                      </div>
                      <div className="rv-paq-body">
                        <h3>{p.nombre}</h3>
                        {p.descripcion && <p className="rv-paq-desc">{p.descripcion}</p>}

                        {/* Servicios incluidos */}
                        {p.servicios?.length > 0 && (
                          <div className="rv-paq-servicios">
                            <p className="rv-paq-svc-titulo">✅ Incluye:</p>
                            {p.servicios.map((s, i) => (
                              <div key={i} className="rv-paq-svc-item">
                                <span>{s.icono ?? '📝'}</span>
                                <span>{s.nombre}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {p.menuItems?.length > 0 && (
                          <p className="rv-paq-tag">🍳 {p.menuItems.length} platillos incluidos</p>
                        )}

                        <div className="rv-paq-precio">
                          <span>Precio adicional</span>
                          <strong>
                            ${Number(p.precioExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rv-paq-footer">
                  <button className="rv-btn-sec"
                    onClick={() => { setConPaquete(false); setPaqueteEleg(null); setPaso('salon_form') }}>
                    Continuar sin paquete
                  </button>
                  <button
                    className="rv-btn-primary"
                    disabled={!paqueteEleg}
                    onClick={() => setPaso('salon_form')}
                  >
                    Continuar con {paqueteEleg ? paqueteEleg.nombre : 'paquete'} →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            PASO: SALON FORM — Fecha, zona, personas, cliente
        ════════════════════════════════════════════════ */}
        {paso === 'salon_form' && (
          <div className="rv-form-layout">
            <div className="rv-form-left">
              <div className="rv-inicio-header">
                <div className="rv-breadcrumb">
                  Eventos → Salón
                  {paqueteEleg ? ` → ${paqueteEleg.nombre}` : ' → Sin paquete'}
                </div>
                <h1 className="rv-titulo">Detalles de tu evento</h1>
              </div>

              {/* Personas */}
              <div className="rv-form-card">
                <h3 className="rv-card-title">👥 Número de personas</h3>
                <input
                  type="number" min="1"
                  value={personas}
                  onChange={e => {
                    setPersonas(e.target.value)
                    setErrores(err => ({ ...err, personas: null }))
                  }}
                  placeholder="¿Cuántas personas asistirán?"
                  className={`rv-input ${errores.personas ? 'error' : ''}`}
                />
                {errores.personas && <p className="rv-error">⚠ {errores.personas}</p>}
              </div>

              {/* Calendario */}
              <div className="rv-form-card">
                <h3 className="rv-card-title">📅 Fecha del evento</h3>
                <CalendarioReserva
                  fechaSeleccionada={fechaSel}
                  onSelect={f => {
                    setFechaSel(f)
                    setErrores(err => ({ ...err, fecha: null }))
                  }}
                />
                {errores.fecha && <p className="rv-error">⚠ {errores.fecha}</p>}
              </div>

              {/* Horario */}
              {fechaSel && (
                <div className="rv-form-card">
                  <h3 className="rv-card-title">⏰ Horario</h3>
                  <div className="rv-horario-row">
                    <div className="rv-field">
                      <label>Hora de inicio</label>
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={e => setHoraInicio(e.target.value)}
                        className="rv-input"
                      />
                    </div>
                    <div className="rv-field">
                      <label>Duración (horas)</label>
                      <select
                        value={duracion}
                        onChange={e => setDuracion(Number(e.target.value))}
                        className="rv-input"
                      >
                        {[3,4,5,6,7,8].map(h => (
                          <option key={h} value={h}>{h} horas</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="rv-horario-fin">
                    Horario del evento: <strong>{horaInicio}</strong> — <strong>
                      {(() => {
                        const [h, m] = horaInicio.split(':').map(Number)
                        const fin = new Date(0, 0, 0, h + duracion, m)
                        return fin.toTimeString().slice(0, 5)
                      })()}
                    </strong>
                  </p>
                </div>
              )}

              {/* Zonas */}
              {fechaSel && (
                <div className="rv-form-card">
                  <h3 className="rv-card-title">📍 Selecciona la zona</h3>
                  <VistaZonas
                    zonas={zonas}
                    disponibilidad={disponibilidad}
                    fecha={fechaSel}
                    horaInicio={horaInicio}
                    duracion={duracion}
                    zonaSeleccionada={zonaSel}
                    onSelect={z => {
                      setZonaSel(z)
                      setErrores(err => ({ ...err, zona: null }))
                    }}
                  />
                  {errores.zona && <p className="rv-error">⚠ {errores.zona}</p>}
                </div>
              )}
            </div>

            {/* Panel derecho — datos del cliente + resumen */}
            <div className="rv-form-right">
              <div className="rv-resumen-card">
                <h3 className="rv-card-title">📋 Resumen</h3>

                {paqueteEleg && (
                  <div className="rv-resumen-item rv-resumen-paq">
                    <span>🎁 {paqueteEleg.nombre}</span>
                    <span>${Number(paqueteEleg.precioExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {zonaSel && (
                  <div className="rv-resumen-item">
                    <span>📍 {zonaSel.nombre}</span>
                    <span>${Number(zonaSel.precioRenta ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {fechaSel && (
                  <div className="rv-resumen-item">
                    <span>📅 {new Date(fechaSel + 'T00:00:00').toLocaleDateString('es-MX', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })}</span>
                  </div>
                )}

                {horaInicio && (
                  <div className="rv-resumen-item">
                    <span>⏰ {horaInicio} · {duracion} horas</span>
                  </div>
                )}

                {personas && (
                  <div className="rv-resumen-item">
                    <span>👥 {personas} personas</span>
                  </div>
                )}
              </div>

              {/* Datos del cliente */}
              <div className="rv-resumen-card">
                <h3 className="rv-card-title">👤 Tus datos</h3>

                <div className="rv-field">
                  <label>Nombre completo *</label>
                  <input
                    type="text"
                    value={cliente.nombre}
                    onChange={e => {
                      setCliente({ ...cliente, nombre: e.target.value })
                      setErrores(err => ({ ...err, nombre: null }))
                    }}
                    placeholder="Tu nombre"
                    className={`rv-input ${errores.nombre ? 'error' : ''}`}
                  />
                  {errores.nombre && <p className="rv-error">⚠ {errores.nombre}</p>}
                </div>

                <div className="rv-field">
                  <label>Correo electrónico *</label>
                  <EmailInput
                    value={cliente.correo}
                    onChange={correo => {
                      setCliente({ ...cliente, correo })
                      setErrores(err => ({ ...err, correo: null }))
                    }}
                    onClienteEncontrado={c => setCliente(prev => ({
                      ...prev,
                      nombre:   c.nombre   || prev.nombre,
                      telefono: c.telefono || prev.telefono,
                    }))}
                    className={errores.correo ? 'error' : ''}
                  />
                  {errores.correo && <p className="rv-error">⚠ {errores.correo}</p>}
                </div>

                <div className="rv-field">
                  <label>Teléfono *</label>
                  <PhoneInput
                    value={cliente.telefono}
                    onChange={tel => {
                      setCliente({ ...cliente, telefono: tel })
                      setErrores(err => ({ ...err, telefono: null }))
                    }}
                    className={errores.telefono ? 'error' : ''}
                  />
                  {errores.telefono && <p className="rv-error">⚠ {errores.telefono}</p>}
                </div>

                <div className="rv-field">
                  <label>Notas adicionales</label>
                  <textarea
                    rows={2}
                    value={cliente.notas}
                    onChange={e => setCliente({ ...cliente, notas: e.target.value })}
                    placeholder="Algo que debamos saber..."
                    className="rv-input"
                  />
                </div>
              </div>

              {error && <p className="rv-error-box">⚠ {error}</p>}

              <button
                className="rv-btn-primary rv-btn-full"
                onClick={confirmarSalon}
                disabled={saving}
              >
                {saving ? 'Reservando...' : '✓ Confirmar reservación'}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            PASO: RESTAURANTE — Menú por categoría
        ════════════════════════════════════════════════ */}
        {paso === 'restaurante' && (
          <div className="rv-seccion">
            <div className="rv-inicio-header">
              <div className="rv-breadcrumb">Restaurante</div>
              <h1 className="rv-titulo">Nuestro menú</h1>
              <p className="rv-subtitulo">Conoce lo que te espera en tu visita</p>
            </div>

            {/* Tabs de categoría */}
            <div className="rv-cat-tabs">
              <button
                className={`rv-cat-tab ${catTab === null ? 'active' : ''}`}
                onClick={() => setCatTab(null)}
              >
                🍴 Todos
              </button>
              {menuPorCategoria.map(cat => (
                <button
                  key={cat.idCategoria}
                  className={`rv-cat-tab ${catTab === cat.idCategoria ? 'active' : ''}`}
                  onClick={() => setCatTab(cat.idCategoria)}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>

            {/* Grid de platillos */}
            <div className="rv-menu-grid">
              {(catTab === null
                ? menuItems.filter(m =>
                    !m.tipos?.length || m.tipos.some(t => t.toLowerCase() === 'restaurante')
                  )
                : (menuPorCategoria.find(c => c.idCategoria === catTab)?.platillos ?? [])
              ).map(m => (
                <div key={m.idMenu} className="rv-menu-card">
                  <div className="rv-menu-img">
                    {m.imagen
                      ? <img src={m.imagen} alt={m.nombre} />
                      : <div className="rv-menu-placeholder">🍳</div>
                    }
                  </div>
                  <div className="rv-menu-info">
                    <h4>{m.nombre}</h4>
                    {m.descripcion && <p>{m.descripcion}</p>}
                    <span className="rv-menu-precio">
                      ${Number(m.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button
                className="rv-btn-primary"
                onClick={() => setPaso('restaurante_form')}
              >
                Continuar con la reservación →
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            PASO: RESTAURANTE FORM — Día, hora y personas
        ════════════════════════════════════════════════ */}
        {paso === 'restaurante_form' && (
          <div className="rv-form-layout rv-form-layout-center">
            <div className="rv-form-left">
              <div className="rv-inicio-header">
                <div className="rv-breadcrumb">Restaurante → Reservación</div>
                <h1 className="rv-titulo">¿Cuándo nos visitas?</h1>
              </div>

              <div className="rv-form-card">
                <h3 className="rv-card-title">📅 Fecha de visita</h3>
                <input
                  type="date"
                  value={fechaRest}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => {
                    setFechaRest(e.target.value)
                    setErrores(err => ({ ...err, fecha: null }))
                  }}
                  className={`rv-input ${errores.fecha ? 'error' : ''}`}
                />
                {errores.fecha && <p className="rv-error">⚠ {errores.fecha}</p>}
              </div>

              <div className="rv-form-card">
                <h3 className="rv-card-title">⏰ Hora de llegada</h3>
                <input
                  type="time"
                  value={horaRest}
                  onChange={e => setHoraRest(e.target.value)}
                  className="rv-input"
                />
              </div>

              <div className="rv-form-card">
                <h3 className="rv-card-title">👥 Número de personas</h3>
                <input
                  type="number" min="1"
                  value={personasRest}
                  onChange={e => {
                    setPersonasRest(e.target.value)
                    setErrores(err => ({ ...err, personas: null }))
                  }}
                  placeholder="¿Cuántas personas?"
                  className={`rv-input ${errores.personas ? 'error' : ''}`}
                />
                {errores.personas && <p className="rv-error">⚠ {errores.personas}</p>}
              </div>
            </div>

            <div className="rv-form-right">
              <div className="rv-resumen-card">
                <h3 className="rv-card-title">👤 Tus datos</h3>

                <div className="rv-field">
                  <label>Nombre completo *</label>
                  <input
                    type="text"
                    value={cliente.nombre}
                    onChange={e => {
                      setCliente({ ...cliente, nombre: e.target.value })
                      setErrores(err => ({ ...err, nombre: null }))
                    }}
                    placeholder="Tu nombre"
                    className={`rv-input ${errores.nombre ? 'error' : ''}`}
                  />
                  {errores.nombre && <p className="rv-error">⚠ {errores.nombre}</p>}
                </div>

                <div className="rv-field">
                  <label>Correo electrónico *</label>
                  <EmailInput
                    value={cliente.correo}
                    onChange={correo => {
                      setCliente({ ...cliente, correo })
                      setErrores(err => ({ ...err, correo: null }))
                    }}
                    onClienteEncontrado={c => setCliente(prev => ({
                      ...prev,
                      nombre:   c.nombre   || prev.nombre,
                      telefono: c.telefono || prev.telefono,
                    }))}
                    className={errores.correo ? 'error' : ''}
                  />
                  {errores.correo && <p className="rv-error">⚠ {errores.correo}</p>}
                </div>

                <div className="rv-field">
                  <label>Teléfono *</label>
                  <PhoneInput
                    value={cliente.telefono}
                    onChange={tel => {
                      setCliente({ ...cliente, telefono: tel })
                      setErrores(err => ({ ...err, telefono: null }))
                    }}
                    className={errores.telefono ? 'error' : ''}
                  />
                  {errores.telefono && <p className="rv-error">⚠ {errores.telefono}</p>}
                </div>

                <div className="rv-field">
                  <label>Notas adicionales</label>
                  <textarea
                    rows={2}
                    value={cliente.notas}
                    onChange={e => setCliente({ ...cliente, notas: e.target.value })}
                    placeholder="Algo que debamos saber..."
                    className="rv-input"
                  />
                </div>
              </div>

              {error && <p className="rv-error-box">⚠ {error}</p>}

              <button
                className="rv-btn-primary rv-btn-full"
                onClick={confirmarRestaurante}
                disabled={saving}
              >
                {saving ? 'Reservando...' : '✓ Confirmar reservación'}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            PASO: ÉXITO
        ════════════════════════════════════════════════ */}
        {paso === 'exito' && resultado && (
          <div className="rv-exito">
            <div className="rv-exito-icon">🎉</div>
            <h1 className="rv-titulo">¡Reservación confirmada!</h1>
            <p className="rv-subtitulo">
              Te hemos enviado los detalles. Recuerda pagar antes de la fecha límite.
            </p>

            {resultado.pago && (
              <div className="rv-exito-codigo">
                <p>Tu código de pago</p>
                <span>{resultado.pago.codigoPago}</span>
                <p className="rv-exito-limite">
                  Fecha límite: {new Date(resultado.pago.fechaLimite)
                    .toLocaleDateString('es-MX', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })}
                </p>
              </div>
            )}

            <TicketReservacion reservacion={resultado} />

            <button className="rv-btn-primary" style={{ marginTop: 24 }}
              onClick={() => navigate('/')}>
              Volver al inicio
            </button>
          </div>
        )}

      </div>
    </div>
  )
}