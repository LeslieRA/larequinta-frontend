import './PageHeader.css'

export default function PageHeader({ title, subtitle, onNew, btnLabel = '+ Nuevo' }) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {onNew && (
        <button className="page-header-btn" onClick={onNew}>
          {btnLabel}
        </button>
      )}
    </div>
  )
}