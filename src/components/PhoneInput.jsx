import { useState } from 'react'
import './PhoneInput.css'

// Ladas más comunes + México primero
const PAISES = [
  { code: 'MX', lada: '+52',  bandera: '🇲🇽', nombre: 'México'         },
  { code: 'US', lada: '+1',   bandera: '🇺🇸', nombre: 'Estados Unidos' },
  { code: 'CA', lada: '+1',   bandera: '🇨🇦', nombre: 'Canadá'         },
  { code: 'ES', lada: '+34',  bandera: '🇪🇸', nombre: 'España'         },
  { code: 'AR', lada: '+54',  bandera: '🇦🇷', nombre: 'Argentina'      },
  { code: 'CO', lada: '+57',  bandera: '🇨🇴', nombre: 'Colombia'       },
  { code: 'CL', lada: '+56',  bandera: '🇨🇱', nombre: 'Chile'          },
  { code: 'PE', lada: '+51',  bandera: '🇵🇪', nombre: 'Perú'           },
  { code: 'VE', lada: '+58',  bandera: '🇻🇪', nombre: 'Venezuela'      },
  { code: 'GT', lada: '+502', bandera: '🇬🇹', nombre: 'Guatemala'      },
  { code: 'BR', lada: '+55',  bandera: '🇧🇷', nombre: 'Brasil'         },
  { code: 'FR', lada: '+33',  bandera: '🇫🇷', nombre: 'Francia'        },
  { code: 'DE', lada: '+49',  bandera: '🇩🇪', nombre: 'Alemania'       },
  { code: 'GB', lada: '+44',  bandera: '🇬🇧', nombre: 'Reino Unido'    },
  { code: 'IT', lada: '+39',  bandera: '🇮🇹', nombre: 'Italia'         },
  { code: 'JP', lada: '+81',  bandera: '🇯🇵', nombre: 'Japón'          },
  { code: 'CN', lada: '+86',  bandera: '🇨🇳', nombre: 'China'          },
]

// Validación de número mexicano: 10 dígitos
function validarMexico(numero) {
  const limpio = numero.replace(/\D/g, '')
  if (limpio.length === 0) return null
  if (limpio.length !== 10) return 'El número mexicano debe tener 10 dígitos'
  if (!/^[1-9]/.test(limpio)) return 'El número no puede empezar con 0'
  return null
}

// Validación genérica: entre 6 y 15 dígitos
function validarGenerico(numero) {
  const limpio = numero.replace(/\D/g, '')
  if (limpio.length === 0) return null
  if (limpio.length < 6)  return 'El número es muy corto'
  if (limpio.length > 15) return 'El número es muy largo'
  return null
}

export default function PhoneInput({ value, onChange, error: externalError }) {
  const [paisSeleccionado, setPaisSeleccionado] = useState(PAISES[0])
  const [numero, setNumero]                     = useState('')
  const [touched, setTouched]                   = useState(false)
  const [dropdownOpen, setDropdownOpen]          = useState(false)
  const [busqueda, setBusqueda]                  = useState('')

  // Validación en tiempo real
  const errorLocal = touched
    ? paisSeleccionado.code === 'MX'
      ? validarMexico(numero)
      : validarGenerico(numero)
    : null

  const errorMostrar = errorLocal || externalError

  function handleNumeroChange(e) {
    // Solo permite dígitos, espacios y guiones
    const val = e.target.value.replace(/[^\d\s\-]/g, '')
    setNumero(val)
    const telefonoCompleto = `${paisSeleccionado.lada} ${val}`
    onChange(telefonoCompleto)
  }

  function handlePaisChange(pais) {
    setPaisSeleccionado(pais)
    setDropdownOpen(false)
    setBusqueda('')
    const telefonoCompleto = `${pais.lada} ${numero}`
    onChange(telefonoCompleto)
  }

  const paisesFiltrados = PAISES.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.lada.includes(busqueda)
  )

  return (
    <div className="phone-input-wrapper">
      <div className={`phone-input ${errorMostrar ? 'phone-input-error' : ''} ${touched && !errorMostrar && numero ? 'phone-input-ok' : ''}`}>

        {/* Selector de país */}
        <div className="phone-country" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <span className="phone-flag">{paisSeleccionado.bandera}</span>
          <span className="phone-lada">{paisSeleccionado.lada}</span>
          <span className="phone-arrow">▾</span>
        </div>

        <div className="phone-divider" />

        {/* Input del número */}
        <input
          type="tel"
          value={numero}
          onChange={handleNumeroChange}
          onBlur={() => setTouched(true)}
          placeholder={paisSeleccionado.code === 'MX' ? '55 1234 5678' : 'Número de teléfono'}
          className="phone-number-input"
        />

        {/* Icono de estado */}
        {touched && numero && (
          <span className="phone-status">
            {errorMostrar ? '✕' : '✓'}
          </span>
        )}
      </div>

      {/* Mensaje de error inline */}
      {errorMostrar && (
        <p className="phone-error-msg">⚠ {errorMostrar}</p>
      )}

      {/* Hint para México */}
      {!errorMostrar && touched && numero && paisSeleccionado.code === 'MX' && (
        <p className="phone-hint-msg">✓ Número válido</p>
      )}

      {/* Dropdown de países */}
      {dropdownOpen && (
        <div className="phone-dropdown">
          <div className="phone-search-wrap">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar país o lada..."
              className="phone-search"
              autoFocus
            />
          </div>
          <div className="phone-list">
            {paisesFiltrados.map(p => (
              <button
                key={p.code}
                className={`phone-option ${p.code === paisSeleccionado.code ? 'selected' : ''}`}
                onClick={() => handlePaisChange(p)}
                type="button"
              >
                <span>{p.bandera}</span>
                <span className="phone-option-nombre">{p.nombre}</span>
                <span className="phone-option-lada">{p.lada}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}