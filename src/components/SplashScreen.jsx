import { useEffect, useState } from 'react'
import './SplashScreen.css'

export default function SplashScreen({ onFinish }) {
  const [fase, setFase] = useState('entrada') // entrada → visible → salida

  useEffect(() => {
    const t1 = setTimeout(() => setFase('visible'), 100)
    const t2 = setTimeout(() => setFase('salida'), 2200)
    const t3 = setTimeout(() => onFinish(), 2900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className={`splash ${fase}`}>
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <img src="/larequinta.png" alt="La Requinta" className="splash-logo" />
        </div>
        <div className="splash-text">
          <h1 className="splash-nombre">La Requinta</h1>
          <p className="splash-sub">Restaurante & Eventos</p>
        </div>
        <div className="splash-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}