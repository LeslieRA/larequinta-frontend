import api from './axios'

export const getFechasBloqueadas  = ()     => api.get('/fechas-bloqueadas')
export const createFechaBloqueada = (data) => api.post('/fechas-bloqueadas', data)
export const deleteFechaBloqueada = (id)   => api.delete(`/fechas-bloqueadas/${id}`)