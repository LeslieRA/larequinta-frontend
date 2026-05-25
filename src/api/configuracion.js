import api from './axios'

export const getConfiguracion    = ()     => api.get('/configuracion')
export const updateConfiguracion = (data) => api.put('/configuracion', data)