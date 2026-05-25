import { useNotificaciones } from './NotificacionesContext.jsx'
import './NotificacionesPanel.css'

const TIPO_CONFIG = {
  nueva:       { icon: '🆕', label: 'Nueva reservación',  color: '#196792' },
  pagada:      { icon: '✅', label: 'Pago confirmado',     color: '#2a9437' },
  proximaFecha:{ icon: '⏰', label: 'Evento mañana',       color: '#e06a0c' },
}

export default function NotificacionesPanelReservas() {
  const {
    notifReservas, leerNotifReserva,
    leerTodasReservas, setPanelReservasOpen
  } = useNotificaciones()

  return (
    <>
      <div className="np-overlay" onClick={() => setPanelReservasOpen(false)} />
      <div className="np-panel">
        <div className="np-header">
          <div>
            <h3 className="np-title">📅 Notificaciones de reservaciones</h3>
            <p className="np-sub">{notifReservas.length} sin leer</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {notifReservas.length > 0 && (
              <button className="np-btn-leer" onClick={leerTodasReservas}>
                Marcar todas leídas
              </button>
            )}
            <button className="np-close" onClick={() => setPanelReservasOpen(false)}>✕</button>
          </div>
        </div>

        <div className="np-list">
          {notifReservas.length === 0 ? (
            <div className="np-empty">
              <span>✅</span>
              <p>Sin notificaciones pendientes</p>
            </div>
          ) : (
            <>
              <p className="np-section-label">Sin leer</p>
              {notifReservas.map(n => {
                const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.nueva
                return (
                  <div key={n.idNotificacion} className="np-item np-item-unread">
                    <div className="np-item-dot"
                      style={{ background: cfg.color }} />
                    <div className="np-item-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{cfg.icon}</span>
                        <p className="np-item-nombre">{cfg.label}</p>
                      </div>
                      <p className="np-item-msg">{n.mensaje}</p>
                      <p className="np-item-fecha">
                        {new Date(n.fecha).toLocaleString('es-MX', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button className="np-item-close"
                      onClick={() => leerNotifReserva(n.idNotificacion)}>
                      ✓
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </>
  )
}