import api from './axios'

export const getReservaciones      = ()        => api.get('/reservaciones')
export const getReservacionById    = (id)      => api.get(`/reservaciones/${id}`)
export const getReservacionCliente = (id)      => api.get(`/reservaciones/cliente/${id}`)
export const crearSalon            = (data)    => api.post('/reservaciones/salon', data)
export const crearCatering         = (data)    => api.post('/reservaciones/catering', data)
export const crearRestaurante      = (data)    => api.post('/reservaciones/restaurante', data)
export const cambiarEstado         = (id, est) => api.patch(`/reservaciones/${id}/estado?estado=${est}`)
export const autorizarReservacion = (id, data) =>
  api.patch(`/reservaciones/${id}/autorizar`, data)
export const getModificaciones = (id) =>
  api.get(`/reservaciones/${id}/modificaciones`)
export const getReservacionesAbiertas = () =>
  api.get('/reservaciones?estado=pendiente')

export const getReservacionesCalendario = () => api.get('/reservaciones/calendario')