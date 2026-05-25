import api from './axios'

export const getInsumos    = ()         => api.get('/insumos')
export const getInsumoById = (id)       => api.get(`/insumos/${id}`)
export const createInsumo  = (data)     => api.post('/insumos', data)
export const updateInsumo  = (id, data) => api.put(`/insumos/${id}`, data)
export const deleteInsumo  = (id)       => api.delete(`/insumos/${id}`)