import { useState, useEffect } from 'react'
import PageHeader    from '../../components/PageHeader.jsx'
import SearchBar     from '../../components/SearchBar.jsx'
import DataTable     from '../../components/DataTable.jsx'
import Modal         from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import Badge         from '../../components/Badge.jsx'
import Toast         from '../../components/Toast.jsx'
import '../../components/Form.css'
import { useToast }  from '../../hooks/useToast.js'
import { getZonas, createZona, updateZona, deleteZona } from '../../api/zonas.js'
import ImageUpload from '../../components/ImageUpload.jsx'

const COLUMNS = [
  { key: 'idZona',      label: 'ID'      },
  { key: 'imagen',      label: 'Foto',
    render: v => v
      ? <img src={v} alt="zona"
              style={{ width: 48, height: 48, objectFit: 'cover',
                       borderRadius: 8, border: '1px solid var(--cream-dk)' }} />
      : <span style={{ fontSize: 24 }}>📍</span>
  },
  { key: 'nombre',      label: 'Nombre'  },
  { key: 'tipo',        label: 'Tipo',    render: v => <Badge value={v} /> },
  { key: 'capacidad',   label: 'Cap.'    },
  { key: 'precioRenta', label: 'Renta',
    render: v => `$${Number(v).toLocaleString('es-MX')}` },
  { key: 'activo',      label: 'Estado',
    render: v => <Badge value={v ? 'activo' : 'inactivo'} /> },
]

const EMPTY = {
  nombre: '', tipo: 'evento', capacidad: '',
  precioRenta: '0', descripcion: '', activo: true, imagen: ''
}

export default function ZonasPage() {
  const [zonas, setZonas]         = useState([])
  const [filtered, setFiltered]   = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete]       = useState(null)

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => { fetchZonas() }, [])

  async function fetchZonas() {
    try {
      setLoading(true)
      const res = await getZonas()
      setZonas(res.data)
      setFiltered(res.data)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(zonas.filter(z =>
      z.nombre.toLowerCase().includes(q) ||
      z.tipo.toLowerCase().includes(q)
    ))
  }, [search, zonas])

  function handleNew() {
    setEditing(null)
    setForm(EMPTY)
    setFormError(null)
    setModalOpen(true)
  }

  function handleEdit(zona) {
    setEditing(zona)
    setForm({
      nombre:      zona.nombre,
      tipo:        zona.tipo,
      capacidad:   zona.capacidad,
      precioRenta: zona.precioRenta,
      descripcion: zona.descripcion ?? '',
      activo:      zona.activo,
      imagen: zona.imagen ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return setFormError('El nombre es obligatorio')
    if (!form.capacidad)     return setFormError('La capacidad es obligatoria')

    try {
      setSaving(true)
      setFormError(null)
      const payload = {
        ...form,
        capacidad:   Number(form.capacidad),
        precioRenta: form.tipo === 'restaurante' ? 0 : Number(form.precioRenta),
      }
      if (editing) {
        await updateZona(editing.idZona, payload)
      } else {
        await createZona(payload)
      }
      setModalOpen(false)
      showToast(editing ? 'Zona actualizada' : 'Zona creada', 'success')
      fetchZonas()
    } catch (e) {
      setFormError(e.message)
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(zona) {
    setToDelete(zona)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    try {
      await deleteZona(toDelete.idZona)
      setConfirmOpen(false)
      setToDelete(null)
      showToast('Zona eliminada', 'success')
      fetchZonas()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Zonas"
        subtitle="Espacios disponibles para eventos y restaurante"
        onNew={handleNew}
      />
      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o tipo..." />
      <DataTable columns={COLUMNS} data={filtered} onEdit={handleEdit} onDelete={handleDelete} loading={loading} />

      <Modal open={modalOpen} title={editing ? 'Editar Zona' : 'Nueva Zona'} onClose={() => setModalOpen(false)}>
        <div className="form-grid">
          <div className="form-field form-field-full">
            <label>Nombre *</label>
            <input type="text" value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Salón Principal" />
          </div>
          <div className="form-field">
            <label>Tipo *</label>
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              <option value="evento">Evento</option>
              <option value="restaurante">Restaurante</option>
            </select>
          </div>
          <div className="form-field">
            <label>Capacidad *</label>
            <input type="number" min="1" value={form.capacidad}
              onChange={e => setForm({ ...form, capacidad: e.target.value })}
              placeholder="Ej: 80" />
          </div>
          {form.tipo === 'evento' && (
            <div className="form-field">
              <label>Precio de Renta</label>
              <input type="number" min="0" value={form.precioRenta}
                onChange={e => setForm({ ...form, precioRenta: e.target.value })}
                placeholder="Ej: 6865" />
            </div>
          )}
          <div className="form-field form-field-full">
            <label>Descripción</label>
            <textarea value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción del espacio..." rows={3} />
          </div>
          <div className="form-field">
            <label>Estado</label>
            <select value={form.activo}
              onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
            <div className="form-field form-field-full">
              <ImageUpload
                value={form.imagen}
                onChange={url => setForm({ ...form, imagen: url })}
                label="Imagen de la zona"
              />
            </div>

          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear zona'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        message={`¿Eliminar la zona "${toDelete?.nombre}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <Toast message={toast.message} type={toast.type} onClose={hideToast} />
    </div>
  )
}