import { useState, useEffect } from 'react'
import { getPagosPendientes, registrarPago } from '../../api/pagos.js'
import { getPedidosHoy, cerrarPedido }       from '../../api/inventario.js'
import './CajeroPedidoPage.css'

export default function CajeroPedidoPage() {
  const [tab, setTab]                     = useState('reservaciones')
  const [reservaciones, setReservaciones] = useState([])
  const [pedidos, setPedidos]             = useState([])
  const [historial, setHistorial]         = useState([])
  const [seleccionado, setSeleccionado]   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState(null)
  const [exito, setExito]                 = useState(null)

  // Formulario de cobro
  const [registradoPor, setRegistradoPor]             = useState('')
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('')
  const [motivo, setMotivo]                           = useState('')
  const [montoRecibido, setMontoRecibido]             = useState('')
  const [errores, setErrores]                         = useState({})
  const [busqueda, setBusqueda]                       = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [resReservas, resPedidos] = await Promise.all([
        getPagosPendientes(),
        getPedidosHoy()
      ])
      const ordenadas = [...resReservas.data].sort((a, b) => b.idPago - a.idPago)
      setReservaciones(ordenadas)
      setPedidos(resPedidos.data.filter(p => p.estado === 'abierto'))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function seleccionar(item, tipo) {
    setSeleccionado({ ...item, tipo })
    setRegistradoPor('')
    setDescuentoPorcentaje('')
    setMotivo('')
    setMontoRecibido('')
    setErrores({})
    setExito(null)
    setError(null)
  }

  // Calcular monto con descuento
  const montoOriginal = seleccionado
    ? Number(seleccionado.monto ?? seleccionado.total ?? 0)
    : 0

  const descuento = descuentoPorcentaje
    ? montoOriginal * (Number(descuentoPorcentaje) / 100)
    : 0

  const montoFinal = montoOriginal - descuento

  const cambio = montoRecibido
    ? Number(montoRecibido) - montoFinal
    : 0

  function validar() {
    const e = {}
    if (!registradoPor.trim())
      e.registradoPor = 'Ingresa el nombre del cajero'
    if (descuentoPorcentaje && !motivo.trim())
      e.motivo = 'El motivo del descuento es obligatorio'
    if (descuentoPorcentaje && (
      isNaN(Number(descuentoPorcentaje)) ||
      Number(descuentoPorcentaje) < 0 ||
      Number(descuentoPorcentaje) > 100
    )) e.descuento = 'El descuento debe ser entre 0 y 100'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function cobrar() {
    if (!validar()) return
    try {
      setSaving(true)
      setError(null)

      if (seleccionado.tipo === 'reservacion') {
        await registrarPago(seleccionado.idPago, {
          registradoPor,
          notasPago: motivo || 'Pago registrado',
          descuentoPorcentaje: descuentoPorcentaje
            ? Number(descuentoPorcentaje) : 0
        })
      } else {
        await cerrarPedido(seleccionado.idPedido)
      }

      // Agregar al historial del día
      setHistorial(prev => [{
        id:     seleccionado.idPago ?? seleccionado.idPedido,
        tipo:   seleccionado.tipo,
        nombre: seleccionado.nombreCliente ?? 'Sin reservación',
        monto:  montoFinal,
        hora:   new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit', minute: '2-digit'
        }),
        cajero: registradoPor
      }, ...prev])

      setExito({
        monto:  montoFinal,
        cambio: cambio > 0 ? cambio : 0,
        nombre: seleccionado.nombreCliente ?? 'Pedido #' + seleccionado.idPedido
      })

      setSeleccionado(null)
      fetchData()
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Error al registrar el pago'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const totalHistorial = historial.reduce((sum, h) => sum + h.monto, 0)

  return (
    <div className="cj-root">

      {/* Header */}
      <header className="cj-header">
        <div className="cj-header-inner">
          <div className="cj-brand">
            <img src="/larequinta.png" alt="La Requinta" className="cj-logo" />
            <div>
              <p className="cj-brand-name">La Requinta</p>
              <p className="cj-brand-sub">Caja</p>
            </div>
          </div>
          <div className="cj-header-info">
            <span className="cj-fecha">
              📅 {new Date().toLocaleDateString('es-MX', {
                weekday: 'long', year: 'numeric',
                month: 'long', day: 'numeric'
              })}
            </span>
            <span className="cj-total-dia">
              💰 Total del día: <strong>
                ${totalHistorial.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
          <a href="/admin" className="cj-admin-link">Panel admin →</a>
        </div>
      </header>

      <div className="cj-body">

        {/* ── Panel izquierdo ── */}
        <div className="cj-panel-left">

          {/* Tabs */}
          <div className="cj-tabs">
            <button
              className={`cj-tab ${tab === 'reservaciones' ? 'active' : ''}`}
              onClick={() => setTab('reservaciones')}
            >
              📅 Reservaciones
              {reservaciones.length > 0 && (
                <span className="cj-tab-badge">{reservaciones.length}</span>
              )}
            </button>
            <button
              className={`cj-tab ${tab === 'pedidos' ? 'active' : ''}`}
              onClick={() => setTab('pedidos')}
            >
              🍽️ Pedidos
              {pedidos.length > 0 && (
                <span className="cj-tab-badge">{pedidos.length}</span>
              )}
            </button>
            <button
              className={`cj-tab ${tab === 'historial' ? 'active' : ''}`}
              onClick={() => setTab('historial')}
            >
              📋 Historial
              {historial.length > 0 && (
                <span className="cj-tab-badge cj-tab-badge-green">
                  {historial.length}
                </span>
              )}
            </button>
          </div>

          {/* Lista reservaciones */}
          {tab === 'reservaciones' && (
            <div className="cj-lista">
              {/* Buscador por código de pago */}
              <div className="cj-busq-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  className="cj-busq"
                  type="text"
                  placeholder="Buscar por código o cliente..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button className="cj-busq-clear" onClick={() => setBusqueda('')}>✕</button>
                )}
              </div>

              {loading && <p className="cj-loading">Cargando...</p>}
              {!loading && reservaciones.length === 0 && (
                <div className="cj-empty">
                  <span>✅</span>
                  <p>No hay reservaciones pendientes de pago</p>
                </div>
              )}
              {!loading && (() => {
                const filtradas = reservaciones.filter(r =>
                  !busqueda ||
                  r.codigoPago?.toLowerCase().includes(busqueda.toLowerCase()) ||
                  r.nombreCliente?.toLowerCase().includes(busqueda.toLowerCase())
                )
                if (filtradas.length === 0 && busqueda) return (
                  <div className="cj-empty">
                    <span>🔍</span>
                    <p>Sin resultados para "{busqueda}"</p>
                  </div>
                )
                return filtradas.map(r => (
                  <div
                    key={r.idPago}
                    className={`cj-item ${seleccionado?.idPago === r.idPago ? 'selected' : ''}`}
                    onClick={() => seleccionar(r, 'reservacion')}
                  >
                    <div className="cj-item-icon">📅</div>
                    <div className="cj-item-info">
                      <p className="cj-item-nombre">{r.nombreCliente}</p>
                      <p className="cj-item-sub">
                        Código: <strong style={{ color: '#de2989', fontFamily: 'monospace' }}>
                          {r.codigoPago}
                        </strong>
                      </p>
                      {r.fechaLimite && (
                        <p className="cj-item-fecha">
                          Límite: {new Date(r.fechaLimite).toLocaleDateString('es-MX')}
                        </p>
                      )}
                    </div>
                    <div className="cj-item-monto">
                      ${Number(r.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}

          {/* Lista pedidos */}
          {tab === 'pedidos' && (
            <div className="cj-lista">
              {loading && <p className="cj-loading">Cargando...</p>}
              {!loading && pedidos.length === 0 && (
                <div className="cj-empty">
                  <span>✅</span>
                  <p>No hay pedidos abiertos</p>
                </div>
              )}
              {pedidos.map(p => (
                <div
                  key={p.idPedido}
                  className={`cj-item ${seleccionado?.idPedido === p.idPedido ? 'selected' : ''}`}
                  onClick={() => seleccionar(p, 'pedido')}
                >
                  <div className="cj-item-icon">🍽️</div>
                  <div className="cj-item-info">
                    <p className="cj-item-nombre">
                      Pedido #{p.idPedido}
                      {p.nombreCliente !== 'Sin reservación' && ` — ${p.nombreCliente}`}
                    </p>
                    <p className="cj-item-sub">
                      {p.productos?.length} productos · {p.createdAt
                        ? new Date(p.createdAt).toLocaleTimeString('es-MX', {
                            hour: '2-digit', minute: '2-digit'
                          })
                        : ''}
                    </p>
                  </div>
                  <div className="cj-item-monto">
                    ${Number(p.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historial del día */}
          {tab === 'historial' && (
            <div className="cj-lista">
              {historial.length === 0 && (
                <div className="cj-empty">
                  <span>📋</span>
                  <p>Sin cobros registrados hoy</p>
                </div>
              )}
              {historial.map((h, i) => (
                <div key={i} className="cj-item cj-item-historial">
                  <div className="cj-item-icon">
                    {h.tipo === 'reservacion' ? '📅' : '🍽️'}
                  </div>
                  <div className="cj-item-info">
                    <p className="cj-item-nombre">{h.nombre}</p>
                    <p className="cj-item-sub">{h.hora} · {h.cajero}</p>
                  </div>
                  <div className="cj-item-monto cj-item-monto-ok">
                    ${Number(h.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
              {historial.length > 0 && (
                <div className="cj-historial-total">
                  <span>Total cobrado hoy</span>
                  <strong>
                    ${totalHistorial.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Panel derecho: Cobro ── */}
        <div className="cj-panel-right">

          {/* Mensaje de éxito */}
          {exito && (
            <div className="cj-exito">
              <div className="cj-exito-icon">✅</div>
              <h3>¡Cobro registrado!</h3>
              <p>{exito.nombre}</p>
              <div className="cj-exito-datos">
                <div className="cj-exito-row">
                  <span>Total cobrado</span>
                  <strong style={{ color: '#de2989', fontSize: 22 }}>
                    ${Number(exito.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                {exito.cambio > 0 && (
                  <div className="cj-exito-row">
                    <span>Cambio</span>
                    <strong style={{ color: '#2a9437', fontSize: 18 }}>
                      ${Number(exito.cambio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                )}
              </div>
              <button className="cj-btn-nuevo" onClick={() => setExito(null)}>
                Siguiente cobro →
              </button>
            </div>
          )}

          {/* Sin selección */}
          {!seleccionado && !exito && (
            <div className="cj-sin-seleccion">
              <span>💳</span>
              <p>Selecciona una reservación o pedido para cobrar</p>
            </div>
          )}

          {/* Formulario de cobro */}
          {seleccionado && !exito && (
            <div className="cj-cobro">
              <h2 className="cj-cobro-title">
                {seleccionado.tipo === 'reservacion'
                  ? `📅 ${seleccionado.nombreCliente}`
                  : `🍽️ Pedido #${seleccionado.idPedido}`}
              </h2>

              {/* Detalle pedido */}
              {seleccionado.tipo === 'pedido' && seleccionado.productos?.length > 0 && (
                <div className="cj-detalle">
                  <p className="cj-detalle-title">Productos</p>
                  {seleccionado.productos.map((p, i) => (
                    <div key={i} className="cj-detalle-row">
                      <span>{p.nombreProducto} x{p.cantidad}</span>
                      <span>${Number(p.subtotal).toLocaleString('es-MX', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Detalle reservación */}
              {seleccionado.tipo === 'reservacion' && (
                <div className="cj-detalle">
                  <div className="cj-detalle-row">
                    <span>Código de pago</span>
                    <strong style={{ color: '#de2989', letterSpacing: 1 }}>
                      {seleccionado.codigoPago}
                    </strong>
                  </div>
                </div>
              )}

              {/* Descuento */}
              <div className="cj-field">
                <label>Descuento (%)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={descuentoPorcentaje}
                    onChange={e => setDescuentoPorcentaje(e.target.value)}
                    placeholder="0"
                    className={`cj-input ${errores.descuento ? 'error' : ''}`}
                    style={{ maxWidth: 100 }}
                  />
                  {descuentoPorcentaje && (
                    <span style={{ alignSelf: 'center', fontSize: 13, color: '#2a9437' }}>
                      − ${descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                {errores.descuento && <p className="cj-error">⚠ {errores.descuento}</p>}
              </div>

              {descuentoPorcentaje && (
                <div className="cj-field">
                  <label>Motivo del descuento *</label>
                  <input
                    type="text"
                    value={motivo}
                    onChange={e => {
                      setMotivo(e.target.value)
                      setErrores(err => ({ ...err, motivo: null }))
                    }}
                    placeholder="Razón del descuento..."
                    className={`cj-input ${errores.motivo ? 'error' : ''}`}
                  />
                  {errores.motivo && <p className="cj-error">⚠ {errores.motivo}</p>}
                </div>
              )}

              {/* Total */}
              <div className="cj-total-box">
                {descuentoPorcentaje && (
                  <div className="cj-total-row">
                    <span>Subtotal</span>
                    <span style={{ textDecoration: 'line-through', color: '#b090a8' }}>
                      ${montoOriginal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {descuentoPorcentaje && (
                  <div className="cj-total-row">
                    <span>Descuento ({descuentoPorcentaje}%)</span>
                    <span style={{ color: '#2a9437' }}>
                      − ${descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="cj-total-row cj-total-final">
                  <span>Total a cobrar</span>
                  <strong>
                    ${montoFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Monto recibido */}
              <div className="cj-field">
                <label>Monto recibido</label>
                <input
                  type="number" min="0" step="0.01"
                  value={montoRecibido}
                  onChange={e => setMontoRecibido(e.target.value)}
                  placeholder={`Mín. $${montoFinal.toFixed(2)}`}
                  className="cj-input"
                />
                {montoRecibido && (
                  <p style={{
                    marginTop: 4, fontSize: 13, fontWeight: 700,
                    color: cambio >= 0 ? '#2a9437' : '#de2989'
                  }}>
                    {cambio >= 0
                      ? `Cambio: $${cambio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      : `Falta: $${Math.abs(cambio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                    }
                  </p>
                )}
              </div>

              {/* Cajero */}
              <div className="cj-field">
                <label>Cajero *</label>
                <input
                  type="text"
                  value={registradoPor}
                  onChange={e => {
                    setRegistradoPor(e.target.value)
                    setErrores(err => ({ ...err, registradoPor: null }))
                  }}
                  placeholder="Tu nombre"
                  className={`cj-input ${errores.registradoPor ? 'error' : ''}`}
                />
                {errores.registradoPor && (
                  <p className="cj-error">⚠ {errores.registradoPor}</p>
                )}
              </div>

              {error && <p className="cj-error">⚠ {error}</p>}

              <div className="cj-cobro-btns">
                <button className="cj-btn-cancelar" onClick={() => setSeleccionado(null)}>
                  Cancelar
                </button>
                <button className="cj-btn-cobrar" onClick={cobrar} disabled={saving}>
                  {saving ? 'Procesando...' : '💳 Registrar cobro'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}