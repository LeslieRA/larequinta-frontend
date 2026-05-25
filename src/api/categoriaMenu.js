import api from './axios'

export const getCategorias    = ()         => api.get('/categorias-menu')
export const getCategoriaById = (id)       => api.get(`/categorias-menu/${id}`)
export const createCategoria  = (data)     => api.post('/categorias-menu', data)
export const updateCategoria  = (id, data) => api.put(`/categorias-menu/${id}`, data)
export const deleteCategoria  = (id)       => api.delete(`/categorias-menu/${id}`)