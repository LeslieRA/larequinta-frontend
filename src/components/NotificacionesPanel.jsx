import { useNotificaciones } from './NotificacionesContext.jsx'
import './NotificacionesPanel.css'

export default function NotificacionesPanel() {
  const { alertas, historial, leerAlerta, leerTodas, setPanelOpen } = useNotificaciones()

  return (
    <>
      <div className="np-overlay" onClick={() => setPanelOpen(false)} />
      <div className="np-panel">
        <div className="np-header">
          <div>
            <h3 className="np-title">🔔 Alertas de stock</h3>
            <p className="np-sub">{alertas.length} sin leer</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {alertas.length > 0 && (
              <button className="np-btn-leer" onClick={leerTodas}>
                Marcar todas leídas
              </button>
            )}
            <button className="np-close" onClick={() => setPanelOpen(false)}>✕</button>
          </div>
        </div>

        <div className="np-list">
          {alertas.length === 0 && historial.length === 0 && (
            <div className="np-empty">
              <span>✅</span>
              <p>Todo el stock está bien</p>
            </div>
          )}

          {alertas.length > 0 && (
            <>
              <p className="np-section-label">Sin leer</p>
              {alertas.map(a => (
                <div key={a.idAlerta} className="np-item np-item-unread">
                  <div className="np-item-dot" />
                  <div className="np-item-body">
                    <p className="np-item-nombre">{a.nombreProducto}</p>
                    <p className="np-item-msg">{a.mensaje}</p>
                    <p className="np-item-fecha">
                      {new Date(a.fecha).toLocaleTimeString('es-MX', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <button className="np-item-close" onClick={() => leerAlerta(a.idAlerta)}>
                    ✓
                  </button>
                </div>
              ))}
            </>
          )}

          {historial.length > 0 && (
            <>
              <p className="np-section-label" style={{ marginTop: 12 }}>Historial reciente</p>
              {historial.slice(0, 10).map(h => (
                <div key={h.id} className="np-item">
                  <div className="np-item-body">
                    <p className="np-item-nombre" style={{ color: '#9a7090' }}>{h.nombreProducto}</p>
                    <p className="np-item-msg">{h.mensaje}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}