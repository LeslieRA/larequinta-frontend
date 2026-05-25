import api from './axios'

export const getRangos           = ()         => api.get('/rangos')
export const getRangosParaPersonas = (n)      => api.get(`/rangos/para/${n}`)
export const crearRango          = (data)     => api.post('/rangos', data)
export const actualizarRango     = (id, data) => api.put(`/rangos/${id}`, data)
export const eliminarRango       = (id)       => api.delete(`/rangos/${id}`)