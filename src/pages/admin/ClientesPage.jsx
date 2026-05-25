import { useState, useEffect } from 'react'
import PageHeader    from '../../components/PageHeader.jsx'
import SearchBar     from '../../components/SearchBar.jsx'
import DataTable     from '../../components/DataTable.jsx'
import Modal         from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import '../../components/Form.css'
import { getClientes, updateCliente, deleteCliente } from '../../api/clientes.js'
import Toast from '../../components/Toast.jsx'
import { useToast } from '../../hooks/useToast.js'
import PhoneInput from '../../components/PhoneInput.jsx'
import EmailInput from '../../components/EmailInput.jsx'

const COLUMNS = [
  { key: 'idCliente', label: 'ID'       },
  { key: 'nombre',    label: 'Nombre'   },
  { key: 'telefono',  label: 'Teléfono' },
  { key: 'correo',    label: 'Correo'   },
  { key: 'notas',     label: 'Notas'    },
  { key: 'createdAt', label: 'Registrado',
    render: v => v ? new Date(v).toLocaleDateString('es-MX') : '—' },
]

const EMPTY = { nombre: '', telefono: '', correo: '', notas: '' }

export default function ClientesPage() {
  const [clientes, setClientes]   = useState([])
  const [filtered, setFiltered]   = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete]       = useState(null)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    try {
      setLoading(true)
      const res = await getClientes()
      setClientes(res.data)
      setFiltered(res.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      clientes.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.correo.toLowerCase().includes(q) ||
        c.telefono.toLowerCase().includes(q)
      )
    )
  }, [search, clientes])

  function handleEdit(cliente) {
    setEditing(cliente)
    setForm({
      nombre:   cliente.nombre,
      telefono: cliente.telefono,
      correo:   cliente.correo,
      notas:    cliente.notas ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.nombre.trim())   return setFormError('El nombre es obligatorio')
    if (!form.telefono.trim()) return setFormError('El teléfono es obligatorio')
    if (!form.correo.trim())   return setFormError('El correo es obligatorio')

    try {
      setSaving(true)
      setFormError(null)
      await updateCliente(editing.idCliente, form)
      setModalOpen(false)
      fetchClientes()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(cliente) {
    setToDelete(cliente)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    try {
      await deleteCliente(toDelete.idCliente)
      setConfirmOpen(false)
      setToDelete(null)
      fetchClientes()
    } catch (e) {
      setError(e.message)
    }
  }

  if (error) return <div style={{ color: 'var(--danger)', padding: 24 }}>{error}</div>

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Clientes registrados automáticamente al hacer una reservación"
        // Sin onNew — no hay botón crear
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre, correo o teléfono..."
      />

      <DataTable
        columns={COLUMNS}
        data={filtered}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        open={modalOpen}
        title="Editar Cliente"
        onClose={() => setModalOpen(false)}
      >
        <div className="form-grid">

          <div className="form-field form-field-full">
            <label>Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          {/* Teléfono */}
          <div className="form-field">
            <label>Teléfono *</label>
            <PhoneInput
              value={form.telefono}
              onChange={val => setForm({ ...form, telefono: val })}
            />
          </div>

          {/* Correo */}
          <div className="form-field">
            <label>Correo *</label>
            <EmailInput
              value={form.correo}
              onChange={val => setForm({ ...form, correo: val })}
            />
          </div>

          <div className="form-field form-field-full">
            <label>Notas</label>
            <textarea
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
              placeholder="Preferencias, alergias, VIP..."
              rows={3}
            />
          </div>

          {formError && <p className="form-error">{formError}</p>}

          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
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