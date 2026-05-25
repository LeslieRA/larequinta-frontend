import api from './axios'

export const getMenu       = ()         => api.get('/menu')
export const getMenuById   = (id)       => api.get(`/menu/${id}`)
export const getMenuByTipo = (tipo)     => api.get(`/menu/tipo/${tipo}`)
export const createMenu    = (data)     => api.post('/menu', data)
export const updateMenu    = (id, data) => api.put(`/menu/${id}`, data)
export const deleteMenu    = (id)       => api.delete(`/menu/${id}`)