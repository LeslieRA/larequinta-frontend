import api from './axios'

export const getNotificacionesReservacion  = ()   => api.get('/notificaciones-reservacion')
export const countNotificacionesReservacion = ()  => api.get('/notificaciones-reservacion/count')
export const leerNotificacionReservacion   = (id) => api.patch(`/notificaciones-reservacion/${id}/leer`)
export const leerTodasReservacion          = ()   => api.patch('/notificaciones-reservacion/leer-todas')