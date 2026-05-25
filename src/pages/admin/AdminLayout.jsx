import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import './AdminLayout.css'
import NotificacionesToast from '../../components/NotificacionesToast.jsx'
import { useNotificaciones } from '../../components/NotificacionesContext.jsx'
import NotificacionesPanel from '../../components/NotificacionesPanel.jsx'
import NotificacionesPanelReservas from '../../components/NotificacionesPanelReservas.jsx'
import { eliminarToken } from '../../api/auth.js'

const NAV = [
  { to: '/admin',                     label: 'Dashboard',         icon: '◈', end: true },
  { to: '/admin/reservaciones',        label: 'Reservaciones',     icon: '📅'           },
  { to: '/admin/clientes',             label: 'Clientes',          icon: '👤'           },
  { to: '/admin/zonas',                label: 'Zonas',             icon: '📍'           },
  { to: '/admin/rangos',               label: 'Rangos',            icon: '👥'           },
  { to: '/admin/categorias',           label: 'Categorías Menú',   icon: '🏷️'           },
  { to: '/admin/menu',                 label: 'Menú',              icon: '🍳'           },
  { to: '/admin/cat-insumos',          label: 'Categ. Insumos',    icon: '🗂️'           },
  { to: '/admin/insumos',              label: 'Insumos',           icon: '🎀'           },
  { to: '/admin/paquetes',             label: 'Paquetes',          icon: '🎁'           },
  { to: '/admin/servicios',            label: 'Servicios',         icon: '🛒'           },
  { to: '/admin/inventario/productos', label: 'Inventario',         icon: '📦'           },
  { to: '/admin/fechas-bloqueadas',    label: 'Fechas Bloqueadas', icon: '🚫'           },
  { to: '/admin/configuracion',        label: 'Configuración',     icon: '⚙️'           },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed]     = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const navigate    = useNavigate()

  const {
    count, panelOpen, setPanelOpen,
    countReservas, panelReservasOpen, setPanelReservasOpen
  } = useNotificaciones()

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('lr_user') ?? '{}') }
    catch { return {} }
  })()

  // Cerrar el menú de usuario al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function cerrarSesion() {
    eliminarToken()
    navigate('/login')
  }

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>

      {/* Overlay móvil */}
      {!collapsed && (
        <div className="sidebar-overlay" onClick={() => setCollapsed(true)} />
      )}

      <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>

        {/* Toggle */}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? '→' : '←'}
        </button>

        {/* Brand */}
        <div className="sidebar-brand">
          <img src="/larequinta.png" alt="La Requinta" className="sidebar-logo-img" />
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">La Requinta</span>
              <span className="brand-sub">Administración</span>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="sidebar-notif-area">
          <button
            className={`notif-btn ${count > 0 ? 'tiene-alertas' : ''}`}
            onClick={() => setPanelOpen(!panelOpen)}
            title="Alertas de stock"
          >
            <div className="notif-icono-wrap">
              <span className="notif-icono">🔔</span>
              {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
            </div>
            {!collapsed && (
              <span className="notif-label">
                Alertas de stock
                {count > 0 && <span className="notif-label-count"> ({count})</span>}
              </span>
            )}
          </button>

          <button
            className={`notif-btn notif-btn-reservas ${countReservas > 0 ? 'tiene-alertas-reservas' : ''}`}
            onClick={() => setPanelReservasOpen(!panelReservasOpen)}
            title="Notificaciones de reservaciones"
          >
            <div className="notif-icono-wrap">
              <span className="notif-icono">📅</span>
              {countReservas > 0 && (
                <span className="notif-badge notif-badge-verde">
                  {countReservas > 9 ? '9+' : countReservas}
                </span>
              )}
            </div>
            {!collapsed && (
              <span className="notif-label">
                Reservaciones
                {countReservas > 0 && (
                  <span className="notif-label-count-verde"> ({countReservas})</span>
                )}
              </span>
            )}
          </button>
        </div>

        {/* Divider */}
        {!collapsed && (
          <div className="sidebar-ornament">
            <span /><span className="ornament-diamond">◆</span><span />
          </div>
        )}

        {/* Nav (Área interna con Scrollbar independiente) */}
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              title={collapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Accesos del personal */}
        <div className="sidebar-personal">
          {!collapsed && <p className="sidebar-personal-title">Accesos del personal</p>}
          <Link to="/mesero" className="sidebar-personal-btn mesero" title="Vista del mesero">
            <span className="nav-icon">🍽️</span>
            {!collapsed && <span className="nav-label">Mesero</span>}
          </Link>
          <Link to="/cajero" className="sidebar-personal-btn cajero" title="Vista del cajero">
            <span className="nav-icon">💳</span>
            {!collapsed && <span className="nav-label">Cajero</span>}
          </Link>
        </div>

        {panelOpen && <NotificacionesPanel />}
        {panelReservasOpen && <NotificacionesPanelReservas />}

        {/* Avatar de usuario con menú flotante */}
        <div className="sidebar-user-area" ref={userMenuRef}>
          <button
            className="sidebar-user-btn"
            onClick={() => setUserMenuOpen(v => !v)}
            title={collapsed ? `${user.username ?? 'Admin'} — opciones` : 'Opciones de cuenta'}
          >
            <div className="sidebar-user-avatar">
              {(user.username ?? 'A')[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.username ?? 'Admin'}</span>
                <span className="sidebar-user-rol">{user.rol ?? 'ADMIN'}</span>
              </div>
            )}
            {!collapsed && (
              <span className={`sidebar-user-chevron ${userMenuOpen ? 'open' : ''}`}>
                ‹
              </span>
            )}
          </button>

          {/* Menú flotante */}
          {userMenuOpen && (
            <div className="sidebar-user-menu">
              <div className="sidebar-user-menu-header">
                <span className="sidebar-user-menu-name">{user.username ?? 'Admin'}</span>
                <span className="sidebar-user-menu-rol">{user.rol ?? 'ADMIN'}</span>
              </div>
              <div className="sidebar-user-menu-divider" />
              <button className="sidebar-user-menu-item" onClick={cerrarSesion}>
                <span>🚪</span>
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>

      </aside>

      <main className="admin-main">
        <Outlet />
      </main>

      <NotificacionesToast />
    </div>
  )
}