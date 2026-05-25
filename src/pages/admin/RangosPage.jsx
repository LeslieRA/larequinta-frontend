import { useState, useEffect } from 'react'
import PageHeader    from '../../components/PageHeader.jsx'
import DataTable     from '../../components/DataTable.jsx'
import Modal         from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import '../../components/Form.css'
import '../../components/FilterBar.css'
import { getRangos, crearRango, actualizarRango, eliminarRango } from '../../api/rangos.js'
import { getZonas } from '../../api/zonas.js'

const FORM_EMPTY = {
  nombre: '', personasMin: '', personasMax: '',
  precio: '', activo: true, idZonas: []
}

export default function RangosPage() {
  const [rangos,      setRangos]      = useState([])
  const [zonas,       setZonas]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editando,    setEditando]    = useState(null)
  const [form,        setForm]        = useState(FORM_EMPTY)
  const [errores,     setErrores]     = useState({})
  const [saving,      setSaving]      = useState(false)
  const [elimTarget,  setElimTarget]  = useState(null)

  useEffect(() => {
    fetchRangos()
    getZonas().then(r => setZonas(r.data.filter(z => z.tipo === 'evento' && z.activo)))
      .catch(() => {})
  }, [])

  async function fetchRangos() {
    try {
      setLoading(true)
      const res = await getRangos()
      setRangos(res.data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_EMPTY)
    setErrores({})
    setModalOpen(true)
  }

  function abrirEditar(r) {
    setEditando(r)
    setForm({
      nombre:     r.nombre,
      personasMin: String(r.personasMin),
      personasMax: String(r.personasMax),
      precio:     String(r.precio),
      activo:     r.activo,
      idZonas:    r.zonas?.map(z => z.idZona) ?? []
    })
    setErrores({})
    setModalOpen(true)
  }

  function toggleZona(idZona) {
    setForm(f => ({
      ...f,
      idZonas: f.idZonas.includes(idZona)
        ? f.idZonas.filter(id => id !== idZona)
        : [...f.idZonas, idZona]
    }))
  }

  function validar() {
    const e = {}
    if (!form.nombre.trim())       e.nombre     = 'El nombre es obligatorio'
    if (!form.personasMin)         e.personasMin = 'Indica el mínimo de personas'
    if (!form.personasMax)         e.personasMax = 'Indica el máximo de personas'
    if (Number(form.personasMin) >= Number(form.personasMax))
                                   e.personasMax = 'El máximo debe ser mayor al mínimo'
    if (!form.precio)              e.precio      = 'El precio es obligatorio'
    if (form.idZonas.length === 0) e.zonas       = 'Selecciona al menos una zona'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!validar()) return
    try {
      setSaving(true)
      const payload = {
        nombre:      form.nombre,
        personasMin: Number(form.personasMin),
        personasMax: Number(form.personasMax),
        precio:      Number(form.precio),
        activo:      form.activo,
        idZonas:     form.idZonas,
      }
      if (editando) await actualizarRango(editando.idRango, payload)
      else          await crearRango(payload)
      setModalOpen(false)
      fetchRangos()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function confirmarEliminar() {
    try {
      await eliminarRango(elimTarget.idRango)
      setConfirmOpen(false)
      fetchRangos()
    } catch (e) { setError(e.message) }
  }

  const COLUMNS = [
    { key: 'idRango', label: 'ID' },
    { key: 'nombre',  label: 'Rango' },
    {
      key: 'personasMin', label: 'Personas',
      render: (v, row) => (
        <span style={{ fontWeight: 600 }}>
          {v} — {row.personasMax}
        </span>
      )
    },
    {
      key: 'precio', label: 'Precio',
      render: v => (
        <span style={{ fontWeight: 700, color: '#de2989', fontSize: 15 }}>
          ${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'zonas', label: 'Zonas asignadas',
      render: v => (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {v?.map(z => (
            <span key={z.idZona} style={{
              background: '#fdf0f8', color: '#de2989',
              fontSize: 11, fontWeight: 600,
              padding: '2px 8px', borderRadius: 20,
              border: '1px solid rgba(222,41,137,0.2)'
            }}>
              {z.nombre}
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'activo', label: 'Estado',
      render: v => (
        <span style={{
          background: v ? '#e8f5e9' : '#fdecea',
          color:      v ? '#2a9437' : '#c62828',
          fontSize: 11, fontWeight: 700,
          padding: '3px 10px', borderRadius: 20,
          border: `1px solid ${v ? '#a5d6a7' : '#ef9a9a'}`
        }}>
          {v ? '✓ Activo' : '✕ Inactivo'}
        </span>
      )
    },
  ]

  if (error) return <div style={{ color: 'var(--danger)', padding: 24 }}>{error}</div>

  return (
    <div>
      <PageHeader
        title="Rangos de personas"
        subtitle="Define los rangos de capacidad y precios para las reservaciones de salón"
        onNew={abrirNuevo}
        btnLabel="+ Nuevo rango"
      />

      {/* Info visual de rangos */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12, marginBottom: 24
      }}>
        {rangos.map(r => (
          <div key={r.idRango} style={{
            background: 'white', borderRadius: 12, padding: '16px 18px',
            border: '1px solid #f0e8f0',
            boxShadow: '0 2px 8px rgba(74,32,64,0.05)'
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 1, color: '#b090a8', marginBottom: 6 }}>
              {r.personasMin} — {r.personasMax} personas
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a0812', marginBottom: 4 }}>
              {r.nombre}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#de2989', marginBottom: 8 }}>
              ${Number(r.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {r.zonas?.map(z => (
                <span key={z.idZona} style={{
                  background: '#fdf5fb', color: '#9a7090',
                  fontSize: 11, padding: '2px 8px', borderRadius: 20,
                  border: '1px solid #eddde8'
                }}>
                  📍 {z.nombre}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <DataTable
        columns={COLUMNS}
        data={rangos}
        onEdit={abrirEditar}
        onDelete={r => { setElimTarget(r); setConfirmOpen(true) }}
        loading={loading}
      />

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editando ? 'Editar rango' : 'Nuevo rango'}
        onClose={() => setModalOpen(false)}
      >
        <div className="form-grid">

          <div className="form-field form-field-full">
            <label>Nombre del rango *</label>
            <input type="text" value={form.nombre}
              onChange={e => { setForm({ ...form, nombre: e.target.value }); setErrores(err => ({ ...err, nombre: null })) }}
              placeholder="Ej: Terraza hasta 40 personas"
              className={errores.nombre ? 'input-error' : ''} />
            {errores.nombre && <p className="wizard-field-error">⚠ {errores.nombre}</p>}
          </div>

          <div className="form-field">
            <label>Mínimo de personas *</label>
            <input type="number" min="1" value={form.personasMin}
              onChange={e => { setForm({ ...form, personasMin: e.target.value }); setErrores(err => ({ ...err, personasMin: null })) }}
              placeholder="Ej: 1"
              className={errores.personasMin ? 'input-error' : ''} />
            {errores.personasMin && <p className="wizard-field-error">⚠ {errores.personasMin}</p>}
          </div>

          <div className="form-field">
            <label>Máximo de personas *</label>
            <input type="number" min="1" value={form.personasMax}
              onChange={e => { setForm({ ...form, personasMax: e.target.value }); setErrores(err => ({ ...err, personasMax: null })) }}
              placeholder="Ej: 40"
              className={errores.personasMax ? 'input-error' : ''} />
            {errores.personasMax && <p className="wizard-field-error">⚠ {errores.personasMax}</p>}
          </div>

          <div className="form-field form-field-full">
            <label>Precio fijo del rango *</label>
            <input type="number" min="0" step="0.01" value={form.precio}
              onChange={e => { setForm({ ...form, precio: e.target.value }); setErrores(err => ({ ...err, precio: null })) }}
              placeholder="Ej: 5000.00"
              className={errores.precio ? 'input-error' : ''} />
            {errores.precio && <p className="wizard-field-error">⚠ {errores.precio}</p>}
          </div>

          <div className="form-field form-field-full">
            <label>Zonas asignadas a este rango *</label>
            <p style={{ fontSize: 12, color: '#b090a8', marginBottom: 10 }}>
              Selecciona las zonas que se habilitarán para este rango de personas
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {zonas.map(z => (
                <label key={z.idZona} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: form.idZonas.includes(z.idZona) ? '#fce8f3' : 'white',
                  border: `1.5px solid ${form.idZonas.includes(z.idZona) ? '#de2989' : '#eddde8'}`,
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  userSelect: 'none'
                }}>
                  <input type="checkbox"
                    checked={form.idZonas.includes(z.idZona)}
                    onChange={() => { toggleZona(z.idZona); setErrores(err => ({ ...err, zonas: null })) }}
                    style={{ width: 16, height: 16, accentColor: '#de2989', cursor: 'pointer' }} />
                  {z.imagen && (
                    <img src={z.imagen} alt={z.nombre}
                      style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: '#1a0812' }}>{z.nombre}</p>
                    <p style={{ fontSize: 11.5, color: '#b090a8' }}>
                      Cap. {z.capacidad} personas
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {errores.zonas && <p className="wizard-field-error">⚠ {errores.zonas}</p>}
          </div>

          <div className="form-field form-field-full">
            <label>Estado</label>
            <select value={form.activo}
              onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>

          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardar} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        message={`¿Desactivar el rango "${elimTarget?.nombre}"?`}
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}