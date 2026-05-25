import api from './axios'
 
export const getServicios    = ()         => api.get('/servicios')
export const crearServicio   = (data)     => api.post('/servicios', data)
export const updateServicio  = (id, data) => api.put(`/servicios/${id}`, data)
export const deleteServicio  = (id)       => api.delete(`/servicios/${id}`)
 