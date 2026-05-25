import { useState, useEffect } from 'react'
import PageHeader    from '../../components/PageHeader.jsx'
import SearchBar     from '../../components/SearchBar.jsx'
import DataTable     from '../../components/DataTable.jsx'
import Modal         from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import Badge         from '../../components/Badge.jsx'
import Toast         from '../../components/Toast.jsx'
import '../../components/Form.css'
import '../../components/FilterBar.css'
import { useToast }  from '../../hooks/useToast.js'
import { getInsumos, createInsumo, updateInsumo, deleteInsumo } from '../../api/insumos.js'
import { getCategoriasInsumo } from '../../api/categoriaInsumo.js'
import ImageUpload from '../../components/ImageUpload.jsx'


const COLUMNS = [
  { key: 'idInsumo',        label: 'ID'          },
  { key: 'imagen',          label: 'Foto',
    render: v => v
      ? <img src={v} alt="insumo"
              style={{ width: 48, height: 48, objectFit: 'cover',
                       borderRadius: 8, border: '1px solid var(--cream-dk)' }} />
      : <span style={{ fontSize: 24 }}>🎀</span>
  },
  { key: 'nombreCategoria', label: 'Categoría'   },
  { key: 'nombre',          label: 'Nombre'      },
  { key: 'unidad',          label: 'Unidad'      },
  { key: 'precioUnitario',  label: 'Precio',
    render: v => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
]

const EMPTY = { idCatInsumo: '', nombre: '', unidad: '', precioUnitario: '0', descripcion: '',imagen: '' }

export default function InsumosPage() {
  const [insumos, setInsumos]       = useState([])
  const [filtered, setFiltered]     = useState([])
  const [categorias, setCategorias] = useState([])
  const [search, setSearch]         = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [loading, setLoading]       = useState(true)

  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete]       = useState(null)

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    fetchInsumos()
    getCategoriasInsumo().then(r => setCategorias(r.data)).catch(() => {})
  }, [])

  async function fetchInsumos() {
    try {
      setLoading(true)
      const res = await getInsumos()
      setInsumos(res.data)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(insumos.filter(i => {
      const matchSearch = i.nombre.toLowerCase().includes(q) ||
                          i.nombreCategoria?.toLowerCase().includes(q)
      const matchCat    = filtroCategoria === 'todos' ||
                          String(i.idCatInsumo) === filtroCategoria
      return matchSearch && matchCat
    }))
  }, [search, filtroCategoria, insumos])

  function handleNew() {
    setEditing(null)
    setForm(EMPTY)
    setFormError(null)
    setModalOpen(true)
  }

  function handleEdit(insumo) {
    setEditing(insumo)
    setForm({
      idCatInsumo:    insumo.idCatInsumo,
      nombre:         insumo.nombre,
      unidad:         insumo.unidad ?? '',
      precioUnitario: insumo.precioUnitario,
      descripcion:    insumo.descripcion ?? '',
      imagen: insumo.imagen ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.idCatInsumo)   return setFormError('La categoría es obligatoria')
    if (!form.nombre.trim()) return setFormError('El nombre es obligatorio')
    try {
      setSaving(true)
      setFormError(null)
      const payload = {
        ...form,
        idCatInsumo:    Number(form.idCatInsumo),
        precioUnitario: Number(form.precioUnitario),
        imagen: form.imagen,
      }
      if (editing) {
        await updateInsumo(editing.idInsumo, payload)
      } else {
        await createInsumo(payload)
      }
      setModalOpen(false)
      showToast(editing ? 'Insumo actualizado' : 'Insumo creado', 'success')
      fetchInsumos()
    } catch (e) {
      setFormError(e.message)
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(insumo) {
    setToDelete(insumo)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    try {
      await deleteInsumo(toDelete.idInsumo)
      setConfirmOpen(false)
      setToDelete(null)
      showToast('Insumo eliminado', 'success')
      fetchInsumos()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Insumos" subtitle="Decoración, equipo y materiales para eventos" onNew={handleNew} />

      <div className="filter-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar insumo o categoría..." />
        <select className="filter-select" value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="todos">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.idCatInsumo} value={c.idCatInsumo}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <DataTable columns={COLUMNS} data={filtered} onEdit={handleEdit} onDelete={handleDelete} loading={loading} />

      <Modal open={modalOpen} title={editing ? 'Editar Insumo' : 'Nuevo Insumo'} onClose={() => setModalOpen(false)}>
        <div className="form-grid">
          <div className="form-field form-field-full">
            <label>Categoría *</label>
            <select value={form.idCatInsumo}
              onChange={e => setForm({ ...form, idCatInsumo: e.target.value })}>
              <option value="">Selecciona una categoría</option>
              {categorias.map(c => (
                <option key={c.idCatInsumo} value={c.idCatInsumo}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-field form-field-full">
            <label>Nombre *</label>
            <input type="text" value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Globos dorados..." />
          </div>
          <div className="form-field">
            <label>Unidad</label>
            <input type="text" value={form.unidad}
              onChange={e => setForm({ ...form, unidad: e.target.value })}
              placeholder="pieza, metro, caja..." />
          </div>
          <div className="form-field">
            <label>Precio unitario</label>
            <input type="number" min="0" step="0.01" value={form.precioUnitario}
              onChange={e => setForm({ ...form, precioUnitario: e.target.value })} />
          </div>
          <div className="form-field form-field-full">
            <label>Descripción</label>
            <textarea value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              rows={3} />
          </div>
          <div className="form-field form-field-full">
            <ImageUpload
              value={form.imagen}
              onChange={url => setForm({ ...form, imagen: url })}
              label="Imagen del insumo"
            />
          </div>


          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear insumo'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        message={`¿Eliminar el insumo "${toDelete?.nombre}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <Toast message={toast.message} type={toast.type} onClose={hideToast} />
    </div>
  )
}