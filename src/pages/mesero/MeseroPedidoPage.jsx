import { useState, useEffect } from 'react'
import { getProductos }    from '../../api/inventario.js'
import { crearPedido }     from '../../api/inventario.js'
import { getReservaciones } from '../../api/reservaciones.js'
import './MeseroPedidoPage.css'

export default function MeseroPedidoPage() {
  const [productos, setProductos]       = useState([])
  const [reservaciones, setReservaciones] = useState([])
  const [carrito, setCarrito]           = useState([])
  const [search, setSearch]             = useState('')
  const [idReservacion, setIdReservacion] = useState('')
  const [notas, setNotas]               = useState('')
  const [usuario, setUsuario]           = useState('')
  const [saving, setSaving]             = useState(false)
  const [pedidoCreado, setPedidoCreado] = useState(null)
  const [error, setError]               = useState(null)
  const [errores, setErrores]           = useState({})
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [categorias, setCategorias]     = useState([])

  useEffect(() => {
    getProductos().then(r => {
      const prods = r.data.filter(p => p.stockActual > 0)
      setProductos(prods)
      // Extraer categorías únicas
      const cats = [...new Set(prods
        .filter(p => p.nombreCategoria)
        .map(p => p.nombreCategoria))]
      setCategorias(cats)
    }).catch(() => {})

    getReservaciones().then(r => {
      setReservaciones(r.data.filter(r =>
        r.estado === 'pendiente' || r.estado === 'confirmada'
      ))
    }).catch(() => {})
  }, [])

  const productosFiltrados = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase())
    const matchCat    = filtroCategoria === 'todos' || p.nombreCategoria === filtroCategoria
    return matchSearch && matchCat
  })

  function agregarAlCarrito(producto) {
    const existe = carrito.find(c => c.idProducto === producto.idProducto)
    if (existe) {
      setCarrito(carrito.map(c =>
        c.idProducto === producto.idProducto
          ? { ...c, cantidad: c.cantidad + 1 }
          : c
      ))
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }])
    }
  }

  function setCantidad(idProducto, cantidad) {
    if (cantidad <= 0) {
      setCarrito(carrito.filter(c => c.idProducto !== idProducto))
    } else {
      setCarrito(carrito.map(c =>
        c.idProducto === idProducto ? { ...c, cantidad } : c
      ))
    }
  }

  function quitarDelCarrito(idProducto) {
    setCarrito(carrito.filter(c => c.idProducto !== idProducto))
  }

  const total = carrito.reduce((sum, c) =>
    sum + Number(c.precioUnitario) * c.cantidad, 0)

  function validar() {
    const e = {}
    if (carrito.length === 0)
      e.carrito = 'Agrega al menos un producto al pedido'
    if (!usuario.trim())
      e.usuario = 'Ingresa el nombre del mesero'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function confirmarPedido() {
    if (!validar()) return
    try {
      setSaving(true)
      setError(null)
      const res = await crearPedido({
        idReservacion: idReservacion ? Number(idReservacion) : null,
        notas,
        usuario,
        productos: carrito.map(c => ({
          idProducto: c.idProducto,
          cantidad:   c.cantidad
        }))
      })
      setPedidoCreado(res.data)
      setCarrito([])
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Error al crear el pedido'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  function nuevoPedido() {
    setPedidoCreado(null)
    setCarrito([])
    setIdReservacion('')
    setNotas('')
    setErrores({})
    setError(null)
  }

  // ── Pantalla de éxito ────────────────────────────────────
  if (pedidoCreado) return (
    <div className="mp-root">
      <div className="mp-success">
        <div className="mp-success-icon">✅</div>
        <h2>¡Pedido registrado!</h2>
        <p>El stock fue descontado automáticamente</p>

        <div className="mp-success-card">
          <div className="mp-success-row">
            <span>Folio</span>
            <strong>#{pedidoCreado.idPedido}</strong>
          </div>
          <div className="mp-success-row">
            <span>Total</span>
            <strong style={{ color: '#de2989' }}>
              ${Number(pedidoCreado.total).toLocaleString('es-MX', {
                minimumFractionDigits: 2
              })}
            </strong>
          </div>
          {pedidoCreado.nombreCliente !== 'Sin reservación' && (
            <div className="mp-success-row">
              <span>Cliente</span>
              <strong>{pedidoCreado.nombreCliente}</strong>
            </div>
          )}
          <div className="mp-success-row">
            <span>Productos</span>
            <strong>{pedidoCreado.productos?.length} artículos</strong>
          </div>
        </div>

        <div className="mp-success-productos">
          {pedidoCreado.productos?.map(p => (
            <div key={p.idProducto} className="mp-success-item">
              <span>{p.nombreProducto} x{p.cantidad}</span>
              <span>${Number(p.subtotal).toLocaleString('es-MX', {
                minimumFractionDigits: 2
              })}</span>
            </div>
          ))}
        </div>

        <button className="mp-btn-nuevo" onClick={nuevoPedido}>
          + Nuevo pedido
        </button>
      </div>
    </div>
  )

  return (
    <div className="mp-root">

      {/* ── Header ── */}
      <header className="mp-header">
        <div className="mp-header-inner">
          <div className="mp-header-brand">
            <img src="/larequinta.png" alt="La Requinta" className="mp-logo" />
            <div>
              <p className="mp-brand-name">La Requinta</p>
              <p className="mp-brand-sub">Punto de venta</p>
            </div>
          </div>
          <a href="/admin" className="mp-admin-link">Panel admin →</a>
        </div>
      </header>

      <div className="mp-body">

        {/* ── Panel izquierdo: Productos ── */}
        <div className="mp-productos">

          {/* Búsqueda y filtros */}
          <div className="mp-search-bar">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar producto..."
              className="mp-search-input"
            />
          </div>

          {/* Filtro categorías */}
          <div className="mp-cats">
            <button
              className={`mp-cat-btn ${filtroCategoria === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroCategoria('todos')}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat}
                className={`mp-cat-btn ${filtroCategoria === cat ? 'active' : ''}`}
                onClick={() => setFiltroCategoria(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid de productos */}
          <div className="mp-grid">
            {productosFiltrados.map(p => {
              const enCarrito = carrito.find(c => c.idProducto === p.idProducto)
              const stockBajo = p.stockActual <= p.stockMinimo

              return (
                <button
                  key={p.idProducto}
                  className={`mp-producto-card ${enCarrito ? 'en-carrito' : ''} ${stockBajo ? 'stock-bajo' : ''}`}
                  onClick={() => agregarAlCarrito(p)}
                >
                  <div className="mp-prod-img">
                    {p.imagen
                      ? <img src={p.imagen} alt={p.nombre} />
                      : <span>📦</span>
                    }
                  </div>
                  <div className="mp-prod-info">
                    <p className="mp-prod-nombre">{p.nombre}</p>
                    <p className="mp-prod-precio">
                      ${Number(p.precioUnitario).toLocaleString('es-MX', {
                        minimumFractionDigits: 2
                      })}
                    </p>
                    <p className={`mp-prod-stock ${stockBajo ? 'bajo' : ''}`}>
                      {stockBajo ? '⚠' : '✓'} {Number(p.stockActual).toLocaleString('es-MX')} {p.unidad}
                    </p>
                  </div>
                  {enCarrito && (
                    <div className="mp-prod-badge">{enCarrito.cantidad}</div>
                  )}
                </button>
              )
            })}

            {productosFiltrados.length === 0 && (
              <div className="mp-empty">
                <span>📦</span>
                <p>Sin productos disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho: Carrito ── */}
        <div className="mp-carrito">
          <h2 className="mp-carrito-title">🛒 Pedido actual</h2>

          {/* Reservación opcional */}
          <div className="mp-field">
            <label>Asociar a reservación (opcional)</label>
            <select
              value={idReservacion}
              onChange={e => setIdReservacion(e.target.value)}
              className="mp-select"
            >
              <option value="">Sin reservación — pedido libre</option>
              {reservaciones.map(r => (
                <option key={r.idReservacion} value={r.idReservacion}>
                  #{r.idReservacion} — {r.nombreCliente} ({r.fecha})
                </option>
              ))}
            </select>
          </div>

          {/* Mesero */}
          <div className="mp-field">
            <label>Mesero *</label>
            <input
              type="text"
              value={usuario}
              onChange={e => {
                setUsuario(e.target.value)
                setErrores(err => ({ ...err, usuario: null }))
              }}
              placeholder="Tu nombre"
              className={`mp-input ${errores.usuario ? 'error' : ''}`}
            />
            {errores.usuario && (
              <p className="mp-error">⚠ {errores.usuario}</p>
            )}
          </div>

          {/* Notas */}
          <div className="mp-field">
            <label>Notas</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones del pedido..."
              className="mp-textarea"
              rows={2}
            />
          </div>

          {/* Lista del carrito */}
          <div className="mp-carrito-lista">
            {carrito.length === 0 ? (
              <div className="mp-carrito-empty">
                <span>🛒</span>
                <p>El carrito está vacío</p>
                <p style={{ fontSize: 12 }}>Selecciona productos del panel izquierdo</p>
              </div>
            ) : (
              carrito.map(c => (
                <div key={c.idProducto} className="mp-carrito-item">
                  <div className="mp-ci-info">
                    <p className="mp-ci-nombre">{c.nombre}</p>
                    <p className="mp-ci-precio">
                      ${Number(c.precioUnitario).toLocaleString('es-MX', {
                        minimumFractionDigits: 2
                      })} / {c.unidad}
                    </p>
                  </div>
                  <div className="mp-ci-controles">
                    <button onClick={() => setCantidad(c.idProducto, c.cantidad - 1)}>−</button>
                    <span>{c.cantidad}</span>
                    <button onClick={() => setCantidad(c.idProducto, c.cantidad + 1)}>+</button>
                  </div>
                  <div className="mp-ci-subtotal">
                    ${Number(Number(c.precioUnitario) * c.cantidad).toLocaleString('es-MX', {
                      minimumFractionDigits: 2
                    })}
                  </div>
                  <button className="mp-ci-quitar" onClick={() => quitarDelCarrito(c.idProducto)}>
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {errores.carrito && (
            <p className="mp-error">⚠ {errores.carrito}</p>
          )}

          {/* Total y confirmar */}
          <div className="mp-carrito-footer">
            <div className="mp-total">
              <span>Total</span>
              <strong>${Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
            </div>

            {error && <p className="mp-error" style={{ marginBottom: 10 }}>⚠ {error}</p>}

            <button
              className="mp-btn-confirmar"
              onClick={confirmarPedido}
              disabled={saving || carrito.length === 0}
            >
              {saving ? 'Registrando...' : '✓ Confirmar pedido'}
            </button>

            {carrito.length > 0 && (
              <button className="mp-btn-limpiar" onClick={() => setCarrito([])}>
                Limpiar carrito
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}