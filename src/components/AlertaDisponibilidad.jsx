import './AlertaDisponibilidad.css'

export default function AlertaDisponibilidad({ disponibilidad, onSeleccionarZona, onSeleccionarHora }) {
  if (!disponibilidad) return null
  if (disponibilidad.disponible) {
    return (
      <div className="alerta alerta-ok">
        ✅ {disponibilidad.mensaje}
      </div>
    )
  }

  return (
    <div className="alerta alerta-error">
      <div className="alerta-header">
        😔 {disponibilidad.mensaje}
      </div>

      {disponibilidad.horariosLibres?.length > 0 && (
        <div className="alerta-sugerencias">
          <p>⏰ <strong>Horarios disponibles en esta zona:</strong></p>
          <div className="sugerencias-list">
            {disponibilidad.horariosLibres.map((h, i) => (
              <button
                key={i}
                className="sugerencia-btn"
                onClick={() => onSeleccionarHora && onSeleccionarHora(h)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {disponibilidad.sugerencias?.length > 0 && (
        <div className="alerta-sugerencias">
          <p>📍 <strong>Otras zonas disponibles ese día:</strong></p>
          <div className="sugerencias-list">
            {disponibilidad.sugerencias.map(z => (
              <button
                key={z.idZona}
                className="sugerencia-btn"
                onClick={() => onSeleccionarZona && onSeleccionarZona(z)}
              >
                {z.nombre} — cap. {z.capacidad}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}