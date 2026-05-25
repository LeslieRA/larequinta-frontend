import { useNotificaciones } from './NotificacionesContext.jsx'
import './NotificacionesToast.css'

export default function NotificacionesToast() {
  const { toasts, cerrarToast } = useNotificaciones()

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id}
          className={`toast-item ${toast.tipoOrigen === 'reservacion' ? 'toast-reservacion' : ''}`}
        >
          <div className="toast-icon">
            {toast.tipoOrigen === 'reservacion' ? '📅' : '⚠️'}
          </div>
          <div className="toast-body">
            <p className="toast-titulo">
              {toast.tipoOrigen === 'reservacion'
                ? (toast.tipo === 'nueva'       ? '🆕 Nueva reservación'
                  : toast.tipo === 'pagada'     ? '✅ Pago confirmado'
                  : '⏰ Evento próximo')
                : `Stock bajo — ${toast.nombreProducto}`}
            </p>
            <p className="toast-msg">{toast.mensaje}</p>
          </div>
          <button className="toast-close" onClick={() => cerrarToast(toast.id)}>✕</button>
          <div className={`toast-progress ${toast.tipoOrigen === 'reservacion' ? 'verde' : ''}`} />
        </div>
      ))}
    </div>
  )
}