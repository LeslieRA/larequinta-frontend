import api from './axios'

export const getPagoByCodigo      = (codigo) => api.get(`/pagos/codigo/${codigo}`)
export const getPagoByReservacion = (id)     => api.get(`/pagos/reservacion/${id}`)
//export const registrarPago        = (data)   => api.put('/pagos/pagar', data)
export const getPagosVencidos     = ()       => api.get('/pagos/vencidos')


export const getPagosPendientes = () => api.get('/pagos/pendientes')
export const registrarPago      = (id, data) => api.patch(`/pagos/${id}/registrar`, data)