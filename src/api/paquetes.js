import api from './axios'

export const getPaquetes    = ()         => api.get('/paquetes')
export const getPaqueteById = (id)       => api.get(`/paquetes/${id}`)
export const createPaquete  = (data)     => api.post('/paquetes', data)
export const updatePaquete  = (id, data) => api.put(`/paquetes/${id}`, data)
export const deletePaquete  = (id)       => api.delete(`/paquetes/${id}`)