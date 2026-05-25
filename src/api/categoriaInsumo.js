import api from './axios'

export const getCategoriasInsumo    = ()         => api.get('/categorias-insumo')
export const getCategoriaInsumoById = (id)       => api.get(`/categorias-insumo/${id}`)
export const createCategoriaInsumo  = (data)     => api.post('/categorias-insumo', data)
export const updateCategoriaInsumo  = (id, data) => api.put(`/categorias-insumo/${id}`, data)
export const deleteCategoriaInsumo  = (id)       => api.delete(`/categorias-insumo/${id}`)