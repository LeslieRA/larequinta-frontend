import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, guardarToken } from '../../api/auth.js'
import './LoginPage.css'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Ingresa usuario y contraseña')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const res = await login({ username: username.trim(), password })
      guardarToken(res.data.token)
      localStorage.setItem('lr_user', JSON.stringify({
        username: res.data.username,
        rol:      res.data.rol,
      }))
      navigate('/admin')
    } catch (ex) {
      setError(ex.response?.data?.message ?? 'Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-root">
      <div className="lp-card">

        <div className="lp-brand">
          <img src="/larequinta.png" alt="La Requinta" className="lp-logo" />
          <h1 className="lp-nombre">La Requinta</h1>
          <p className="lp-sub">Panel de administración</p>
        </div>

        <form className="lp-form" onSubmit={handleLogin}>
          <div className="lp-field">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(null) }}
              placeholder="admin"
              autoComplete="username"
              autoFocus
              className={error ? 'err' : ''}
            />
          </div>

          <div className="lp-field">
            <label>Contraseña</label>
            <div className="lp-pwd-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={error ? 'err' : ''}
              />
              <button
                type="button"
                className="lp-pwd-toggle"
                onClick={() => setShowPwd(v => !v)}
                tabIndex={-1}
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div className="lp-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="lp-btn"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
        </form>

        <a href="/" className="lp-back">← Volver al sitio</a>
      </div>
    </div>
  )
}