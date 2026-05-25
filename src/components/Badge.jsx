import './Badge.css'

const COLORS = {
  activo:       'green',
  inactivo:     'gray',
  disponible:   'green',
  agotado:      'red',
  evento:       'rose',
  restaurante:  'gold',
  pendiente:    'orange',
  confirmada:   'green',
  cancelada:    'red',
  cerrada:      'gray',
  pagado:       'green',
  vencido:      'red',
  Salon:        'rose',
  Catering:     'gold',
}

export default function Badge({ value }) {
  const color = COLORS[value] ?? 'gray'
  return <span className={`badge badge-${color}`}>{value}</span>
}