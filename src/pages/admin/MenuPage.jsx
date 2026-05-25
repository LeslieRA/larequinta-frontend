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
import { getMenu, createMenu, updateMenu, deleteMenu } from '../../api/menu.js'
import { getCategorias } from '../../api/categoriaMenu.js'
import ImageUpload from '../../components/ImageUpload.jsx'


const COLUMNS = [
  { key: 'idMenu',          label: 'ID'         },
  { key: 'imagen',          label: 'Foto',
    render: v => v
      ? <img src={v} alt="platillo"
              style={{ width: 48, height: 48, objectFit: 'cover',
                       borderRadius: 8, border: '1px solid var(--cream-dk)' }} />
      : <span style={{ fontSize: 24 }}>🍽️</span>
  },
  { key: 'nombreCategoria', label: 'Categoría'  },
  { key: 'nombre',          label: 'Platillo'   },
  { key: 'precio',          label: 'Precio',
    render: v => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
  { key: 'estado',          label: 'Estado',
    render: v => <Badge value={v} /> },
]

const EMPTY = {
  idCategoria: '', nombre: '', descripcion: '',
  precio: '', imagen: '', estado: 'activo', tipos: []
}

export default function MenuPage() {
  const [platillos, setPlatillos]   = useState([])
  const [filtered, setFiltered]     = useState([])
  const [categorias, setCategorias] = useState([])
  const [search, setSearch]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
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
    fetchMenu()
    getCategorias().then(r => setCategorias(r.data)).catch(() => {})
  }, [])

  async function fetchMenu() {
    try {
      setLoading(true)
      const res = await getMenu()
      setPlatillos(res.data)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(platillos.filter(p => {
      const matchSearch =
        p.nombre.toLowerCase().includes(q) ||
        p.nombreCategoria?.toLowerCase().includes(q)
      const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
      return matchSearch && matchEstado
    }))
  }, [search, filtroEstado, platillos])

  function handleNew() {
    setEditing(null)
    setForm(EMPTY)
    setFormError(null)
    setModalOpen(true)
  }

  function handleEdit(platillo) {
    setEditing(platillo)
    setForm({
      idCategoria: platillo.idCategoria,
      nombre:      platillo.nombre,
      descripcion: platillo.descripcion ?? '',
      precio:      platillo.precio,
      imagen:      platillo.imagen ?? '',
      estado:      platillo.estado,
      tipos:       platillo.tipos ?? [],
    })
    setFormError(null)
    setModalOpen(true)
  }

  function toggleTipo(t) {
    setForm(prev => ({
      ...prev,
      tipos: prev.tipos.includes(t)
        ? prev.tipos.filter(x => x !== t)
        : [...prev.tipos, t]
    }))
  }

  async function handleSave() {
    if (!form.idCategoria)   return setFormError('La categoría es obligatoria')
    if (!form.nombre.trim()) return setFormError('El nombre es obligatorio')
    if (!form.precio)        return setFormError('El precio es obligatorio')
    if (form.tipos.length === 0) return setFormError('Selecciona al menos un tipo de reservación')

    try {
      setSaving(true)
      setFormError(null)
      const payload = { ...form, precio: Number(form.precio) }
      if (editing) {
        await updateMenu(editing.idMenu, payload)
      } else {
        await createMenu(payload)
      }
      setModalOpen(false)
      showToast(editing ? 'Platillo actualizado' : 'Platillo creado', 'success')
      fetchMenu()
    } catch (e) {
      setFormError(e.message)
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(platillo) {
    setToDelete(platillo)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    try {
      await deleteMenu(toDelete.idMenu)
      setConfirmOpen(false)
      setToDelete(null)
      showToast('Platillo eliminado', 'success')
      fetchMenu()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Menú"
        subtitle="Catálogo de platillos y bebidas"
        onNew={handleNew}
      />

      <div className="filter-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar platillo o categoría..." />
        <select className="filter-select" value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      <DataTable
        columns={COLUMNS}
        data={filtered}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        open={modalOpen}
        title={editing ? 'Editar Platillo' : 'Nuevo Platillo'}
        onClose={() => setModalOpen(false)}
      >
        <div className="form-grid">

          <div className="form-field form-field-full">
            <label>Categoría *</label>
            <select value={form.idCategoria}
              onChange={e => setForm({ ...form, idCategoria: Number(e.target.value) })}>
              <option value="">Selecciona una categoría</option>
              {categorias.map(c => (
                <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-field form-field-full">
            <label>Nombre *</label>
            <input type="text" value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Bruschetta, Filete de res..." />
          </div>

          <div className="form-field">
            <label>Precio *</label>
            <input type="number" min="0.01" step="0.01" value={form.precio}
              onChange={e => setForm({ ...form, precio: e.target.value })}
              placeholder="Ej: 185.00" />
          </div>

          <div className="form-field">
            <label>Estado</label>
            <select value={form.estado}
              onChange={e => setForm({ ...form, estado: e.target.value })}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="form-field form-field-full">
            <label>Disponible para *</label>
            <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
              {['salon', 'catering', 'restaurante'].map(t => (
                <label key={t} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13.5, cursor: 'pointer', color: 'var(--text)',
                  fontWeight: form.tipos.includes(t) ? 600 : 400
                }}>
                  <input
                    type="checkbox"
                    checked={form.tipos.includes(t)}
                    onChange={() => toggleTipo(t)}
                    style={{ accentColor: 'var(--rose)', width: 16, height: 16 }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-field form-field-full">
            <label>Descripción</label>
            <textarea value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ingredientes, preparación..." rows={3} />
          </div>

          <div className="form-field form-field-full">
            <ImageUpload
              value={form.imagen}
              onChange={url => setForm({ ...form, imagen: url })}
              label="Imagen del platillo"
            />
          </div>

          {formError && <p className="form-error">{formError}</p>}

          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear platillo'}
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