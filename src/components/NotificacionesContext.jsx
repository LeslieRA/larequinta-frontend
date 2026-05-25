import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { countAlertas, getAlertas, marcarLeida, marcarTodasLeidas } from '../api/inventario'
import {
  getNotificacionesReservacion, countNotificacionesReservacion,
  leerNotificacionReservacion, leerTodasReservacion
} from '../api/notificaciones'

const Ctx = createContext(null)

export function NotificacionesProvider({ children }) {
  // Stock
  const [alertasStock, setAlertasStock]     = useState([])
  const [countStock, setCountStock]         = useState(0)

  // Reservaciones
  const [notifReservas, setNotifReservas]   = useState([])
  const [countReservas, setCountReservas]   = useState(0)

  // Toasts
  const [toasts, setToasts]                 = useState([])
  const [historial, setHistorial]           = useState([])

  // Paneles
  const [panelStockOpen, setPanelStockOpen]       = useState(false)
  const [panelReservasOpen, setPanelReservasOpen] = useState(false)

  // ── Compatibilidad con código anterior ──────────────────
  const panelOpen    = panelStockOpen
  const setPanelOpen = setPanelStockOpen
  const count        = countStock
  const alertas      = alertasStock

  const fetchAlertas = useCallback(async () => {
    try {
      const [resCount, resAlertas] = await Promise.all([
        countAlertas(), getAlertas()
      ])
      const nuevasAlertas = resAlertas.data
      const nuevoCount    = resCount.data.count

      if (nuevoCount > countStock && countStock > 0) {
        nuevasAlertas.slice(0, nuevoCount - countStock)
          .forEach(a => mostrarToast(a, 'stock'))
      }

      setCountStock(nuevoCount)
      setAlertasStock(nuevasAlertas)
    } catch { /* silencioso */ }
  }, [countStock])

  const fetchNotifReservas = useCallback(async () => {
    try {
      const [resCount, resNotif] = await Promise.all([
        countNotificacionesReservacion(),
        getNotificacionesReservacion()
      ])
      const nuevas     = resNotif.data
      const nuevoCount = resCount.data.count

      if (nuevoCount > countReservas && countReservas > 0) {
        nuevas.slice(0, nuevoCount - countReservas)
          .forEach(n => mostrarToast(n, 'reservacion'))
      }

      setCountReservas(nuevoCount)
      setNotifReservas(nuevas)
    } catch { /* silencioso */ }
  }, [countReservas])

  useEffect(() => {
    fetchAlertas()
    fetchNotifReservas()
    const i1 = setInterval(fetchAlertas, 30000)
    const i2 = setInterval(fetchNotifReservas, 15000)
    return () => { clearInterval(i1); clearInterval(i2) }
  }, [])

  function mostrarToast(item, tipoOrigen) {
    const id    = Date.now() + Math.random()
    const toast = { id, tipoOrigen, ...item }
    setToasts(prev => [toast, ...prev])
    setHistorial(prev => [toast, ...prev.slice(0, 49)])
    setTimeout(() => cerrarToast(id), 6000)
  }

  function cerrarToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Stock
  async function leerAlerta(idAlerta) {
    await marcarLeida(idAlerta)
    setAlertasStock(prev => prev.filter(a => a.idAlerta !== idAlerta))
    setCountStock(prev => Math.max(0, prev - 1))
  }

  async function leerTodas() {
    await marcarTodasLeidas()
    setAlertasStock([])
    setCountStock(0)
  }

  // Reservaciones
  async function leerNotifReserva(idNotificacion) {
    await leerNotificacionReservacion(idNotificacion)
    setNotifReservas(prev => prev.filter(n => n.idNotificacion !== idNotificacion))
    setCountReservas(prev => Math.max(0, prev - 1))
  }

  async function leerTodasReservas() {
    await leerTodasReservacion()
    setNotifReservas([])
    setCountReservas(0)
  }

  return (
    <Ctx.Provider value={{
      // Stock
      alertas: alertasStock, count: countStock,
      panelOpen, setPanelOpen,
      leerAlerta, leerTodas, fetchAlertas,
      // Reservaciones
      notifReservas, countReservas,
      panelReservasOpen, setPanelReservasOpen,
      leerNotifReserva, leerTodasReservas, fetchNotifReservas,
      // Toasts compartidos
      toasts, historial, cerrarToast,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useNotificaciones = () => useContext(Ctx)