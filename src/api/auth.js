import api from './axios'

export const login  = (data) => api.post('/auth/login', data)
export const getMe  = ()     => api.get('/auth/me')

// ── Helpers de token ─────────────────────────────────────
export function guardarToken(token) {
  localStorage.setItem('lr_token', token)
}

export function obtenerToken() {
  return localStorage.getItem('lr_token')
}

export function eliminarToken() {
  localStorage.removeItem('lr_token')
  localStorage.removeItem('lr_user')
}

export function estaAutenticado() {
  return !!obtenerToken()
}