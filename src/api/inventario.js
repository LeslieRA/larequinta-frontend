import api from './axios'

// Productos
export const getProductos     = ()        => api.get('/inventario/productos')
export const getProducto      = (id)      => api.get(`/inventario/productos/${id}`)
export const crearProducto    = (data)    => api.post('/inventario/productos', data)
export const actualizarProducto = (id, data) => api.put(`/inventario/productos/${id}`, data)
export const eliminarProducto = (id)      => api.delete(`/inventario/productos/${id}`)
export const ajustarStock     = (id, data) => api.patch(`/inventario/productos/${id}/stock`, data)
export const suspenderProducto = (id) => api.patch(`/inventario/productos/${id}/suspender`)

// Pedidos
export const getPedidosHoy      = ()   => api.get('/inventario/pedidos/hoy')
export const getPedidosAbiertos = ()   => api.get('/inventario/pedidos/abiertos')
export const getPedido          = (id) => api.get(`/inventario/pedidos/${id}`)
export const crearPedido        = (data) => api.post('/inventario/pedidos', data)
export const cerrarPedido       = (id) => api.patch(`/inventario/pedidos/${id}/cerrar`)
export const cancelarPedido     = (id) => api.patch(`/inventario/pedidos/${id}/cancelar`)

// Alertas
export const getAlertas       = ()   => api.get('/inventario/alertas')
export const countAlertas     = ()   => api.get('/inventario/alertas/count')
export const marcarLeida      = (id) => api.patch(`/inventario/alertas/${id}/leer`)
export const marcarTodasLeidas = ()  => api.patch('/inventario/alertas/leer-todas')

