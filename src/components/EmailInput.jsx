import { useState, useRef } from 'react'
import { buscarClientePorCorreo } from '../api/clientes.js'   // ← usa tu instancia axios
import './EmailInput.css'

function validarCorreo(email) {
  if (!email) return null
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!regex.test(email)) return 'El correo no tiene un formato válido'
  return null
}

export default function EmailInput({
  value,
  onChange,
  onClienteEncontrado,  // callback({ nombre, telefono, correo, notas }) | null
  placeholder = 'correo@ejemplo.com',
  className = '',
}) {
  const [touched,       setTouched]       = useState(false)
  const [buscando,      setBuscando]      = useState(false)
  const [clienteEstado, setClienteEstado] = useState(null) // 'encontrado' | 'no_encontrado' | null
  const debounceRef = useRef(null)

  const formatError   = touched ? validarCorreo(value) : null
  const isValidFormat = value && !validarCorreo(value)  // valida sin depender de touched

  function handleChange(newValue) {
    onChange(newValue)
    setClienteEstado(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!validarCorreo(newValue) && newValue) {
      debounceRef.current = setTimeout(async () => {
        setBuscando(true)
        try {
          // res.data es { encontrado, nombre, telefono, correo, notas }
          // o           { encontrado: false }
          const { data } = await buscarClientePorCorreo(newValue)

          if (data.encontrado) {
            setClienteEstado('encontrado')
            onClienteEncontrado?.({
              nombre:   data.nombre   ?? '',
              telefono: data.telefono ?? '',
              correo:   data.correo   ?? newValue,
              notas:    data.notas    ?? '',
            })
          } else {
            setClienteEstado('no_encontrado')
            onClienteEncontrado?.(null)
          }
        } catch {
          // Error de red u otro — no bloqueamos al usuario
          setClienteEstado(null)
          onClienteEncontrado?.(null)
        } finally {
          setBuscando(false)
        }
      }, 600)
    }
  }

  return (
    <div className="email-wrapper">
      <div className={[
        'email-input-box',
        formatError              ? 'email-error' : '',
        isValidFormat && !buscando && clienteEstado === 'encontrado'    ? 'email-ok'  : '',
        isValidFormat && !buscando && clienteEstado === 'no_encontrado' ? 'email-new' : '',
        className
      ].filter(Boolean).join(' ')}>
        <input
          type="email"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          className="email-input"
        />
        <span className="email-status">
          {buscando && (
            <svg className="email-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          )}
          {!buscando && touched && value && (formatError ? '✕' : '✓')}
        </span>
      </div>

      {/* Mensajes de estado */}
      {formatError && (
        <p className="email-error-msg">⚠ {formatError}</p>
      )}
      {!formatError && isValidFormat && buscando && (
        <p className="email-searching-msg">Buscando tu cuenta...</p>
      )}
      {!formatError && isValidFormat && !buscando && clienteEstado === 'encontrado' && (
        <p className="email-ok-msg">✓ Cliente encontrado — datos completados automáticamente</p>
      )}
      {!formatError && isValidFormat && !buscando && clienteEstado === 'no_encontrado' && (
        <p className="email-new-msg">ℹ Correo nuevo — completa tus datos</p>
      )}
    </div>
  )
}

