import { useState, useEffect } from 'react'
import './CalendarioReserva.css'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function CalendarioReserva({ fechaSeleccionada, onSelect, fechasBloqueadas = [] }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())

  function esBloqueado(fecha) {
    const d = fecha.toISOString().split('T')[0]
    return fechasBloqueadas.some(b => {
      const inicio = b.fechaInicio
      const fin    = b.fechaFin
      return d >= inicio && d <= fin
    })
  }

  function esPasado(fecha) {
    const hoyStr = hoy.toISOString().split('T')[0]
    return fecha.toISOString().split('T')[0] < hoyStr
  }

  function esSeleccionado(fecha) {
    if (!fechaSeleccionada) return false
    return fecha.toISOString().split('T')[0] === fechaSeleccionada
  }

  function handleClick(fecha) {
    if (esPasado(fecha) || esBloqueado(fecha)) return
    onSelect(fecha.toISOString().split('T')[0])
  }

  function prevMes() {
    if (mes === 0) { setMes(11); setAnio(anio - 1) }
    else setMes(mes - 1)
  }

  function nextMes() {
    if (mes === 11) { setMes(0); setAnio(anio + 1) }
    else setMes(mes + 1)
  }

  // Generar días del mes
  function getDias() {
    const primerDia = new Date(anio, mes, 1).getDay()
    const totalDias = new Date(anio, mes + 1, 0).getDate()
    const dias = []

    // Espacios vacíos al inicio
    for (let i = 0; i < primerDia; i++) {
      dias.push(null)
    }
    // Días del mes
    for (let d = 1; d <= totalDias; d++) {
      dias.push(new Date(anio, mes, d))
    }
    return dias
  }

  const dias = getDias()

  return (
    <div className="calendario">
      <div className="cal-header">
        <button className="cal-nav" onClick={prevMes}>‹</button>
        <span className="cal-titulo">{MESES[mes]} {anio}</span>
        <button className="cal-nav" onClick={nextMes}>›</button>
      </div>

      <div className="cal-grid-header">
        {DIAS.map(d => <span key={d} className="cal-dia-nombre">{d}</span>)}
      </div>

      <div className="cal-grid">
        {dias.map((fecha, i) => {
          if (!fecha) return <span key={`empty-${i}`} />

          const bloqueado   = esBloqueado(fecha)
          const pasado      = esPasado(fecha)
          const seleccionado = esSeleccionado(fecha)
          const deshabilitado = bloqueado || pasado

          return (
            <button
              key={i}
              className={[
                'cal-dia',
                deshabilitado  ? 'cal-dia-disabled'    : '',
                bloqueado      ? 'cal-dia-bloqueado'   : '',
                seleccionado   ? 'cal-dia-seleccionado': '',
                !deshabilitado ? 'cal-dia-disponible'  : '',
              ].join(' ')}
              onClick={() => handleClick(fecha)}
              disabled={deshabilitado}
              title={bloqueado ? 'Fecha no disponible' : ''}
            >
              {fecha.getDate()}
            </button>
          )
        })}
      </div>

      <div className="cal-leyenda">
        <span className="leyenda-item">
          <span className="leyenda-color disponible" /> Disponible
        </span>
        <span className="leyenda-item">
          <span className="leyenda-color bloqueado" /> No disponible
        </span>
        <span className="leyenda-item">
          <span className="leyenda-color seleccionado" /> Seleccionado
        </span>
      </div>
    </div>
  )
}