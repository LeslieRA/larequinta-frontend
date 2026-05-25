import { useState, useEffect } from 'react'
import { getServicios, crearServicio, updateServicio, deleteServicio } from '../../api/servicios.js'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import '../../components/Form.css'
import './ServiciosPage.css'

export default function ServiciosPage() {
  const [servicios,   setServicios]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [saving,      setSaving]      = useState(false)

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editando,    setEditando]    = useState(null)
  const [form,        setForm]        = useState({ nombre: '', descripcion: '' })
  const [errores,     setErrores]     = useState({})

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [elimTarget,  setElimTarget]  = useState(null)
  const [busqueda,    setBusqueda]    = useState('')

  useEffect(() => { fetchServicios() }, [])

  async function fetchServicios() {
    try {
      setLoading(true)
      const res = await getServicios()
      setServicios(res.data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre: '', descripcion: '' })
    setErrores({})
    setError(null)
    setModalOpen(true)
  }

  function abrirEditar(s) {
    setEditando(s)
    setForm({ nombre: s.nombre, descripcion: s.descripcion ?? '' })
    setErrores({})
    setError(null)
    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    setEditando(null)
    setErrores({})
  }

  function validar() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!validar() || saving) return
    try {
      setSaving(true)
      setError(null)
      const payload = {
        nombre:      form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
      }
      if (editando) {
        const res = await updateServicio(editando.idServicio, payload)
        setServicios(prev => prev.map(s =>
          s.idServicio === editando.idServicio ? res.data : s
        ))
      } else {
        const res = await crearServicio(payload)
        setServicios(prev => [...prev, res.data])
      }
      cerrarModal()
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function pedirEliminar(s) {
    setElimTarget(s)
    setConfirmOpen(true)
  }

  async function confirmarEliminar() {
    try {
      await deleteServicio(elimTarget.idServicio)
      setServicios(prev => prev.filter(s => s.idServicio !== elimTarget.idServicio))
      setConfirmOpen(false)
      setElimTarget(null)
    } catch (e) { setError(e.message) }
  }

  const filtrados = servicios.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.descripcion ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="sv-root">

      {/* Header */}
      <div className="sv-header">
        <div>
          <h1 className="sv-titulo">Servicios</h1>
          <p className="sv-subtitulo">{servicios.length} servicios registrados</p>
        </div>
        <button className="sv-btn-nuevo" onClick={abrirNuevo}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo servicio
        </button>
      </div>

      {/* Buscador */}
      <div className="sv-busq-wrap">
        <svg className="sv-busq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input className="sv-busq" type="text" placeholder="Buscar por nombre o descripción..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        {busqueda && (
          <button className="sv-busq-clear" onClick={() => setBusqueda('')}>✕</button>
        )}
      </div>

      {error && !modalOpen && (
        <div className="sv-error-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="sv-loading">
          <div className="sv-spinner"></div>
          <p>Cargando servicios...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="sv-empty">
          <div className="sv-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <p>{busqueda ? `No encontramos resultados para "${busqueda}"` : 'Aún no tienes servicios registrados'}</p>
          {!busqueda && (
            <button className="sv-btn-nuevo" onClick={abrirNuevo}>
              Crear el primer servicio
            </button>
          )}
        </div>
      ) : (
        <div className="sv-tabla-wrap">
          <table className="sv-tabla">
            <thead>
              <tr>
                <th className="sv-th sv-th-id">#</th>
                <th className="sv-th">Nombre</th>
                <th className="sv-th sv-th-desc">Descripción</th>
                <th className="sv-th sv-th-acc">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((s, idx) => (
                <tr key={s.idServicio} className="sv-tr">
                  <td className="sv-td sv-td-id">{idx + 1}</td>
                  <td className="sv-td sv-td-nombre">
                    <span className="sv-mobile-label">Nombre</span>
                    {s.nombre}
                  </td>
                  <td className="sv-td sv-td-desc">
                    <span className="sv-mobile-label">Descripción</span>
                    {s.descripcion ? (
                      <span className="sv-desc-text">{s.descripcion}</span>
                    ) : (
                      <span className="sv-sin-desc">Sin descripción</span>
                    )}
                  </td>
                  <td className="sv-td sv-td-acc">
                    <span className="sv-mobile-label">Acciones</span>
                    <div className="sv-acc-group">
                      <button className="sv-acc-btn sv-acc-editar" onClick={() => abrirEditar(s)} title="Editar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Editar
                      </button>
                      <button className="sv-acc-btn sv-acc-eliminar" onClick={() => pedirEliminar(s)} title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="sv-modal-overlay" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="sv-modal">
            <div className="sv-modal-header">
              <h2>{editando ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
              <button className="sv-modal-close" onClick={cerrarModal}>✕</button>
            </div>
            <div className="sv-modal-body">
              {error && (
                <div className="sv-error-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}
              <div className="form-field">
                <label>Nombre del servicio <span className="req">*</span></label>
                <input
                  autoFocus type="text" value={form.nombre}
                  onChange={e => {
                    setForm(f => ({ ...f, nombre: e.target.value }))
                    setErrores(err => ({ ...err, nombre: null }))
                  }}
                  placeholder="Ej: Fotografía Profesional"
                  className={errores.nombre ? 'input-error' : ''}
                  onKeyDown={e => e.key === 'Enter' && guardar()}
                />
                {errores.nombre && (
                  <p className="sv-field-error">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {errores.nombre}
                  </p>
                )}
              </div>
              <div className="form-field">
                <label>Descripción (opcional)</label>
                <textarea rows={4} value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describe detalladamente el alcance de este servicio..." />
              </div>
            </div>
            <div className="sv-modal-footer">
              <button className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>
                {saving ? (
                  <div className="sv-spinner mini"></div>
                ) : editando ? (
                  <>Guardar cambios</>
                ) : (
                  <>Crear servicio</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        message={`¿Estás seguro de que deseas eliminar el servicio "${elimTarget?.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmarEliminar}
        onCancel={() => { setConfirmOpen(false); setElimTarget(null) }}
      />
    </div>
  )
}