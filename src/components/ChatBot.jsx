import { useState, useRef, useEffect } from 'react'
import './ChatBot.css'

const WA_NUMBER = '7472011674'

// ── Árbol de conversación ────────────────────────────────────
const FLUJO = {
  inicio: {
    bot: '¡Hola! 👋 Soy el asistente de **La Requinta**. ¿En qué puedo ayudarte?',
    opciones: [
      { label: '📅 Reservaciones',   next: 'reservaciones' },
      { label: '🎁 Paquetes',        next: 'paquetes'      },
      { label: '🍽️ Restaurante',     next: 'restaurante'   },
      { label: '📍 Ubicación',       next: 'ubicacion'     },
      { label: '🕐 Horarios',        next: 'horarios'      },
      { label: '💰 Precios',         next: 'precios'       },
    ],
  },

  reservaciones: {
    bot: '¡Con gusto! Puedes reservar directamente aquí en la página. Tenemos dos tipos de reservación:\n\n• **Salón para eventos** — Bodas, XV años, graduaciones y más\n• **Mesa en restaurante** — Para comer o cenar con familia o amigos\n\n¿Cuál te interesa?',
    opciones: [
      { label: '🏛️ Reservar el salón',       next: 'reservar_salon'      },
      { label: '🍴 Reservar mesa',            next: 'reservar_restaurante' },
      { label: '🚚 Servicio de catering',     next: 'catering'             },
      { label: '⬅️ Volver al inicio',         next: 'inicio'               },
    ],
  },

  reservar_salon: {
    bot: 'Para reservar el salón haz clic en el botón **"Hacer una reservación"** en la página principal, luego elige **"Eventos y Banquetes"**.\n\nPuedes elegir solo el espacio o con un paquete todo incluido. El sistema verifica disponibilidad en tiempo real. 🎉',
    opciones: [
      { label: '🎁 Ver paquetes disponibles', next: 'paquetes'    },
      { label: '❓ Tengo otra pregunta',      next: 'inicio'      },
      { label: '💬 Hablar con alguien',       next: 'whatsapp'    },
    ],
  },

  reservar_restaurante: {
    bot: 'Para reservar mesa haz clic en **"Hacer una reservación"** y elige **"Reservación de Mesa"**.\n\nPuedes ver nuestro menú antes de confirmar. Atendemos de **miércoles a domingo de 8:00 AM a 6:00 PM**. 🍽️',
    opciones: [
      { label: '🍳 Ver el menú',          next: 'menu'     },
      { label: '❓ Tengo otra pregunta',  next: 'inicio'   },
      { label: '💬 Hablar con alguien',   next: 'whatsapp' },
    ],
  },

  catering: {
    bot: 'Nuestro **servicio de catering** es completamente personalizado para tu evento donde tú quieras. 🚚\n\nPara darte la mejor cotización, un asesor te contactará directamente. ¿Te enviamos los detalles por WhatsApp?',
    opciones: [
      { label: '💬 Cotizar por WhatsApp', next: 'whatsapp' },
      { label: '⬅️ Volver',              next: 'inicio'   },
    ],
  },

  paquetes: {
    bot: 'Tenemos paquetes todo incluido para eventos. Cada paquete puede incluir:\n\n✅ Renta del salón\n✅ Servicio de meseros\n✅ Menú de platillos\n✅ Decoración e insumos\n✅ Servicios adicionales\n\nLos precios varían según el paquete. Puedes verlos en la sección **"Paquetes"** de esta página.',
    opciones: [
      { label: '💰 ¿Cuánto cuestan?',    next: 'precios_paquetes' },
      { label: '📅 Reservar con paquete', next: 'reservar_salon'  },
      { label: '💬 Pedir cotización',     next: 'whatsapp'        },
      { label: '⬅️ Volver al inicio',    next: 'inicio'           },
    ],
  },

  precios_paquetes: {
    bot: 'Los precios de nuestros paquetes están visibles en la sección **"Paquetes"** de la página principal. Cada card muestra el precio adicional del paquete.\n\nEl costo total depende también del espacio que elijas. Para un presupuesto personalizado, contáctanos por WhatsApp. 💬',
    opciones: [
      { label: '💬 Pedir presupuesto',   next: 'whatsapp' },
      { label: '📅 Hacer reservación',   next: 'reservaciones' },
      { label: '⬅️ Volver al inicio',    next: 'inicio'   },
    ],
  },

  restaurante: {
    bot: 'Nuestro restaurante ofrece cocina tradicional en un ambiente único. 🍽️\n\n**Horario:** Miércoles a domingo, 8:00 AM – 6:00 PM\n**Lunes y martes:** Solo eventos programados\n\nPuedes ver nuestro menú completo en la sección "Menú" de esta página.',
    opciones: [
      { label: '🍳 Ver menú',            next: 'menu'               },
      { label: '📅 Reservar una mesa',   next: 'reservar_restaurante' },
      { label: '💬 Más información',     next: 'whatsapp'           },
      { label: '⬅️ Volver al inicio',    next: 'inicio'             },
    ],
  },

  menu: {
    bot: 'Nuestro menú incluye platillos de cocina tradicional mexicana preparados con los mejores ingredientes. 🌮\n\nPuedes explorar el menú completo —dividido por categorías— en la sección **"Menú"** de esta página. ¡Hay opciones para restaurante, salón y catering!',
    opciones: [
      { label: '📅 Reservar mesa',       next: 'reservar_restaurante' },
      { label: '💬 Consultar platillos', next: 'whatsapp'             },
      { label: '⬅️ Volver al inicio',    next: 'inicio'               },
    ],
  },

  horarios: {
    bot: '**Horarios de La Requinta:**\n\n🗓️ **Miércoles a Domingo:** 8:00 AM – 6:00 PM\n📵 **Lunes y Martes:** Solo eventos programados\n\nPara reservar fuera de horario o coordinar un evento especial, contáctanos.',
    opciones: [
      { label: '📅 Hacer una reservación', next: 'reservaciones' },
      { label: '💬 Contactar',             next: 'whatsapp'      },
      { label: '⬅️ Volver al inicio',      next: 'inicio'        },
    ],
  },

  ubicacion: {
    bot: '📍 **Nos encontramos en:**\nEl Encanto, 39040 Chilpancingo de los Bravo, Gro., México\n\n📞 **Teléfono:** 747 116 2608\n\nPuedes ver nuestra ubicación exacta en el mapa al final de la página.',
    opciones: [
      { label: '🗺️ Ver en Google Maps',   wa: `https://maps.app.goo.gl/MT1JVArV9nMGe64x7` },
      { label: '💬 Escribir por WhatsApp', next: 'whatsapp'      },
      { label: '⬅️ Volver al inicio',     next: 'inicio'         },
    ],
  },

  precios: {
    bot: 'Nuestros precios dependen del tipo de servicio:\n\n🏛️ **Renta del salón** — Varía según capacidad y zona\n🎁 **Paquetes** — Precio visible en la sección Paquetes\n🍽️ **Restaurante** — Precio por platillo en el menú\n🚚 **Catering** — Cotización personalizada\n\nPara un presupuesto exacto según tu evento, escríbenos.',
    opciones: [
      { label: '💬 Pedir cotización',     next: 'whatsapp'  },
      { label: '🎁 Ver paquetes',        next: 'paquetes'   },
      { label: '⬅️ Volver al inicio',    next: 'inicio'     },
    ],
  },

  whatsapp: {
    bot: 'Te conectamos con nuestro equipo por WhatsApp. Estaremos felices de ayudarte con cualquier duda, cotización o reservación. 💬\n\n**Horario de atención:** Miércoles a domingo, 8:00 AM – 6:00 PM',
    opciones: [],
    wa: true,
  },
}

// Render texto con **negrita** markdown simple
function TextoBot({ texto }) {
  const partes = texto.split(/\*\*(.*?)\*\*/g)
  return (
    <span>
      {partes.map((p, i) =>
        i % 2 === 1 ? <strong key={i}>{p}</strong> : p
      )}
    </span>
  )
}

export default function ChatBot() {
  const [abierto,   setAbierto]   = useState(false)
  const [mensajes,  setMensajes]  = useState([])
  const [nodo,      setNodo]      = useState('inicio')
  const [animando,  setAnimando]  = useState(false)
  const [visto,     setVisto]     = useState(false)
  const bodyRef = useRef(null)

  // Mostrar mensaje inicial al abrir
  useEffect(() => {
    if (abierto && mensajes.length === 0) {
      setMensajes([{ tipo: 'bot', texto: FLUJO.inicio.bot, nodo: 'inicio' }])
    }
  }, [abierto])

  // Scroll al último mensaje
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [mensajes, animando])

  function elegirOpcion(opcion) {
    if (animando) return

    // Agregar mensaje del usuario
    const nuevosMensajes = [
      ...mensajes,
      { tipo: 'usuario', texto: opcion.label },
    ]
    setMensajes(nuevosMensajes)
    setAnimando(true)

    // Si es link externo (Google Maps)
    if (opcion.wa) {
      window.open(opcion.wa, '_blank')
      setTimeout(() => {
        setMensajes([...nuevosMensajes,
          { tipo: 'bot', texto: 'Te abrimos el mapa en una nueva pestaña. ¿Hay algo más en lo que pueda ayudarte?', nodo: 'inicio' }
        ])
        setNodo('inicio')
        setAnimando(false)
      }, 400)
      return
    }

    const siguienteNodo = opcion.next
    const siguiente = FLUJO[siguienteNodo]

    setTimeout(() => {
      setMensajes([...nuevosMensajes,
        { tipo: 'bot', texto: siguiente.bot, nodo: siguienteNodo }
      ])
      setNodo(siguienteNodo)
      setAnimando(false)
    }, 500)
  }

  function reiniciar() {
    setMensajes([{ tipo: 'bot', texto: FLUJO.inicio.bot, nodo: 'inicio' }])
    setNodo('inicio')
  }

  const nodoActual = FLUJO[nodo]

  return (
    <>
      {/* Botón flotante */}
      <button
        className={`cb-fab ${abierto ? 'abierto' : ''} ${!visto && !abierto ? 'pulse' : ''}`}
        onClick={() => { setAbierto(v => !v); setVisto(true) }}
        aria-label="Abrir chat de ayuda"
      >
        {abierto ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        )}
        {!visto && !abierto && <span className="cb-fab-badge">1</span>}
      </button>

      {/* Ventana del chat */}
      <div className={`cb-ventana ${abierto ? 'visible' : ''}`}>

        {/* Header */}
        <div className="cb-header">
          <div className="cb-header-avatar">
            <img src="/larequinta.png" alt="La Requinta" />
            <span className="cb-online-dot" />
          </div>
          <div className="cb-header-info">
            <p className="cb-header-nombre">La Requinta</p>
            <p className="cb-header-estado">En línea · Responde al instante</p>
          </div>
          <button className="cb-header-close" onClick={() => setAbierto(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Mensajes */}
        <div className="cb-body" ref={bodyRef}>
          {mensajes.map((msg, i) => (
            <div key={i} className={`cb-msg cb-msg-${msg.tipo}`}>
              {msg.tipo === 'bot' && (
                <div className="cb-msg-avatar">
                  <img src="/larequinta.png" alt="" />
                </div>
              )}
              <div className="cb-msg-burbuja">
                <TextoBot texto={msg.texto} />
              </div>
            </div>
          ))}

          {/* Indicador escribiendo */}
          {animando && (
            <div className="cb-msg cb-msg-bot">
              <div className="cb-msg-avatar">
                <img src="/larequinta.png" alt="" />
              </div>
              <div className="cb-msg-burbuja cb-escribiendo">
                <span/><span/><span/>
              </div>
            </div>
          )}

          {/* Opciones del nodo actual */}
          {!animando && nodoActual && (
            <div className="cb-opciones">
              {/* WhatsApp si el nodo lo indica */}
              {nodoActual.wa && (
                <a
                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola, me gustaría obtener información sobre sus servicios')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cb-opcion-wa"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Abrir WhatsApp
                </a>
              )}

              {/* Botones de opciones */}
              {nodoActual.opciones.map((op, i) => (
                <button key={i} className="cb-opcion" onClick={() => elegirOpcion(op)}>
                  {op.label}
                </button>
              ))}

              {/* Botón reiniciar si no es inicio */}
              {nodo !== 'inicio' && !nodoActual.wa && (
                <button className="cb-reiniciar" onClick={reiniciar}>
                  🔄 Volver al menú principal
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cb-footer">
          <span>Asistente de La Requinta</span>
        </div>
      </div>
    </>
  )
}