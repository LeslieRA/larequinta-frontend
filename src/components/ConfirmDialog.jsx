import './ConfirmDialog.css'

export default function ConfirmDialog({ open, message, onConfirm, onCancel, accion = 'Eliminar' }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">⚠️</div>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="btn-confirm" onClick={onConfirm}>{accion}</button>
        </div>
      </div>
    </div>
  )
}