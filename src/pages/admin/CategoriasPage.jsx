import { useState, useEffect } from 'react'
import PageHeader    from '../../components/PageHeader.jsx'
import SearchBar     from '../../components/SearchBar.jsx'
import DataTable     from '../../components/DataTable.jsx'
import Modal         from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import Toast         from '../../components/Toast.jsx'
import '../../components/Form.css'
import { useToast }  from '../../hooks/useToast.js'
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../../api/categoriaMenu.js'

const COLUMNS = [
  { key: 'idCategoria', label: 'ID'          },
  { key: 'nombre',      label: 'Nombre'      },
  { key: 'descripcion', label: 'Descripción' },
]

const EMPTY = { nombre: '', descripcion: '' }

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([])
  const [filtered, setFiltered]     = useState([])
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)

  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete]       = useState(null)

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => { fetchCategorias() }, [])

  async function fetchCategorias() {
    try {
      setLoading(true)
      const res = await getCategorias()
      setCategorias(res.data)
      setFiltered(res.data)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(categorias.filter(c => c.nombre.toLowerCase().includes(q)))
  }, [search, categorias])

  function handleNew() {
    setEditing(null)
    setForm(EMPTY)
    setFormError(null)
    setModalOpen(true)
  }

  function handleEdit(cat) {
    setEditing(cat)
    setForm({ nombre: cat.nombre, descripcion: cat.descripcion ?? '' })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return setFormError('El nombre es obligatorio')
    try {
      setSaving(true)
      setFormError(null)
      if (editing) {
        await updateCategoria(editing.idCategoria, form)
      } else {
        await createCategoria(form)
      }
      setModalOpen(false)
      showToast(editing ? 'Categoría actualizada' : 'Categoría creada', 'success')
      fetchCategorias()
    } catch (e) {
      setFormError(e.message)
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(cat) {
    setToDelete(cat)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    try {
      await deleteCategoria(toDelete.idCategoria)
      setConfirmOpen(false)
      setToDelete(null)
      showToast('Categoría eliminada', 'success')
      fetchCategorias()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Categorías de Menú" subtitle="Agrupa los platillos por tipo" onNew={handleNew} />
      <SearchBar value={search} onChange={setSearch} placeholder="Buscar categoría..." />
      <DataTable columns={COLUMNS} data={filtered} onEdit={handleEdit} onDelete={handleDelete} loading={loading} />

      <Modal open={modalOpen} title={editing ? 'Editar Categoría' : 'Nueva Categoría'} onClose={() => setModalOpen(false)}>
        <div className="form-grid">
          <div className="form-field form-field-full">
            <label>Nombre *</label>
            <input type="text" value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Entradas, Postres..." />
          </div>
          <div className="form-field form-field-full">
            <label>Descripción</label>
            <textarea value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción opcional..." rows={3} />
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        message={`¿Desactivar "${toDelete?.nombre}"? Podrá reactivarse desde la base de datos.`}
        accion="Desactivar"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}