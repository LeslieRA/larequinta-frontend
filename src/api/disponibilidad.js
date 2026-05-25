import api from './axios'

export const verificarDisponibilidadZona = (idZona, fecha, horaInicio, duracionHoras) =>
  api.get('/disponibilidad/zona', {
    params: { idZona, fecha, horaInicio, duracionHoras }
  })

export const getZonasPorDia = (fecha) =>
api.get(`/disponibilidad/zonas-dia?fecha=${fecha}`)