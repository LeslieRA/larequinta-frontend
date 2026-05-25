import { useState, useEffect } from 'react'
import CalendarioReserva        from './CalendarioReserva.jsx'
import AlertaDisponibilidad     from './AlertaDisponibilidad.jsx'
import PhoneInput               from './PhoneInput.jsx'
import EmailInput               from './EmailInput.jsx'
import TicketReservacion        from './TicketReservacion.jsx'
import VistaZonas               from './VistaZonas.jsx'
import './WizardReserva.css'
import { getFechasBloqueadas }           from '../api/fechasBloqueadas.js'
import { getPaquetes }                   from '../api/paquetes.js'
import { getZonas }                      from '../api/zonas.js'
import { getMenu, getMenuByTipo }        from '../api/menu.js'
import { getInsumos }                    from '../api/insumos.js'
import { verificarDisponibilidadZona }   from '../api/disponibilidad.js'
import { getConfiguracion }              from '../api/configuracion.js'
import { buscarClientePorCorreo }        from '../api/clientes.js'
import { crearSalon, crearCatering, crearRestaurante } from '../api/reservaciones.js'

const PASOS = ['Tipo', 'Fecha y lugar', 'Paquete', 'Cliente', 'Resumen', 'Pago']
const CLIENTE_EMPTY = { nombre: '', telefono: '', correo: '', notas: '' }

export default function WizardReserva({ onFinish }) {
  const [paso, setPaso]                   = useState(0)
  const [tipo, setTipo]                   = useState(null)
  const [noPersonas, setNoPersonas]       = useState('')
  const [personasConfirmadas, setPersonasConfirmadas] = useState(false)
  const [mensajeRedireccion, setMensajeRedireccion]   = useState(null)

  const [fecha, setFecha]                 = useState(null)
  const [zona, setZona]                   = useState(null)
  const [lugar, setLugar]                 = useState('')
  const [horaInicio, setHoraInicio]       = useState('19:00')
  const [horaLlegada, setHoraLlegada]     = useState('14:00')
  const [duracion, setDuracion]           = useState(6)

  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState(null)
  const [personalizado, setPersonalizado]             = useState(false)
  const [menuSeleccionado, setMenuSeleccionado]       = useState([])
  const [insumosSeleccionados, setInsumosSeleccionados] = useState([])

  const [cliente, setCliente]             = useState(CLIENTE_EMPTY)
  const [buscandoCliente, setBuscandoCliente]         = useState(false)
  const [clienteEncontrado, setClienteEncontrado]     = useState(false)

  const [reservacionCreada, setReservacionCreada]     = useState(null)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState(null)
  const [errores, setErrores]             = useState({})
  const [ticketOpen, setTicketOpen]       = useState(false)

  // Datos del servidor
  const [fechasBloqueadas, setFechasBloqueadas] = useState([])
  const [paquetes, setPaquetes]           = useState([])
  const [zonas, setZonas]                 = useState([])
  const [platillos, setPlatillos]         = useState([])
  const [insumos, setInsumos]             = useState([])
  const [config, setConfig]               = useState({
    duracionMinimaHoras: 4,
    minimaPersonasSalon: 10
  })

  // Disponibilidad
  const [disponibilidad, setDisponibilidad] = useState(null)
  const [verificando, setVerificando]       = useState(false)

  useEffect(() => {
    getFechasBloqueadas().then(r => setFechasBloqueadas(r.data)).catch(() => {})
    getZonas().then(r => setZonas(r.data.filter(z => z.activo))).catch(() => {})
    getPaquetes().then(r => setPaquetes(r.data)).catch(() => {})
    getInsumos().then(r => setInsumos(r.data)).catch(() => {})
    getConfiguracion().then(r => {
      setConfig(r.data)
      setDuracion(r.data.duracionMinimaHoras ?? 4)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!tipo) return
    const tipoMenu = tipo === 'salon' ? 'salon'
                   : tipo === 'catering' ? 'catering'
                   : 'restaurante'
    getMenuByTipo(tipoMenu)
      .then(r => setPlatillos(r.data))
      .catch(() => getMenu().then(r =>
        setPlatillos(r.data.filter(p => p.estado === 'activo'))
      ))
  }, [tipo])

  useEffect(() => {
    if (tipo === 'salon' && zona && fecha && horaInicio) {
      verificar()
    } else {
      setDisponibilidad(null)
    }
  }, [zona, horaInicio, duracion, fecha, tipo])

  async function verificar() {
    try {
      setVerificando(true)
      const res = await verificarDisponibilidadZona(
        zona.idZona, fecha, horaInicio + ':00', Number(duracion)
      )
      setDisponibilidad(res.data)
    } catch {
      setDisponibilidad(null)
    } finally {
      setVerificando(false)
    }
  }

  // ── Confirmar personas y determinar tipo ────────────────
  function confirmarPersonas() {
    const n = Number(noPersonas)
    if (!n || n < 1) {
      setErrores({ noPersonas: 'Ingresa un número válido de personas' })
      return
    }
    setErrores({})
    setPersonasConfirmadas(true)

    if (tipo === 'salon' && n < config.minimaPersonasSalon) {
      setMensajeRedireccion(
        `Con ${n} persona${n === 1 ? '' : 's'} te recomendamos una reservación de restaurante. ` +
        `El salón requiere mínimo ${config.minimaPersonasSalon} personas.`
      )
      setTipo('restaurante')
    } else {
      setMensajeRedireccion(null)
    }
  }

  const paquetesFiltrados = paquetes.filter(p => {
    if (tipo === 'salon')    return p.tipo === 'Salon'
    if (tipo === 'catering') return p.tipo === 'Catering'
    return false
  })

  // ── Validación por paso ─────────────────────────────────
  function validarPaso(numeroPaso) {
    const e = {}

    if (numeroPaso === 0) {
      if (!tipo) e.tipo = 'Selecciona un tipo de reservación'
      if (!noPersonas || Number(noPersonas) < 1)
        e.noPersonas = 'Ingresa el número de personas'
    }

    if (numeroPaso === 1) {
      if (!fecha) e.fecha = 'Selecciona una fecha'
      if (tipo === 'salon') {
        if (!zona) e.zona = 'Selecciona una zona'
        if (!horaInicio) e.horaInicio = 'Selecciona una hora de inicio'
        if (!duracion || Number(duracion) < config.duracionMinimaHoras)
          e.duracion = `La duración mínima es ${config.duracionMinimaHoras} horas`
        if (disponibilidad && !disponibilidad.disponible)
          e.disponibilidad = disponibilidad.mensaje
        if (!horaInicio) e.horaInicio = 'Selecciona una hora de inicio'
        if (!duracion || Number(duracion) < config.duracionMinimaHoras)
          e.duracion = `La duración mínima es ${config.duracionMinimaHoras} horas`
      }
      if (tipo === 'catering') {
        if (!lugar.trim()) e.lugar = 'Escribe el lugar del evento'
        if (!horaInicio) e.horaInicio = 'Selecciona una hora de inicio'
        if (!duracion || Number(duracion) < config.duracionMinimaHoras)
          e.duracion = `La duración mínima es ${config.duracionMinimaHoras} horas`
      }
    }

    if (numeroPaso === 2) {
      if (!personalizado && !paqueteSeleccionado && tipo !== 'restaurante')
        e.paquete = 'Selecciona un paquete o elige personalizar'
    }

    if (numeroPaso === 3) {
      if (!cliente.nombre.trim()) e.nombre = 'El nombre es obligatorio'
      if (!cliente.telefono.trim()) e.telefono = 'El teléfono es obligatorio'
      if (!cliente.correo.trim()) e.correo = 'El correo es obligatorio'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cliente.correo))
        e.correo = 'El correo no tiene un formato válido'
    }

    setErrores(e)
    return Object.keys(e).length === 0
  }

  function siguiente() {
    if (validarPaso(paso)) {
      setErrores({})
      setPaso(p => p + 1)
    }
  }

  function anterior() {
    setErrores({})
    setPaso(p => p - 1)
  }

  // ── Platillos e insumos ─────────────────────────────────
  function togglePlatillo(platillo) {
    const existe = menuSeleccionado.find(p => p.idMenu === platillo.idMenu)
    if (existe) setMenuSeleccionado(menuSeleccionado.filter(p => p.idMenu !== platillo.idMenu))
    else setMenuSeleccionado([...menuSeleccionado, { ...platillo, cantidad: 1 }])
  }

  function setCantidadPlatillo(idMenu, cantidad) {
    setMenuSeleccionado(menuSeleccionado.map(p =>
      p.idMenu === idMenu ? { ...p, cantidad: Number(cantidad) } : p
    ))
  }

  function toggleInsumo(insumo) {
    const existe = insumosSeleccionados.find(i => i.idInsumo === insumo.idInsumo)
    if (existe) setInsumosSeleccionados(insumosSeleccionados.filter(i => i.idInsumo !== insumo.idInsumo))
    else setInsumosSeleccionados([...insumosSeleccionados, { ...insumo, cantidad: 1 }])
  }

  // ── Buscar cliente por correo ───────────────────────────
  async function buscarCliente(correo) {
    setCliente(c => ({ ...c, correo }))
    setErrores(err => ({ ...err, correo: null }))
    setClienteEncontrado(false)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return
    try {
      setBuscandoCliente(true)
      const res = await buscarClientePorCorreo(correo)
      if (res.data.encontrado) {
        setCliente({
          nombre:   res.data.nombre,
          telefono: res.data.telefono,
          correo:   res.data.correo,
          notas:    res.data.notas,
        })
        setClienteEncontrado(true)
        setErrores({})
      }
    } catch { /* silencioso */ }
    finally { setBuscandoCliente(false) }
  }

  // ── Confirmar reservación ───────────────────────────────
  async function confirmar() {
    try {
      setSaving(true)
      setError(null)
      const clienteData = {
        nombre: cliente.nombre, telefono: cliente.telefono,
        correo: cliente.correo, notas: cliente.notas,
      }
      let res
      if (tipo === 'salon') {
        res = await crearSalon({
          cliente: clienteData, fecha,
          noPersonas: Number(noPersonas),
          idZona: zona.idZona,
          idPaquete: paqueteSeleccionado?.idPaquete ?? null,
          horaInicio: horaInicio + ':00',
          duracionHoras: Number(duracion),
          platillos: menuSeleccionado.map(p => ({ idMenu: p.idMenu, cantidad: p.cantidad })),
        })
      } else if (tipo === 'catering') {
        res = await crearCatering({
          cliente: clienteData, fecha,
          noPersonas: Number(noPersonas), lugar,
          idPaquete: paqueteSeleccionado?.idPaquete ?? null,
          horaInicio: horaInicio + ':00',
          duracionHoras: Number(duracion),
          platillos: menuSeleccionado.map(p => ({ idMenu: p.idMenu, cantidad: p.cantidad })),
        })
      } else {
        res = await crearRestaurante({
          cliente: clienteData, fecha,
          noPersonas: Number(noPersonas),
          horaLlegada: horaLlegada + ':00',
        })
      }
      setReservacionCreada(res.data)
      setPaso(5)
    } catch (e) {
      const mensaje =
        e.response?.data?.message ||   // Spring mensaje estándar
        e.response?.data ||            // texto plano
        e.message ||                   // error de red
        'Error al crear la reservación'
      setError(typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="wizard">

      {/* ── Indicador de pasos ── */}
      <div className="wizard-steps">
        {PASOS.map((nombre, i) => (
          <div key={i} className={`wizard-step ${i === paso ? 'active' : ''} ${i < paso ? 'done' : ''}`}>
            <span className="step-num">{i < paso ? '✓' : i + 1}</span>
            <span className="step-label">{nombre}</span>
          </div>
        ))}
      </div>

      <div className="wizard-body">

        {/* ── Paso 0: Tipo + Personas ── */}
        {paso === 0 && (
          <div className="wizard-section">

            {/* Personas — compacto */}
            <div className="paso0-personas">
              <div className="form-field">
                <label>¿Cuántas personas?</label>
                <input
                  type="number" min="1"
                  value={noPersonas}
                  onChange={e => {
                    setNoPersonas(e.target.value)
                    setPersonasConfirmadas(false)
                    setMensajeRedireccion(null)
                    setErrores(err => ({ ...err, noPersonas: null }))
                  }}
                  placeholder="0"
                  onKeyDown={e => e.key === 'Enter' && confirmarPersonas()}
                />
              </div>
              <button className="btn-confirmar" onClick={confirmarPersonas}>
                Confirmar →
              </button>
            </div>

            {errores.noPersonas && (
              <p className="wizard-field-error" style={{ marginBottom: 12 }}>
                ⚠ {errores.noPersonas}
              </p>
            )}

            {/* Mensaje de redirección */}
            {mensajeRedireccion && (
              <div style={{
                background: 'var(--teal-lt)', border: '1px solid var(--teal)',
                borderRadius: 'var(--radius)', padding: '12px 16px',
                fontSize: 13.5, color: '#2a8a92',
                display: 'flex', gap: 10, alignItems: 'flex-start',
                marginBottom: 20
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>ℹ️</span>
                <p>{mensajeRedireccion}</p>
              </div>
            )}

            {/* Tipo de reservación */}
            {personasConfirmadas && (
              <>
                <h2 style={{ marginBottom: 14, fontSize: 18 }}>
                  ¿Qué tipo de reservación deseas?
                </h2>
                <div className="tipo-cards">
                  {[
                    { id: 'salon',       emoji: '🏛️', label: 'Salón',
                      desc: `Mín. ${config.minimaPersonasSalon} personas` },
                    { id: 'catering',    emoji: '🚚', label: 'Catering',
                      desc: 'En tu ubicación' },
                    { id: 'restaurante', emoji: '🍽️', label: 'Restaurante',
                      desc: 'Mesa en el local' },
                  ].map(t => {
                    const deshabilitado = t.id === 'salon'
                      && Number(noPersonas) < config.minimaPersonasSalon
                    return (
                      <button
                        key={t.id}
                        className={`tipo-card ${tipo === t.id ? 'selected' : ''} ${deshabilitado ? 'disabled' : ''}`}
                        onClick={() => {
                          if (deshabilitado) return
                          setTipo(t.id)
                          setErrores({})
                          setMensajeRedireccion(null)
                        }}
                        disabled={deshabilitado}
                      >
                        <span className="tipo-emoji">{t.emoji}</span>
                        <span className="tipo-label">{t.label}</span>
                        <span className="tipo-desc">{t.desc}</span>
                        {deshabilitado && (
                          <span style={{
                            fontSize: 10, background: 'var(--rose-lt)',
                            color: 'var(--rose-dk)', padding: '2px 6px',
                            borderRadius: 4, marginTop: 4
                          }}>
                            Mín. {config.minimaPersonasSalon} personas
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {errores.tipo && (
                  <p className="wizard-field-error" style={{ marginTop: 12 }}>
                    ⚠ {errores.tipo}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Paso 1: Fecha y lugar ── */}
        {paso === 1 && (
          <div className="wizard-section">
            <h2>Selecciona la fecha</h2>
            <div className="paso1-grid">
              <div>
                <CalendarioReserva
                  fechaSeleccionada={fecha}
                  onSelect={f => {
                    setFecha(f)
                    setErrores(e => ({ ...e, fecha: null }))
                  }}
                  fechasBloqueadas={fechasBloqueadas}
                />
                {errores.fecha && <p className="wizard-field-error">⚠ {errores.fecha}</p>}
              </div>

              <div className="paso1-opciones">

                {tipo === 'salon' && (
                  <>
                    {/* Vista de zonas — sin select, solo botones */}
                    <div className="form-field">
                      <label>
                        Selecciona una zona *
                        {fecha && <span style={{ color: 'var(--text-soft)', fontWeight: 400 }}>
                          {' '}— disponibilidad para {fecha}
                        </span>}
                      </label>
                      <VistaZonas
                        fecha={fecha}
                        zonaSeleccionada={zona}
                        onSelectZona={z => {
                          setZona(z)
                          setDisponibilidad(null)
                          setErrores(err => ({ ...err, zona: null }))
                        }}
                        horaInicio={horaInicio}
                        duracion={duracion}
                      />
                      {errores.zona && <p className="wizard-field-error">⚠ {errores.zona}</p>}
                      {zona && (
                        <div style={{
                          marginTop: 8, padding: '8px 12px',
                          background: 'var(--rose-lt)', borderRadius: 'var(--radius)',
                          fontSize: 13, color: 'var(--rose-dk)',
                          display: 'flex', alignItems: 'center', gap: 8
                        }}>
                          ✓ Zona seleccionada: <strong>{zona.nombre}</strong>
                        </div>
                      )}
                    </div>

                    <div className="form-field">
                      <label>Hora de inicio *</label>
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={e => {
                          setHoraInicio(e.target.value)
                          setErrores(err => ({ ...err, horaInicio: null }))
                        }}
                        className={errores.horaInicio ? 'input-error' : ''}
                      />
                      {errores.horaInicio && <p className="wizard-field-error">⚠ {errores.horaInicio}</p>}
                    </div>

                    <div className="form-field">
                      <label>Duración (horas) — mínimo {config.duracionMinimaHoras}h</label>
                      <input
                        type="number"
                        min={config.duracionMinimaHoras}
                        max="24"
                        value={duracion}
                        onChange={e => {
                          setDuracion(e.target.value)
                          setErrores(err => ({ ...err, duracion: null }))
                        }}
                        className={errores.duracion ? 'input-error' : ''}
                      />
                      {errores.duracion && <p className="wizard-field-error">⚠ {errores.duracion}</p>}
                    </div>

                    {verificando && (
                      <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                        Verificando disponibilidad...
                      </p>
                    )}
                    <AlertaDisponibilidad
                      disponibilidad={disponibilidad}
                      onSeleccionarZona={z => {
                        const found = zonas.find(zo => zo.idZona === z.idZona)
                        if (found) { setZona(found); setErrores(err => ({ ...err, zona: null })) }
                      }}
                      onSeleccionarHora={h => {
                        const match = h.match(/(\d{2}:\d{2})$/)
                        if (match) setHoraInicio(match[1])
                      }}
                    />
                  </>
                )}

                {tipo === 'catering' && (
                  <>
                    <div className="form-field">
                      <label>Lugar del evento *</label>
                      <input type="text" value={lugar}
                        onChange={e => { setLugar(e.target.value); setErrores(err => ({ ...err, lugar: null })) }}
                        placeholder="Dirección del evento..."
                        className={errores.lugar ? 'input-error' : ''} />
                      {errores.lugar && <p className="wizard-field-error">⚠ {errores.lugar}</p>}
                    </div>
                    <div className="form-field">
                      <label>Hora de inicio *</label>
                      <input type="time" value={horaInicio}
                        onChange={e => { setHoraInicio(e.target.value); setErrores(err => ({ ...err, horaInicio: null })) }}
                        className={errores.horaInicio ? 'input-error' : ''} />
                      {errores.horaInicio && <p className="wizard-field-error">⚠ {errores.horaInicio}</p>}
                    </div>
                    <div className="form-field">
                      <label>Duración (horas) — mínimo {config.duracionMinimaHoras}h</label>
                      <input type="number" min={config.duracionMinimaHoras} max="24"
                        value={duracion}
                        onChange={e => { setDuracion(e.target.value); setErrores(err => ({ ...err, duracion: null })) }}
                        className={errores.duracion ? 'input-error' : ''} />
                      {errores.duracion && <p className="wizard-field-error">⚠ {errores.duracion}</p>}
                    </div>
                  </>
                )}

                {tipo === 'restaurante' && (
                  <div className="form-field">
                    <label>Hora de llegada</label>
                    <input type="time" value={horaLlegada}
                      onChange={e => setHoraLlegada(e.target.value)} />
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ── Paso 2: Paquete o personalizado ── */}
        {paso === 2 && (
          <div className="wizard-section">
            <h2>Elige un paquete o personaliza</h2>
            {errores.paquete && <p className="wizard-field-error" style={{ marginBottom: 12 }}>⚠ {errores.paquete}</p>}

            {tipo !== 'restaurante' && paquetesFiltrados.length > 0 && (
              <div className="paquetes-grid">
                {paquetesFiltrados.map(p => (
                  <button key={p.idPaquete}
                    className={`paquete-card ${paqueteSeleccionado?.idPaquete === p.idPaquete && !personalizado ? 'selected' : ''}`}
                    onClick={() => { setPaqueteSeleccionado(p); setPersonalizado(false); setErrores(err => ({ ...err, paquete: null })) }}
                  >
                    <span className="paq-nombre">{p.nombre}</span>
                    <span className="paq-precio">${Number(p.precioExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    {p.descripcion && <span className="paq-desc">{p.descripcion}</span>}
                    {p.zonas?.length > 0 && <span className="paq-zona">📍 {p.zonas.map(z => z.nombre).join(', ')}</span>}
                    {p.platillos?.length > 0 && <span className="paq-info">🍳 {p.platillos.length} platillos incluidos</span>}
                    {p.insumos?.length > 0 && <span className="paq-info">🎀 {p.insumos.length} insumos incluidos</span>}
                  </button>
                ))}
              </div>
            )}

            {tipo === 'restaurante' && !personalizado && (
              <p style={{ color: 'var(--text-soft)', fontSize: 13, marginBottom: 12 }}>
                Selecciona los platillos que deseas ordenar.
              </p>
            )}

            <button
              className={`btn-personalizar ${personalizado || tipo === 'restaurante' ? 'selected' : ''}`}
              onClick={() => { setPersonalizado(true); setPaqueteSeleccionado(null); setErrores(err => ({ ...err, paquete: null })) }}
            >
              ✏️ Personalizar mi reservación
            </button>

            {(personalizado || tipo === 'restaurante') && (
              <div className="personalizado-section">
                <h3>Selecciona platillos</h3>
                <div className="items-check-grid">
                  {platillos.map(p => {
                    const sel = menuSeleccionado.find(s => s.idMenu === p.idMenu)
                    return (
                      <div key={p.idMenu} className={`item-check ${sel ? 'checked' : ''}`}>
                        <label>
                          <input type="checkbox" checked={!!sel} onChange={() => togglePlatillo(p)} />
                          <span>{p.nombre}</span>
                          <span className="item-precio">${Number(p.precio).toLocaleString('es-MX')}</span>
                        </label>
                        {sel && <input type="number" min="1" value={sel.cantidad}
                          onChange={e => setCantidadPlatillo(p.idMenu, e.target.value)}
                          className="item-cantidad-inline" />}
                      </div>
                    )
                  })}
                </div>

                {tipo !== 'restaurante' && insumos.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 16 }}>Selecciona insumos</h3>
                    <div className="items-check-grid">
                      {insumos.map(i => {
                        const sel = insumosSeleccionados.find(s => s.idInsumo === i.idInsumo)
                        return (
                          <div key={i.idInsumo} className={`item-check ${sel ? 'checked' : ''}`}>
                            <label>
                              <input type="checkbox" checked={!!sel} onChange={() => toggleInsumo(i)} />
                              <span>{i.nombre}</span>
                              <span className="item-precio">{i.unidad ?? 'pieza'}</span>
                            </label>
                            {sel && <input type="number" min="1" value={sel.cantidad}
                              onChange={e => setInsumosSeleccionados(insumosSeleccionados.map(s =>
                                s.idInsumo === i.idInsumo ? { ...s, cantidad: Number(e.target.value) } : s
                              ))} className="item-cantidad-inline" />}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Paso 3: Datos del cliente ── */}
        {paso === 3 && (
          <div className="wizard-section">
            <h2>Tus datos de contacto</h2>
            <div className="form-grid">

              <div className="form-field form-field-full">
                <label>Correo electrónico *</label>
                <div style={{ position: 'relative' }}>
                  <EmailInput value={cliente.correo} onChange={buscarCliente} />
                  {buscandoCliente && (
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-soft)' }}>
                      Buscando...
                    </span>
                  )}
                </div>
                {errores.correo && <p className="wizard-field-error">⚠ {errores.correo}</p>}
                {clienteEncontrado && (
                  <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✓ Cliente encontrado — datos rellenados automáticamente
                  </p>
                )}
              </div>

              <div className="form-field form-field-full">
                <label>Nombre completo *</label>
                <input type="text" value={cliente.nombre}
                  onChange={e => { setCliente({ ...cliente, nombre: e.target.value }); setErrores(err => ({ ...err, nombre: null })) }}
                  placeholder="Nombre completo"
                  className={errores.nombre ? 'input-error' : ''}
                  style={clienteEncontrado ? { background: 'var(--green-lt)', borderColor: 'var(--green)' } : {}} />
                {errores.nombre && <p className="wizard-field-error">⚠ {errores.nombre}</p>}
              </div>

              <div className="form-field form-field-full">
                <label>Teléfono *</label>
                <PhoneInput value={cliente.telefono}
                  onChange={val => { setCliente({ ...cliente, telefono: val }); setErrores(err => ({ ...err, telefono: null })) }}
                  error={errores.telefono} />
                {errores.telefono && <p className="wizard-field-error">⚠ {errores.telefono}</p>}
              </div>

              <div className="form-field form-field-full">
                <label>Notas adicionales</label>
                <textarea value={cliente.notas}
                  onChange={e => setCliente({ ...cliente, notas: e.target.value })}
                  placeholder="Alergias, preferencias, peticiones especiales..."
                  rows={3} />
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 4: Resumen ── */}
        {paso === 4 && (
          <div className="wizard-section">
            <h2>Resumen de tu reservación</h2>
            <div className="resumen">
              <div className="resumen-row"><span>Tipo</span><strong style={{ textTransform: 'capitalize' }}>{tipo}</strong></div>
              <div className="resumen-row"><span>Fecha</span><strong>{fecha}</strong></div>
              <div className="resumen-row"><span>Personas</span><strong>{noPersonas}</strong></div>
              {tipo === 'salon' && zona && <div className="resumen-row"><span>Zona</span><strong>{zona.nombre}</strong></div>}
              {tipo === 'catering' && <div className="resumen-row"><span>Lugar</span><strong>{lugar}</strong></div>}
              {tipo !== 'restaurante' && <div className="resumen-row"><span>Hora inicio</span><strong>{horaInicio} — {duracion}h</strong></div>}
              {tipo === 'restaurante' && <div className="resumen-row"><span>Hora llegada</span><strong>{horaLlegada}</strong></div>}
              {paqueteSeleccionado && <div className="resumen-row"><span>Paquete</span><strong>{paqueteSeleccionado.nombre}</strong></div>}
              {menuSeleccionado.length > 0 && (
                <div className="resumen-row"><span>Platillos</span><strong>{menuSeleccionado.map(p => `${p.nombre} x${p.cantidad}`).join(', ')}</strong></div>
              )}
              <div className="resumen-row"><span>Cliente</span><strong>{cliente.nombre} — {cliente.correo}</strong></div>
            </div>
            {error && <p className="wizard-field-error" style={{ marginTop: 12, fontSize: 13 }}>⚠ {error}</p>}
          </div>
        )}

        {/* ── Paso 5: Pago ── */}
        {paso === 5 && reservacionCreada && (
          <div className="wizard-section pago-section">

            <div className="pago-check">✅</div>
            <h2>¡Reservación confirmada!</h2>
            <p>Tu reservación ha sido registrada exitosamente.</p>

            {/* Código destacado */}
            <div className="pago-codigo">
              <span>Tu código de pago</span>
              <strong>{reservacionCreada.pago?.codigoPago}</strong>
              <p className="pago-codigo-hint">
                Guarda este código — lo necesitarás para pagar
              </p>
            </div>

            {/* Resumen rápido */}
            <div className="resumen" style={{ marginTop: 16 }}>
              <div className="resumen-row">
                <span>Monto a pagar</span>
                <strong>
                  ${Number(reservacionCreada.precioTotal).toLocaleString('es-MX', {
                    minimumFractionDigits: 2
                  })}
                </strong>
              </div>
              <div className="resumen-row">
                <span>Fecha límite de pago</span>
                <strong>
                  {reservacionCreada.pago?.fechaLimite
                    ? new Date(reservacionCreada.pago.fechaLimite).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })
                    : '—'}
                </strong>
              </div>
              <div className="resumen-row">
                <span>Estado</span>
                <strong style={{ color: 'var(--warning)' }}>⏳ Pendiente de pago</strong>
              </div>
            </div>

            <p className="pago-nota">
              Presenta este código en caja para completar tu reservación.
            </p>

            {/* Botones */}
            <div className="pago-btns">
              <button
                className="btn-primary pago-btn-ticket"
                onClick={() => setTicketOpen(true)}
              >
                🎫 Ver y descargar mi ticket
              </button>
              {onFinish && (
                <button className="btn-cancel" onClick={onFinish}>
                  Cerrar
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ── Botones de navegación ── */}
      {paso < 5 && (
        <div className="wizard-nav">
          {paso > 0 && <button className="btn-cancel" onClick={anterior}>← Anterior</button>}
          {paso < 4 && <button className="btn-primary" onClick={siguiente}>Siguiente →</button>}
          {paso === 4 && (
            <button className="btn-primary" onClick={confirmar} disabled={saving}>
              {saving ? 'Creando reservación...' : 'Confirmar reservación'}
            </button>
          )}
        </div>
      )}

      {ticketOpen && (
        <TicketReservacion reservacion={reservacionCreada} onClose={() => setTicketOpen(false)} />
      )}
    </div>
  )
}