import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import '../../components/Form.css'
import { getConfiguracion, updateConfiguracion } from '../../api/configuracion.js'

export default function ConfiguracionPage() {
  const [config, setConfig]   = useState({ duracionMinimaHoras: 4, minimaPersonasSalon: 10 })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getConfiguracion()
      .then(r => setConfig(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    try {
      setSaving(true)
      await updateConfiguracion({
        duracionMinimaHoras: Number(config.duracionMinimaHoras),
        minimaPersonasSalon: Number(config.minimaPersonasSalon),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-soft)' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 500 }}>
      <PageHeader
        title="Configuración"
        subtitle="Parámetros generales del sistema"
      />

      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius-lg)',
        padding: 28, boxShadow: 'var(--shadow)',
        border: '1px solid var(--cream-dk)'
      }}>
        <div className="form-grid">

          <div className="form-field form-field-full">
            <label>Duración mínima de eventos (horas)</label>
            <input
              type="number" min="1" max="24"
              value={config.duracionMinimaHoras}
              onChange={e => setConfig({ ...config, duracionMinimaHoras: e.target.value })}
            />
            <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4 }}>
              Los clientes no podrán reservar por menos de este tiempo
            </p>
          </div>

          <div className="form-field form-field-full">
            <label>Mínimo de personas para salón</label>
            <input
              type="number" min="1"
              value={config.minimaPersonasSalon}
              onChange={e => setConfig({ ...config, minimaPersonasSalon: e.target.value })}
            />
            <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4 }}>
              Si el cliente ingresa menos personas, se redirige a restaurante
            </p>
          </div>

         <div className="form-actions">
          {saved && (
            <span style={{ color: 'var(--green)', fontSize: 13, marginRight: 'auto' }}>
              ✓ Configuración guardada
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 42,
              padding: '0 24px',
              background: saving ? '#ccc' : 'linear-gradient(135deg, #de2989, #c01870)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              boxShadow: saving ? 'none' : '0 4px 12px rgba(222,41,137,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {saving ? 'Guardando...' : '💾 Guardar cambios'}
          </button>
        </div>

        </div>
      </div>
    </div>
  )
}