import './SearchBar.css'

export default function SearchBar({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="search-bar">
      {/* Ícono SVG más elegante */}
      <span className="search-icon">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="#b090a8" strokeWidth="1.5"/>
          <path d="M10.5 10.5L13.5 13.5" stroke="#b090a8" strokeWidth="1.5"
            strokeLinecap="round"/>
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')}>✕</button>
      )}
    </div>
  )
}