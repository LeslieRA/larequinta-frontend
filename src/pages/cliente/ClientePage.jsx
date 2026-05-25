import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SplashScreen      from '../../components/SplashScreen.jsx'
import CalendarioReserva from '../../components/CalendarioReserva.jsx'
import PhoneInput        from '../../components/PhoneInput.jsx'
import EmailInput        from '../../components/EmailInput.jsx'
import TicketReservacion from '../../components/TicketReservacion.jsx'
import './ClientePage.css'
import './reserva_overlay.css'
import { getPaquetes }                  from '../../api/paquetes.js'
import { getMenu }                      from '../../api/menu.js'
import { getZonas }                     from '../../api/zonas.js'
import { getCategorias }                from '../../api/categoriaMenu.js'
import { getRangosParaPersonas }        from '../../api/rangos.js'
import { crearSalon, crearRestaurante } from '../../api/reservaciones.js'
import { verificarDisponibilidadZona }  from '../../api/disponibilidad.js'
import ChatBot from '../../components/ChatBot.jsx'

const WA_NUMBER  = '7471234567'
const WA_MESSAGE = 'Hola, me gustaría cotizar un servicio de catering para mi evento.'

export default function ClientePage() {
  const [splash, setSplash]           = useState(true)
  const [menuTab, setMenuTab]         = useState('restaurante')
  const [paquetes, setPaquetes]       = useState([])
  const [menu, setMenu]               = useState([])
  const [zonas, setZonas]             = useState([])
  const [categorias, setCategorias]   = useState([])
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [sugerencias, setSugerencias] = useState([])

  // ── Modal detalle de paquete ─────────────────────────────
  const [paqueteDetalle, setPaqueteDetalle] = useState(null)

  const [reservaActiva, setReservaActiva] = useState(false)
  const [paso, setPaso]                   = useState('inicio')
  const [ticketAbierto, setTicketAbierto] = useState(false)

  const [conPaquete,  setConPaquete]  = useState(null)
  const [paqueteEleg, setPaqueteEleg] = useState(null)
  const [fechaSel,    setFechaSel]    = useState(null)
  const [horaInicio,  setHoraInicio]  = useState('13:00')
  const [duracion,    setDuracion]    = useState(5)
  const [personas,    setPersonas]    = useState('')

  const [rangos,        setRangos]        = useState([])
  const [rangoSel,      setRangoSel]      = useState(null)
  const [zonaSel,       setZonaSel]       = useState(null)
  const [loadingRangos, setLoadingRangos] = useState(false)
  const [sinRangos,     setSinRangos]     = useState(false)

  const [dispPorZona,  setDispPorZona]  = useState({})
  const [loadingDisp,  setLoadingDisp]  = useState(false)

  // ── Restaurante: tab por categoría ──────────────────────
  const [catTabRest,   setCatTabRest]   = useState(null)
  const [fechaRest,    setFechaRest]    = useState('')
  const [horaRest,     setHoraRest]     = useState('14:00')
  const [personasRest, setPersonasRest] = useState('')

  const [cliente,   setCliente]   = useState({ nombre:'', telefono:'', correo:'', notas:'' })
  const [resultado, setResultado] = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)
  const [errores,   setErrores]   = useState({})

  const navigate   = useNavigate()
  const secReserva = useRef(null)
  const secMenu    = useRef(null)
  const secPaq     = useRef(null)
  const secContact = useRef(null)

  useEffect(() => {
    getPaquetes().then(r => setPaquetes(r.data.filter(p => !p.eliminado))).catch(() => {})
    getMenu().then(r => setMenu(r.data.filter(m => m.estado === 'activo'))).catch(() => {})
    getZonas().then(r => setZonas(r.data.filter(z => z.activo))).catch(() => {})
    getCategorias().then(r => setCategorias(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!personas || Number(personas) < 1) {
      setRangos([]); setRangoSel(null); setZonaSel(null)
      setSinRangos(false); setDispPorZona({})
      return
    }
    setLoadingRangos(true)
    setSinRangos(false); setRangoSel(null); setZonaSel(null); setDispPorZona({})
    getRangosParaPersonas(Number(personas))
      .then(r => { setRangos(r.data); setSinRangos(r.data.length === 0) })
      .catch(() => setSinRangos(true))
      .finally(() => setLoadingRangos(false))
  }, [personas])

  useEffect(() => {
    if (!fechaSel || !horaInicio || rangos.length === 0) {
      setDispPorZona({}); setSugerencias([]); return
    }
    const zonasUnicas = []
    rangos.forEach(r => {
      r.zonas?.forEach(z => {
        if (!zonasUnicas.find(x => x.idZona === z.idZona)) zonasUnicas.push(z)
      })
    })
    if (zonasUnicas.length === 0) return
    setLoadingDisp(true); setDispPorZona({}); setSugerencias([])
    Promise.allSettled(
      zonasUnicas.map(z =>
        verificarDisponibilidadZona(z.idZona, fechaSel, horaInicio, duracion)
          .then(r => ({ idZona: z.idZona, data: r.data }))
          .catch(() => ({ idZona: z.idZona, data: null }))
      )
    ).then(results => {
      const mapa = {}; let sugs = []
      results.forEach(r => {
        if (r.status !== 'fulfilled' || !r.value.data) return
        const { idZona, data } = r.value
        mapa[idZona] = {
          disponible:     data.disponible,
          motivo:         data.mensaje        ?? null,
          horariosLibres: data.horariosLibres ?? [],
        }
        if (!data.disponible && data.sugerencias?.length > 0) sugs = data.sugerencias
      })
      setDispPorZona(mapa); setSugerencias(sugs)
    }).finally(() => setLoadingDisp(false))
  }, [fechaSel, horaInicio, duracion, rangos])

  const scrollTo = ref => { ref.current?.scrollIntoView({ behavior: 'smooth' }); setMenuAbierto(false) }

  const paquetesSalon = paquetes.filter(p =>
    p.tipo?.toLowerCase() === 'salon' || p.tipo?.toLowerCase() === 'salón'
  )

  // ── Categorías del menú de restaurante ──────────────────
  const menuPorCategoriaRest = categorias.map(cat => ({
    ...cat,
    platillos: menu.filter(m =>
      m.idCategoria === cat.idCategoria &&
      (!m.tipos?.length || m.tipos.some(t => t.toLowerCase() === 'restaurante'))
    )
  })).filter(cat => cat.platillos.length > 0)

  const platillosRestaurante = catTabRest === null
    ? menu.filter(m => !m.tipos?.length || m.tipos.some(t => t.toLowerCase() === 'restaurante'))
    : (menuPorCategoriaRest.find(c => c.idCategoria === catTabRest)?.platillos ?? [])

  const paqueteIncluyeZona = !!(paqueteEleg?.zonas?.length > 0)

  const precioEstimado = (() => {
    if (!rangoSel && !paqueteEleg) return 0
    return Number(paqueteEleg?.precioExtra ?? 0) +
           (paqueteIncluyeZona ? 0 : Number(rangoSel?.precio ?? 0))
  })()

  function dispDeZona(idZona) { return dispPorZona[idZona] ?? null }

  function zonaRepresentativa(rango) {
    if (!rango.zonas?.length) return null
    return rango.zonas.find(z => {
      const d = dispPorZona[z.idZona]
      return !d || d.disponible === true
    }) ?? rango.zonas[0]
  }

  function calcHoraFin(inicio, horas) {
    const [h, m] = inicio.split(':').map(Number)
    return new Date(0, 0, 0, h + horas, m).toTimeString().slice(0, 5)
  }

  function abrirReserva(tipo) {
    setPaso(tipo); setReservaActiva(true)
    setResultado(null); setError(null); setErrores({})
    setConPaquete(null); setPaqueteEleg(null)
    setFechaSel(null); setZonaSel(null); setRangoSel(null)
    setHoraInicio('13:00'); setDuracion(5); setPersonas('')
    setRangos([]); setSinRangos(false); setDispPorZona({})
    setFechaRest(''); setHoraRest('14:00'); setPersonasRest('')
    setCatTabRest(null)
    setCliente({ nombre:'', telefono:'', correo:'', notas:'' })
    setTicketAbierto(false)
    document.body.style.overflow = 'hidden'
  }

  function cerrarReserva() {
    setReservaActiva(false); setTicketAbierto(false)
    document.body.style.overflow = ''
  }

  function atras() {
    const flujo = {
      eventos: 'inicio_reserva', salon_o_catering: 'eventos',
      salon_paquete: 'salon_o_catering',
      salon_form: conPaquete ? 'salon_paquete' : 'salon_o_catering',
      catering_wa: 'eventos', restaurante: 'inicio_reserva',
      restaurante_form: 'restaurante',
    }
    const ant = flujo[paso]
    if (ant === 'inicio_reserva') cerrarReserva()
    else if (ant) setPaso(ant)
    else cerrarReserva()
  }

  function handleClienteEncontrado(c) {
    if (!c) return
    setCliente(prev => ({
      ...prev,
      nombre:   c.nombre   || prev.nombre,
      telefono: c.telefono || prev.telefono,
      correo:   c.correo   || prev.correo,
    }))
  }

  function scrollAlPrimerError() {
    setTimeout(() => {
      document.querySelector('.rv-field-err')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
  }

  function validarSalon() {
    const e = {}
    if (!personas || Number(personas) < 1) e.personas = 'Indica el número de personas'
    else if (sinRangos) e.personas = 'No hay disponibilidad para esa cantidad de personas'
    else if (!rangoSel) e.personas = 'Selecciona un espacio disponible'
    if (!fechaSel) e.fecha = 'Selecciona una fecha para el evento'
    if (loadingDisp) e.horario = 'Espera mientras verificamos la disponibilidad...'
    else if (rangoSel && fechaSel && zonaSel) {
      const disp = dispDeZona(zonaSel.idZona)
      if (disp?.disponible === false)
        e.horario = disp.motivo ?? 'El horario seleccionado no está disponible. Elige otra hora o fecha'
    }
    if (!cliente.nombre.trim()) {
      e.nombre = 'Tu nombre es obligatorio'
    } else if (/\d/.test(cliente.nombre)) {
      e.nombre = 'El nombre no debe contener números'
    }
    if (cliente.notas && /\d/.test(cliente.notas)) {
      e.notas = 'Las notas no deben contener números'
    }
    if (!cliente.correo.trim())   e.correo   = 'Tu correo electrónico es obligatorio'
    if (!cliente.telefono.trim()) {
      e.telefono = 'Tu teléfono es obligatorio'
    } else {
      const tel = cliente.telefono.replace(/[\s\-\(\)]/g,'').replace(/^\+52/,'').replace(/^52/,'')
      if (!/^\d{10}$/.test(tel)) e.telefono = 'Ingresa un número mexicano válido (10 dígitos)'
      else if (!/^[1-9]/.test(tel)) e.telefono = 'El número no puede empezar con 0'
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  function validarRestaurante() {
    const e = {}
    if (!personasRest || Number(personasRest) < 1) e.personas = 'Indica el número de personas'
    if (!fechaRest)                                 e.fecha    = 'Selecciona una fecha'
    if (!cliente.nombre.trim()) {
      e.nombre = 'Tu nombre es obligatorio'
    } else if (/\d/.test(cliente.nombre)) {
      e.nombre = 'El nombre no debe contener números'
    }
    if (cliente.notas && /\d/.test(cliente.notas)) {
      e.notas = 'Las notas no deben contener números'
    }
    if (!cliente.correo.trim())   e.correo   = 'Tu correo electrónico es obligatorio'
    if (!cliente.telefono.trim()) {
      e.telefono = 'Tu teléfono es obligatorio'
    } else {
      const tel = cliente.telefono.replace(/[\s\-\(\)]/g,'').replace(/^\+52/,'').replace(/^52/,'')
      if (!/^\d{10}$/.test(tel)) e.telefono = 'Ingresa un número mexicano válido (10 dígitos)'
      else if (!/^[1-9]/.test(tel)) e.telefono = 'El número no puede empezar con 0'
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function confirmarSalon() {
    const valido = validarSalon()
    if (!valido) { scrollAlPrimerError(); return }
    try {
      setSaving(true); setError(null)
      const idZona = paqueteIncluyeZona
        ? paqueteEleg.zonas[0].idZona
        : (zonaSel?.idZona ?? rangoSel?.zonas?.[0]?.idZona)
      const res = await crearSalon({
        fecha: fechaSel, noPersonas: Number(personas),
        horaInicio, duracionHoras: duracion, idZona,
        idPaquete: paqueteEleg?.idPaquete ?? null, platillos: [],
        cliente: { nombre: cliente.nombre, telefono: cliente.telefono, correo: cliente.correo, notas: cliente.notas }
      })
      setResultado(res.data); setPaso('exito')
    } catch (ex) {
      setError(ex.response?.data?.message ?? 'Ocurrió un error al crear la reservación. Intenta de nuevo.')
    } finally { setSaving(false) }
  }

  async function confirmarRestaurante() {
    const valido = validarRestaurante()
    if (!valido) { scrollAlPrimerError(); return }
    try {
      setSaving(true); setError(null)
      const res = await crearRestaurante({
        fecha: fechaRest, noPersonas: Number(personasRest),
        horaLlegada: horaRest, platillos: [],
        cliente: { nombre: cliente.nombre, telefono: cliente.telefono, correo: cliente.correo, notas: cliente.notas }
      })
      setResultado(res.data); setPaso('exito')
    } catch (ex) {
      setError(ex.response?.data?.message ?? 'Ocurrió un error al crear la reservación. Intenta de nuevo.')
    } finally { setSaving(false) }
  }

  if (splash) return <SplashScreen onFinish={() => setSplash(false)} />

  return (
    <div className="cp-root">

      {ticketAbierto && resultado && (
        <TicketReservacion reservacion={resultado} onClose={() => setTicketAbierto(false)} />
      )}

      {/* ══ MODAL DETALLE DE PAQUETE ════════════════════════ */}
      {paqueteDetalle && (
        <div className="rv-paq-modal-bg" onClick={() => setPaqueteDetalle(null)}>
          <div className="rv-paq-modal" onClick={e => e.stopPropagation()}>

            {/* Header del modal */}
            <div className="rv-paq-modal-header">
              {paqueteDetalle.imagen && (
                <div className="rv-paq-modal-img">
                  <img src={paqueteDetalle.imagen} alt={paqueteDetalle.nombre} />
                  <div className="rv-paq-modal-img-overlay" />
                </div>
              )}
              <div className="rv-paq-modal-title-wrap">
                <span className="rv-paq-modal-tipo">{paqueteDetalle.tipo}</span>
                <h2 className="rv-paq-modal-nombre">{paqueteDetalle.nombre}</h2>
                {paqueteDetalle.descripcion && (
                  <p className="rv-paq-modal-desc">{paqueteDetalle.descripcion}</p>
                )}
              </div>
              <button className="rv-paq-modal-close" onClick={() => setPaqueteDetalle(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Cuerpo del modal */}
            <div className="rv-paq-modal-body">

              {/* Zona incluida */}
              {paqueteDetalle.zonas?.length > 0 && (
                <div className="rv-paq-modal-section">
                  <p className="rv-paq-modal-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                    Salón incluido
                  </p>
                  <div className="rv-paq-modal-chips">
                    {paqueteDetalle.zonas.map(z => (
                      <span key={z.idZona} className="rv-paq-modal-chip rv-paq-modal-chip-verde">
                        ✓ {z.nombre} · hasta {z.capacidad} pers.
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Servicios */}
              {paqueteDetalle.servicios?.length > 0 && (
                <div className="rv-paq-modal-section">
                  <p className="rv-paq-modal-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    Servicios incluidos
                  </p>
                  <div className="rv-paq-modal-servicios">
                    {paqueteDetalle.servicios.map((s, i) => (
                      <div key={i} className="rv-paq-modal-svc">
                        <div className="rv-paq-modal-svc-dot" />
                        <span>{s.nombre}</span>
                        {s.descripcion && <p className="rv-paq-modal-svc-desc">{s.descripcion}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Platillos */}
              {paqueteDetalle.menuItems?.length > 0 && (
                <div className="rv-paq-modal-section">
                  <p className="rv-paq-modal-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>
                    Menú incluido ({paqueteDetalle.menuItems.length} platillos)
                  </p>
                  <div className="rv-paq-modal-menu">
                    {paqueteDetalle.menuItems.map((m, i) => (
                      <div key={i} className="rv-paq-modal-platillo">
                        {m.imagen && (
                          <div className="rv-paq-modal-platillo-img">
                            <img src={m.imagen} alt={m.nombre ?? m.nombrePlatillo} />
                          </div>
                        )}
                        <div className="rv-paq-modal-platillo-info">
                          <p className="rv-paq-modal-platillo-nombre">{m.nombre ?? m.nombrePlatillo}</p>
                          {m.descripcion && <p className="rv-paq-modal-platillo-desc">{m.descripcion}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insumos */}
              {paqueteDetalle.insumoItems?.length > 0 && (
                <div className="rv-paq-modal-section">
                  <p className="rv-paq-modal-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                    Insumos incluidos
                  </p>
                  <div className="rv-paq-modal-chips">
                    {paqueteDetalle.insumoItems.map((ins, i) => (
                      <span key={i} className="rv-paq-modal-chip rv-paq-modal-chip-lav">
                        {ins.nombre ?? ins.nombreInsumo}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer con precio y CTA */}
            <div className="rv-paq-modal-footer">
              <div className="rv-paq-modal-precio">
                <span>Precio adicional del paquete</span>
                <strong>${Number(paqueteDetalle.precioExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              </div>
              <button
                className="rv-btn-primary"
                onClick={() => {
                  setPaqueteEleg(paqueteDetalle)
                  setPaqueteDetalle(null)
                  setPaso('salon_form')
                }}
              >
                Elegir este paquete →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ OVERLAY RESERVACIONES ══════════════════════════ */}
      {reservaActiva && (
        <div className="rv-overlay">

          {(() => {
            const pct = { eventos:10, salon_o_catering:25, salon_paquete:40, salon_form:70, catering_wa:60, restaurante:30, restaurante_form:70, exito:100 }[paso] ?? 5
            return (
              <div className="rv-progress-bar" style={{position:'absolute',top:62,left:0,right:0,zIndex:10}}>
                <div className="rv-progress-fill" style={{width:`${pct}%`}}/>
              </div>
            )
          })()}

          <header className="rv-header">
            <button className="rv-header-back" onClick={atras}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Atrás
            </button>
            <div className="rv-header-brand">
              <img src="/larequinta.png" alt="La Requinta" /><span>La Requinta</span>
            </div>
            <button className="rv-header-close" onClick={cerrarReserva}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </header>

          <div className={`rv-body ${paso === 'restaurante' ? 'rv-body-wide' : ''}`}>

            {/* PASO: EVENTOS */}
            {paso === 'eventos' && (
              <div className="rv-paso">
                <div className="rv-paso-head">
                  <p className="rv-crumb">Eventos y Banquetes</p>
                  <h1 className="rv-titulo">¿Qué tipo de evento?</h1>
                  <p className="rv-sub">Cuéntanos más sobre tu celebración</p>
                </div>
                <div className="rv-opciones">
                  {[
                    { key:'salon', titulo:'Reservar el Salón', desc:'Celebra en nuestras instalaciones con o sin paquete incluido', tags:['En nuestro salón','Paquetes disponibles'], action:()=>setPaso('salon_o_catering') },
                    { key:'catering', titulo:'Catering a domicilio', desc:'Llevamos el sabor de La Requinta a donde tú elijas', tags:['A domicilio','Donde tú quieras'], action:()=>setPaso('catering_wa') },
                  ].map(op => (
                    <button key={op.key} className="rv-opcion" onClick={op.action}>
                      <div className="rv-op-icon">
                        {op.key === 'salon'
                          ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                          : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                        }
                      </div>
                      <div className="rv-op-body">
                        <h3>{op.titulo}</h3><p>{op.desc}</p>
                        <div className="rv-op-tags">{op.tags.map(t=><span key={t}>{t}</span>)}</div>
                      </div>
                      <svg className="rv-op-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO: CATERING WA */}
            {paso === 'catering_wa' && (
              <div className="rv-paso rv-paso-center">
                <div className="rv-catering">
                  <div className="rv-catering-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                  </div>
                  <h1 className="rv-titulo">Servicio de Catering</h1>
                  <p className="rv-catering-desc">Nuestro catering es completamente personalizado. Para brindarte la mejor cotización te atendemos por WhatsApp.</p>
                  <div className="rv-catering-steps">
                    {['Envíanos un mensaje con los detalles de tu evento','Te respondemos con una cotización personalizada','Confirmamos la reservación juntos'].map((t,i)=>(
                      <div key={i} className="rv-step"><div className="rv-step-num">{i+1}</div><p>{t}</p></div>
                    ))}
                  </div>
                  <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`} target="_blank" rel="noopener noreferrer" className="rv-wa-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Cotizar por WhatsApp
                  </a>
                  <p style={{fontSize:13,color:'#9a7090'}}>También puedes llamarnos al <strong style={{color:'#4a2040'}}>(747) 123-4567</strong></p>
                </div>
              </div>
            )}

            {/* PASO: SALON O CATERING */}
            {paso === 'salon_o_catering' && (
              <div className="rv-paso">
                <div className="rv-paso-head">
                  <p className="rv-crumb">Eventos → Salón</p>
                  <h1 className="rv-titulo">¿Cómo deseas tu evento?</h1>
                  <p className="rv-sub">Reserva el espacio solo o con paquete todo incluido</p>
                </div>
                <div className="rv-opciones">
                  {[
                    { titulo:'Solo el salón', desc:'Reserva el espacio y organiza el resto a tu manera', tags:['Más flexible','A tu estilo'], action:()=>{ setConPaquete(false); setPaqueteEleg(null); setPaso('salon_form') } },
                    { titulo:'Con paquete incluido', desc:'Todo listo: servicios, decoración, meseros y más', tags:['Todo incluido',`${paquetesSalon.length} paquetes`], action:()=>{ setConPaquete(true); setPaso('salon_paquete') } },
                  ].map((op,i)=>(
                    <button key={i} className="rv-opcion" onClick={op.action}>
                      <div className="rv-op-icon">
                        {i===0
                          ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                          : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        }
                      </div>
                      <div className="rv-op-body">
                        <h3>{op.titulo}</h3><p>{op.desc}</p>
                        <div className="rv-op-tags">{op.tags.map(t=><span key={t}>{t}</span>)}</div>
                      </div>
                      <svg className="rv-op-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══ PASO: PAQUETES — con botón ver detalle ══ */}
            {paso === 'salon_paquete' && (
              <div className="rv-paso">
                <div className="rv-paso-head">
                  <p className="rv-crumb">Eventos → Salón → Paquetes</p>
                  <h1 className="rv-titulo">Elige tu paquete</h1>
                  <p className="rv-sub">Presiona <strong>Ver detalles</strong> para conocer todo lo que incluye</p>
                </div>
                {paquetesSalon.length === 0 ? (
                  <div className="rv-empty">
                    <p>No hay paquetes disponibles</p>
                    <button className="rv-btn-sec" onClick={()=>{ setConPaquete(false); setPaso('salon_form') }}>Continuar sin paquete</button>
                  </div>
                ) : (
                  <>
                    <div className="rv-paq-grid">
                      {paquetesSalon.map(p => {
                        const sel = paqueteEleg?.idPaquete === p.idPaquete
                        return (
                          <div
                            key={p.idPaquete}
                            className={`rv-paq-card ${sel?'sel':''}`}
                            onClick={() => setPaqueteDetalle(p)}
                          >
                            <div className="rv-paq-img">
                              {p.imagen
                                ? <img src={p.imagen} alt={p.nombre}/>
                                : <div className="rv-paq-img-placeholder">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(222,41,137,0.2)" strokeWidth="1">
                                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                                    </svg>
                                  </div>
                              }
                              <div className="rv-paq-img-chips">
                                {p.zonas?.length > 0 && <span className="rv-paq-img-chip">Salón incl.</span>}
                                {p.servicios?.length > 0 && <span className="rv-paq-img-chip">{p.servicios.length} servicios</span>}
                                {p.menuItems?.length > 0 && <span className="rv-paq-img-chip">{p.menuItems.length} platillos</span>}
                              </div>
                              {!sel && (
                                <div className="rv-paq-img-hover-overlay">
                                  <div className="rv-paq-img-hover-label">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <circle cx="12" cy="12" r="10"/>
                                      <line x1="12" y1="8" x2="12" y2="12"/>
                                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                                    </svg>
                                    Ver detalles
                                  </div>
                                </div>
                              )}
                              {sel && (
                                <div className="rv-paq-sel-badge">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                  Seleccionado
                                </div>
                              )}
                            </div>
                            <div className="rv-paq-body">
                              <h3>{p.nombre}</h3>
                              <div className="rv-paq-precio">
                                <span>Precio adicional</span>
                                <strong>${Number(p.precioExtra).toLocaleString('es-MX',{minimumFractionDigits:2})}</strong>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="rv-paq-footer">
                      <button className="rv-btn-sec" onClick={()=>{ setConPaquete(false); setPaqueteEleg(null); setPaso('salon_form') }}>Sin paquete</button>
                      <button className="rv-btn-primary" disabled={!paqueteEleg} onClick={()=>setPaso('salon_form')}>Continuar →</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PASO: SALON FORM */}
            {paso === 'salon_form' && (
              <div className="rv-form-wrap">
                <div className="rv-form-main">
                  <div className="rv-paso-head">
                    <p className="rv-crumb">Eventos → Salón{paqueteEleg?` → ${paqueteEleg.nombre}`:''}</p>
                    <h1 className="rv-titulo">Detalles de tu evento</h1>
                  </div>

                  {/* Paquete elegido — resumen compacto */}
                  {paqueteEleg && (
                    <div className="rv-paq-elegido">
                      <div className="rv-paq-elegido-info">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <div>
                          <p className="rv-paq-elegido-nombre">{paqueteEleg.nombre}</p>
                          <p className="rv-paq-elegido-precio">${Number(paqueteEleg.precioExtra).toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                        </div>
                      </div>
                      <div className="rv-paq-elegido-btns">
                        <button className="rv-paq-elegido-detalle" onClick={() => setPaqueteDetalle(paqueteEleg)}>Ver detalles</button>
                        <button className="rv-paq-elegido-cambiar" onClick={() => setPaso('salon_paquete')}>Cambiar</button>
                      </div>
                    </div>
                  )}

                  {/* 1. Personas */}
                  <div className="rv-card">
                    <h3 className="rv-card-label">Número de personas</h3>
                    <input type="number" min="1" value={personas}
                      onChange={e => { setPersonas(e.target.value); setErrores(err=>({...err,personas:null})) }}
                      placeholder="¿Cuántas personas asistirán?"
                      className={`rv-input ${errores.personas?'err':''}`}/>
                    {errores.personas && <p className="rv-field-err">⚠ {errores.personas}</p>}
                    {loadingRangos && <p className="rv-loading-text">Buscando espacios disponibles...</p>}
                    {sinRangos && !loadingRangos && personas && (
                      <div className="rv-no-disp">
                        <div className="rv-no-disp-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div>
                          <p className="rv-no-disp-titulo">Sin disponibilidad para {personas} personas</p>
                          <p className="rv-no-disp-desc">No contamos con espacios para esa cantidad. Contáctanos por WhatsApp.</p>
                          <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola, me interesa reservar para ${personas} personas`)}`} target="_blank" rel="noopener noreferrer" className="rv-no-disp-wa">Contactar por WhatsApp</a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Fecha */}
                  <div className="rv-card">
                    <h3 className="rv-card-label">Fecha del evento</h3>
                    <CalendarioReserva fechaSeleccionada={fechaSel} onSelect={f => { setFechaSel(f); setRangoSel(null); setZonaSel(null); setDispPorZona({}); setErrores(err=>({...err,fecha:null,horario:null})) }}/>
                    {errores.fecha && <p className="rv-field-err">⚠ {errores.fecha}</p>}
                  </div>

                  {/* 3. Horario */}
                  {fechaSel && (
                    <div className="rv-card">
                      <h3 className="rv-card-label">Horario del evento</h3>
                      <div className="rv-horario-row">
                        <div className="rv-field-group">
                          <label>Hora de inicio</label>
                          <input type="time" value={horaInicio} onChange={e => { setHoraInicio(e.target.value); setRangoSel(null); setZonaSel(null); setErrores(err=>({...err,horario:null})) }} className="rv-input"/>
                        </div>
                        <div className="rv-field-group">
                          <label>Duración</label>
                          <select value={duracion} onChange={e => { setDuracion(Number(e.target.value)); setRangoSel(null); setZonaSel(null); setErrores(err=>({...err,horario:null})) }} className="rv-input">
                            {[3,4,5,6,7,8].map(h=><option key={h} value={h}>{h} horas</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="rv-horario-resumen">Horario: <strong>{horaInicio}</strong> — <strong>{calcHoraFin(horaInicio,duracion)}</strong></div>
                      {errores.horario && <p className="rv-field-err" style={{marginTop:8}}>⚠ {errores.horario}</p>}
                    </div>
                  )}

                  {/* 4. Zonas */}
                  {rangos.length > 0 && !loadingRangos && (
                    <div className="rv-card">
                      <h3 className="rv-card-label">
                        {fechaSel
                          ? `Espacios para ${personas} personas · ${new Date(fechaSel+'T00:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})}`
                          : `Espacios disponibles para ${personas} personas`}
                      </h3>
                      {fechaSel && loadingDisp && <p className="rv-loading-text">Verificando disponibilidad de horarios...</p>}
                      <div className="rv-rangos-grid">
                        {rangos.map(r => {
                          const isSel = rangoSel?.idRango === r.idRango
                          const bloqueado = Number(personas) < r.personasMin
                          const zonaRep = zonaRepresentativa(r)
                          const dispZona = zonaRep ? dispDeZona(zonaRep.idZona) : null
                          const ocupado = fechaSel && !loadingDisp && dispZona?.disponible === false
                          const libre = fechaSel && !loadingDisp && dispZona?.disponible === true
                          return (
                            <div key={r.idRango} className={['rv-rango-card', isSel?'sel':'', bloqueado?'bloqueado':'', ocupado?'ocupado':''].filter(Boolean).join(' ')}
                              onClick={() => { if (bloqueado || ocupado) return; setRangoSel(r); setZonaSel(zonaRep); setErrores(err=>({...err,personas:null,horario:null})) }}>
                              <div className="rv-rango-img">
                                {zonaRep?.imagen ? <img src={zonaRep.imagen} alt={zonaRep.nombre}/> : <div className="rv-rango-img-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(222,41,137,0.3)" strokeWidth="1"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg></div>}
                                <div className="rv-rango-img-overlay"/>
                                <div className="rv-rango-zonas-badges">{r.zonas?.map(z=><span key={z.idZona} className="rv-rango-zona-badge">{z.nombre}</span>)}</div>
                                {bloqueado && <div className="rv-rango-min-badge">Mín. {r.personasMin} pers.</div>}
                                {ocupado && !bloqueado && <div className="rv-rango-ocupado-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Ocupado en ese horario</div>}
                                {libre && !bloqueado && <div className="rv-rango-libre-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Disponible</div>}
                                {isSel && <div className="rv-rango-sel-overlay"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Seleccionado</div>}
                              </div>
                              <div className="rv-rango-info">
                                <p className="rv-rango-nombre">{r.nombre}</p>
                                {r.zonas?.length > 0 && <p className="rv-rango-cap">Capacidad hasta {Math.max(...r.zonas.map(z=>z.capacidad))} personas</p>}
                                <div className="rv-rango-precio-row">
                                  <span className="rv-rango-precio-label">Renta</span>
                                  {paqueteIncluyeZona ? <span className="rv-rango-incluido">Incluida en paquete</span> : <span className="rv-rango-precio">${Number(r.precio).toLocaleString('es-MX',{minimumFractionDigits:2})}</span>}
                                </div>
                                {ocupado && dispZona?.horariosLibres?.length > 0 && (
                                  <div className="rv-rango-ocupado-horarios">
                                    <p className="rv-horas-titulo">Horarios disponibles ese día:</p>
                                    <div className="rv-horas-grid">{dispZona.horariosLibres.map((h,i)=><span key={i} className="rv-hora-chip rv-hora-chip-libre">{h}</span>)}</div>
                                    <p className="rv-disp-consejo">Ajusta la hora de inicio para usar uno de estos horarios</p>
                                  </div>
                                )}
                                {ocupado && sugerencias.length > 0 && (
                                  <div className="rv-sugerencias">
                                    <p className="rv-horas-titulo">Otras zonas disponibles:</p>
                                    {sugerencias.map(s=><span key={s.idZona} className="rv-sugerencia-chip">{s.nombre} · hasta {s.capacidad} pers.</span>)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="rv-form-side">
                  <div className="rv-resumen">
                    <div className="rv-resumen-header">
                      <img src="/larequinta.png" alt="" className="rv-resumen-header-logo"/>
                      <div><p className="rv-resumen-titulo">Reservación</p><p className="rv-resumen-sub">La Requinta — Salón de Eventos</p></div>
                    </div>
                    <div className="rv-resumen-body">
                      {rangoSel && <div className="rv-resumen-row"><span>Espacio</span>{paqueteIncluyeZona?<span className="rv-resumen-incluido">Incluido en paquete</span>:<span>${Number(rangoSel.precio).toLocaleString('es-MX',{minimumFractionDigits:2})}</span>}</div>}
                      {paqueteEleg && <div className="rv-resumen-row rv-resumen-paq"><span>Paquete</span><span>${Number(paqueteEleg.precioExtra).toLocaleString('es-MX',{minimumFractionDigits:2})}</span></div>}
                      {fechaSel && <div className="rv-resumen-row"><span>Fecha</span><span style={{fontSize:12}}>{new Date(fechaSel+'T00:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})}</span></div>}
                      {fechaSel && <div className="rv-resumen-row"><span>Horario</span><span>{horaInicio} · {duracion}h (hasta {calcHoraFin(horaInicio,duracion)})</span></div>}
                      {personas && <div className="rv-resumen-row"><span>Personas</span><span>{personas}</span></div>}
                      {zonaSel && <div className="rv-resumen-row"><span>Zona</span><span>{zonaSel.nombre}</span></div>}
                    </div>
                    {precioEstimado > 0 && <div className="rv-resumen-total"><span>Total estimado</span><strong>${precioEstimado.toLocaleString('es-MX',{minimumFractionDigits:2})}</strong></div>}
                  </div>

                  <div className="rv-card">
                    <h3 className="rv-card-label">Tus datos de contacto</h3>

                    <div className="rv-field-group">
                      <label>Correo electrónico *</label>
                      <EmailInput value={cliente.correo} onChange={correo=>{ setCliente(prev=>({...prev,correo})); setErrores(err=>({...err,correo:null})) }} onClienteEncontrado={handleClienteEncontrado} className={errores.correo?'err':''}/>
                      <p className="rv-field-hint">Si ya tienes cuenta, rellenaremos los demás campos</p>
                      {errores.correo && <p className="rv-field-err">⚠ {errores.correo}</p>}
                    </div>

                    <div className="rv-datos-divider"/>

                    <div className="rv-field-group">
                      <label>Nombre completo *</label>
                      <input type="text" value={cliente.nombre}
                        onChange={e=>{ setCliente(prev=>({...prev,nombre:e.target.value})); setErrores(err=>({...err,nombre:null})) }}
                        placeholder="Tu nombre completo"
                        className={`rv-input ${errores.nombre?'err':''}`}/>
                      {errores.nombre && <p className="rv-field-err">⚠ {errores.nombre}</p>}
                    </div>

                    <div className="rv-field-group">
                      <label>Teléfono (10 dígitos) *</label>
                      <PhoneInput value={cliente.telefono}
                        onChange={tel=>{ setCliente(prev=>({...prev,telefono:tel})); setErrores(err=>({...err,telefono:null})) }}
                        className={errores.telefono?'err':''}/>
                      {errores.telefono && <p className="rv-field-err">⚠ {errores.telefono}</p>}
                    </div>

                    <div className="rv-field-group">
                      <label>Notas adicionales <span className="rv-label-opt">(opcional)</span></label>
                      <textarea rows={2} value={cliente.notas}
                        onChange={e=>{ setCliente(prev=>({...prev,notas:e.target.value})); setErrores(err=>({...err,notas:null})) }}
                        placeholder="Alergias, peticiones especiales, etc."
                        className={`rv-input ${errores.notas?'err':''}`}/>
                      {errores.notas && <p className="rv-field-err">⚠ {errores.notas}</p>}
                    </div>
                  </div>

                  {error && <div className="rv-error-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</div>}

                  <button className="rv-btn-primary rv-btn-full" onClick={confirmarSalon} disabled={saving || loadingDisp || loadingRangos}>
                    {saving ? 'Reservando...' : loadingDisp ? 'Verificando disponibilidad...' : 'Confirmar reservación'}
                  </button>
                </div>
              </div>
            )}

            {/* ══ PASO: RESTAURANTE MENÚ — por categoría ══ */}
            {paso === 'restaurante' && (
              <div className="rv-paso rv-paso-wide">
                <div className="rv-paso-head">
                  <p className="rv-crumb">Restaurante</p>
                  <h1 className="rv-titulo">Nuestro menú</h1>
                  <p className="rv-sub">Explora nuestros platillos por categoría</p>
                </div>

                {/* Tabs de categoría */}
                <div className="rv-cat-tabs">
                  <button className={`rv-cat-tab ${catTabRest===null?'act':''}`} onClick={()=>setCatTabRest(null)}>
                    Todos
                  </button>
                  {menuPorCategoriaRest.map(cat=>(
                    <button key={cat.idCategoria} className={`rv-cat-tab ${catTabRest===cat.idCategoria?'act':''}`} onClick={()=>setCatTabRest(cat.idCategoria)}>
                      {cat.nombre}
                    </button>
                  ))}
                </div>

                {/* Menú agrupado por categoría cuando está en "Todos" */}
                <div className="rv-menu-grid">
                  {(catTabRest === null
                    ? menu.filter(m => !m.tipos?.length || m.tipos.some(t => t.toLowerCase() === 'restaurante'))
                    : (menuPorCategoriaRest.find(c => c.idCategoria === catTabRest)?.platillos ?? [])
                  ).map(m => (
                    <div key={m.idMenu} className="rv-menu-card">
                      <div className="rv-menu-img">
                        {m.imagen ? <img src={m.imagen} alt={m.nombre}/> : <div className="rv-menu-ph"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(222,41,137,0.2)" strokeWidth="1"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg></div>}
                      </div>
                      <div className="rv-menu-info">
                        <h4>{m.nombre}</h4>
                        {m.descripcion && <p>{m.descripcion}</p>}
                        <span className="rv-menu-precio">${Number(m.precio).toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{textAlign:'center',marginTop:32}}>
                  <button className="rv-btn-primary" onClick={()=>setPaso('restaurante_form')}>Continuar con la reservación →</button>
                </div>
              </div>
            )}

            {/* PASO: RESTAURANTE FORM */}
            {paso === 'restaurante_form' && (
              <div className="rv-form-wrap">
                <div className="rv-form-main">
                  <div className="rv-paso-head">
                    <p className="rv-crumb">Restaurante → Reservación</p>
                    <h1 className="rv-titulo">¿Cuándo nos visitas?</h1>
                  </div>
                  <div className="rv-card">
                    <h3 className="rv-card-label">Fecha de visita</h3>
                    <CalendarioReserva
                      fechaSeleccionada={fechaRest}
                      onSelect={f=>{ setFechaRest(f); setErrores(err=>({...err,fecha:null})) }}
                      fechasBloqueadas={[]}
                    />
                    {errores.fecha && <p className="rv-field-err">⚠ {errores.fecha}</p>}
                    {fechaRest&&(()=>{ const dia=new Date(fechaRest+'T12:00:00').getDay(); return (dia===1||dia===2)?(<div className="rv-disp-aviso"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>El restaurante abre de miércoles a domingo. Lunes y martes solo con cita previa.</p></div>):null })()}
                  </div>
                  <div className="rv-card">
                    <h3 className="rv-card-label">Hora de llegada</h3>
                    <input type="time" value={horaRest} min="08:00" onChange={e=>setHoraRest(e.target.value)} className="rv-input"/>
                    <p style={{fontSize:11.5,color:'#b090a8',marginTop:8}}>Horario regular: 8:00 am – cierre (mié a dom)</p>
                  </div>
                  <div className="rv-card">
                    <h3 className="rv-card-label">Número de personas</h3>
                    <input type="number" min="1" value={personasRest} onChange={e=>{ setPersonasRest(e.target.value); setErrores(err=>({...err,personas:null})) }} placeholder="¿Cuántas personas?" className={`rv-input ${errores.personas?'err':''}`}/>
                    {errores.personas && <p className="rv-field-err">⚠ {errores.personas}</p>}
                  </div>
                </div>
                <div className="rv-form-side">
                  <div className="rv-card">
                    <h3 className="rv-card-label">Tus datos</h3>
                    <p style={{fontSize:11.5,color:'#b090a8',marginBottom:12}}>Ingresa tu correo — si ya tienes cuenta rellenaremos los demás campos automáticamente</p>
                    <div className="rv-field-group">
                      <label>Correo electrónico *</label>
                      <EmailInput value={cliente.correo} onChange={correo=>{ setCliente(prev=>({...prev,correo})); setErrores(err=>({...err,correo:null})) }} onClienteEncontrado={handleClienteEncontrado} className={errores.correo?'err':''}/>
                      {errores.correo && <p className="rv-field-err">⚠ {errores.correo}</p>}
                    </div>
                    <div className="rv-field-group">
                      <label>Nombre completo *</label>
                      <input type="text" value={cliente.nombre} onChange={e=>{ setCliente(prev=>({...prev,nombre:e.target.value})); setErrores(err=>({...err,nombre:null})) }} placeholder="Tu nombre" className={`rv-input ${errores.nombre?'err':''}`}/>
                      {errores.nombre && <p className="rv-field-err">⚠ {errores.nombre}</p>}
                    </div>
                    <div className="rv-field-group">
                      <label>Teléfono *</label>
                      <PhoneInput value={cliente.telefono} onChange={tel=>{ setCliente(prev=>({...prev,telefono:tel})); setErrores(err=>({...err,telefono:null})) }} className={errores.telefono?'err':''}/>
                      {errores.telefono && <p className="rv-field-err">⚠ {errores.telefono}</p>}
                    </div>
                    <div className="rv-field-group">
                      <label>Notas adicionales</label>
                      <textarea rows={2} value={cliente.notas} onChange={e=>setCliente(prev=>({...prev,notas:e.target.value}))} placeholder="Algo que debamos saber..." className="rv-input"/>
                    </div>
                  </div>
                  {error && <div className="rv-error-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</div>}
                  <button className="rv-btn-primary rv-btn-full" onClick={confirmarRestaurante} disabled={saving}>{saving?'Reservando...':'Confirmar reservación'}</button>
                </div>
              </div>
            )}

            {/* PASO: ÉXITO */}
            {paso === 'exito' && resultado && (
              <div className="rv-paso rv-paso-center">
                <div className="rv-exito">
                  <div className="rv-exito-icono">
                    <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="11" fill="#fce8f3" stroke="#de2989" strokeWidth="1.5"/>
                      <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#de2989" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h1 className="rv-titulo">¡Reservación confirmada!</h1>
                  <p className="rv-sub">Recuerda realizar el pago antes de la fecha límite.</p>
                  {resultado.pago && (
                    <div className="rv-exito-codigo">
                      <p className="rv-exito-codigo-label">Tu código de pago</p>
                      <span className="rv-exito-codigo-valor">{resultado.pago.codigoPago}</span>
                      <p className="rv-exito-limite">Pagar antes del: {new Date(resultado.pago.fechaLimite).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}</p>
                    </div>
                  )}
                  <div className="rv-exito-btns">
                    <button className="rv-btn-primary" onClick={()=>setTicketAbierto(true)}>Ver comprobante</button>
                    <button className="rv-btn-sec" onClick={cerrarReserva}>Volver al inicio</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ══ PÁGINA PRINCIPAL ═══════════════════════════════ */}
      <header className="cp-nav">
        <div className="cp-nav-inner">
          <div className="cp-nav-brand" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>
            <img src="/larequinta.png" alt="La Requinta" className="cp-nav-logo"/>
            <span className="cp-nav-nombre">La Requinta</span>
          </div>
          <nav className="cp-nav-links">
            <button onClick={()=>scrollTo(secReserva)}>Reservaciones</button>
            <button onClick={()=>scrollTo(secPaq)}>Paquetes</button>
            <button onClick={()=>scrollTo(secMenu)}>Menú</button>
            <button onClick={()=>scrollTo(secContact)}>Contacto</button>
            <a href="/login" className="cp-nav-admin">Iniciar sesión</a>
          </nav>
          <button className="cp-hamburger" onClick={()=>setMenuAbierto(!menuAbierto)}><span/><span/><span/></button>
        </div>
        {menuAbierto && (
          <div className="cp-mobile-menu">
            <button onClick={()=>scrollTo(secReserva)}>Reservaciones</button>
            <button onClick={()=>scrollTo(secPaq)}>Paquetes</button>
            <button onClick={()=>scrollTo(secMenu)}>Menú</button>
            <button onClick={()=>scrollTo(secContact)}>Contacto</button>
            <a href="/login" className="cp-nav-admin">Iniciar sesión</a>
          </div>
        )}
      </header>

      <section className="cp-hero">
        <div className="cp-hero-overlay"/>
        <div className="cp-hero-content">
          <img src="/larequinta.png" alt="La Requinta" className="cp-hero-logo"/>
          <h1 className="cp-hero-title">Momentos que <span>se recuerdan</span></h1>
          <div className="cp-hero-divider"/>
          <p className="cp-hero-sub">Salón de eventos, catering y restaurante en un solo lugar</p>
          <div className="cp-hero-btns">
            <button className="cp-btn-primary" onClick={()=>scrollTo(secReserva)}>Hacer una reservación</button>
            <button className="cp-btn-ghost" onClick={()=>scrollTo(secPaq)}>Ver paquetes</button>
          </div>
        </div>
        <div className="cp-hero-scroll"><span>↓</span></div>
      </section>

      <section className="cp-section cp-reserva" ref={secReserva}>
        <div className="cp-section-inner">
          <div className="cp-section-header">
            <span className="cp-pill">Reservaciones</span>
            <h2>¿Cómo celebramos juntos?</h2>
            <p>Elige el tipo de experiencia que deseas vivir con nosotros</p>
          </div>
          <div className="cp-reserva-grid">
            <div className="cp-reserva-card cp-reserva-eventos" onClick={()=>abrirReserva('eventos')}>
              <div className="cp-rc-overlay"/>
              <div className="cp-rc-content">
                <span className="cp-rc-cat">Eventos &amp; Catering</span>
                <h3 className="cp-rc-titulo">Eventos y<br/>Banquetes</h3>
                <p className="cp-rc-desc">Bodas, XV años, graduaciones y eventos corporativos.</p>
                <div className="cp-rc-tags"><span>Bodas</span><span>XV Años</span><span>Graduaciones</span><span>Catering</span></div>
                <button className="cp-rc-btn">Reservar ahora →</button>
              </div>
            </div>
            <div className="cp-reserva-card cp-reserva-rest" onClick={()=>abrirReserva('restaurante')}>
              <div className="cp-rc-overlay"/>
              <div className="cp-rc-content">
                <span className="cp-rc-cat">Restaurante</span>
                <h3 className="cp-rc-titulo">Reservación<br/>de Mesa</h3>
                <p className="cp-rc-desc">Reserva tu mesa y disfruta de nuestra cocina en un ambiente único y acogedor.</p>
                <div className="cp-rc-tags"><span>Familiar</span><span>Romántico</span><span>Cocina tradicional</span></div>
                <button className="cp-rc-btn cp-rc-btn-rest">Reservar ahora →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {zonas.length > 0 && (
        <section className="cp-section cp-zonas">
          <div className="cp-section-inner">
            <div className="cp-section-header">
              <span className="cp-pill">Nuestros espacios</span>
              <h2>Conoce nuestras zonas</h2>
              <p>Cada espacio diseñado para hacer tu evento inolvidable</p>
            </div>
            <div className="cp-zonas-grid">
              {zonas.map(z=>(
                <div key={z.idZona} className="cp-zona-card">
                  <div className="cp-zona-img">
                    {z.imagen?<img src={z.imagen} alt={z.nombre}/>:<div className="cp-zona-ph"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eddde8" strokeWidth="1"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg></div>}
                    <span className="cp-zona-cap">Hasta {z.capacidad} personas</span>
                  </div>
                  <div className="cp-zona-info">
                    <h3>{z.nombre}</h3>
                    {z.descripcion&&<p>{z.descripcion}</p>}
                    <button className="cp-zona-btn" onClick={()=>abrirReserva('eventos')}>Reservar esta zona</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {paquetes.length > 0 && (
        <section className="cp-section cp-paquetes" ref={secPaq}>
          <div className="cp-section-inner">
            <div className="cp-section-header">
              <span className="cp-pill">Paquetes</span>
              <h2>Todo incluido para tu evento</h2>
              <p>Selecciona el paquete que mejor se adapte a tu celebración</p>
            </div>
            <div className="cp-paq-grid">
              {paquetes.map(p=>(
                <div key={p.idPaquete} className="cp-paq-card">
                  {p.imagen&&<div className="cp-paq-img"><img src={p.imagen} alt={p.nombre}/></div>}
                  <div className="cp-paq-body">
                    <span className="cp-paq-tipo">{p.tipo}</span>
                    <h3>{p.nombre}</h3>
                    {p.descripcion&&<p className="cp-paq-desc">{p.descripcion}</p>}
                    <div className="cp-paq-items">
                      {p.menuItems?.length>0&&<span>{p.menuItems.length} platillos</span>}
                      {p.insumoItems?.length>0&&<span>{p.insumoItems.length} insumos</span>}
                      {p.servicios?.length>0&&<span>{p.servicios.length} servicios</span>}
                    </div>
                    <div className="cp-paq-precio"><span>Precio adicional</span><strong>${Number(p.precioExtra).toLocaleString('es-MX',{minimumFractionDigits:2})}</strong></div>
                    <button className="cp-paq-btn" onClick={()=>abrirReserva('eventos')}>Elegir este paquete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="cp-section cp-menu-sec" ref={secMenu}>
        <div className="cp-section-inner">
          <div className="cp-section-header">
            <span className="cp-pill">Menú</span>
            <h2>Nuestra cocina</h2>
            <p>Platillos preparados con los mejores ingredientes</p>
          </div>
          <div className="cp-menu-tabs">
            {[{id:'restaurante',label:'Restaurante'},{id:'salon',label:'Salón'},{id:'catering',label:'Catering'}].map(t=>(
              <button key={t.id} className={`cp-menu-tab ${menuTab===t.id?'active':''}`} onClick={()=>setMenuTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="cp-menu-grid">
            {menu.filter(m=>!m.tipos||m.tipos.length===0||m.tipos.some(t=>t.toLowerCase().trim()===menuTab)).map(m=>(
              <div key={m.idMenu} className="cp-menu-card">
                <div className="cp-menu-img">
                  {m.imagen?<img src={m.imagen} alt={m.nombre}/>:<div className="cp-menu-ph"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(222,41,137,0.15)" strokeWidth="1"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg></div>}
                </div>
                <div className="cp-menu-body">
                  <h4>{m.nombre}</h4>
                  {m.descripcion&&<p>{m.descripcion}</p>}
                  <span className="cp-menu-precio">${Number(m.precio).toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                </div>
              </div>
            ))}
          </div>
          {menu.length===0&&<p style={{textAlign:'center',color:'#b090a8',padding:32}}>Menú disponible próximamente</p>}
        </div>
      </section>

      <section className="cp-section cp-contacto" ref={secContact}>
        <div className="cp-section-inner">
          <div className="cp-section-header light">
            <span className="cp-pill light">Encuéntranos</span>
            <h2>Visítanos</h2>
            <p>Estamos listos para hacer de tu evento algo especial</p>
          </div>
          <div className="cp-contacto-grid">
            <div className="cp-contacto-info">
              {[{icon:'📍',label:'Dirección',val:'Av. Principal #123, Col. Centro, Chilpancingo, Gro.'},{icon:'📞',label:'Teléfono',val:'(747) 123-4567'},{icon:'✉',label:'Correo',val:'contacto@larequinta.mx'},{icon:'🕓',label:'Horario de Atención',val:'Miércoles a Domingo: 8:00 AM – Cierre\nLunes y Martes: Solo citas programadas'}].map(item=>(
                <div key={item.label} className="cp-contacto-item">
                  <span className="cp-contacto-icon">{item.icon}</span>
                  <div><p className="cp-contacto-label">{item.label}</p><p className="cp-contacto-val" style={{whiteSpace:'pre-line'}}>{item.val}</p></div>
                </div>
              ))}
              <div className="cp-contacto-btns">
                <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola, me gustaría obtener información sobre sus servicios')}`} target="_blank" rel="noopener noreferrer" className="cp-contacto-btn cp-btn-wa">Escribir por WhatsApp</a>
                <a href="https://maps.app.goo.gl/MT1JVArV9nMGe64x7" target="_blank" rel="noopener noreferrer" className="cp-contacto-btn cp-btn-maps">Cómo llegar</a>
              </div>
              <div className="cp-redes">
                <p className="cp-redes-label">Síguenos en redes</p>
                <div className="cp-redes-btns">
                  <a href="https://www.facebook.com/profile.php?id=100064203605719" target="_blank" rel="noopener noreferrer" className="cp-red-btn cp-red-fb">Facebook</a>
                  <a href="https://www.instagram.com/explore/locations/113764869244117/la-requinta/" target="_blank" rel="noopener noreferrer" className="cp-red-btn cp-red-ig">Instagram</a>
                </div>
              </div>
            </div>
            <div className="cp-mapa">
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3803.9902770645003!2d-99.49463632580334!3d17.55564959793792!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85cbedd0d4877aeb%3A0x1582e5dc6af9e4c4!2sLa%20Requinta!5e0!3m2!1ses-419!2smx!4v1776355663966!5m2!1ses-419!2smx" width="100%" height="100%" style={{border:0,borderRadius:16}} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Ubicación La Requinta"/>
            </div>
          </div>
        </div>
      </section>

      <footer className="cp-footer">
        <div className="cp-footer-inner">
          <div className="cp-footer-brand">
            <img src="/larequinta.png" alt="La Requinta" className="cp-footer-logo"/>
            <div><p className="cp-footer-nombre">La Requinta</p><p className="cp-footer-sub">Restaurante &amp; Eventos</p></div>
          </div>
          <p className="cp-footer-copy">2026 La Requinta. Todos los derechos reservados.</p>
          <a href="/login" className="cp-footer-admin">Administrador</a>
        </div>
      </footer>

      {/* ── Chatbot flotante ── */}
      <ChatBot />

    </div>
  )
}