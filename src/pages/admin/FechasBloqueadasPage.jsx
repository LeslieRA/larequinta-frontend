import { useState, useEffect } from 'react'
import PageHeader        from '../../components/PageHeader.jsx'
import DataTable         from '../../components/DataTable.jsx'
import Modal             from '../../components/Modal.jsx'
import ConfirmDialog     from '../../components/ConfirmDialog.jsx'
import CalendarioReserva from '../../components/CalendarioReserva.jsx'
import Toast             from '../../components/Toast.jsx'
import '../../components/Form.css'
import { useToast }      from '../../hooks/useToast.js'
import { getFechasBloqueadas, createFechaBloqueada, deleteFechaBloqueada } from '../../api/fechasBloqueadas.js'

const COLUMNS = [
  { key: 'idBloqueo',   label: 'ID'     },
  { key: 'fechaInicio', label: 'Desde'  },
  { key: 'fechaFin',    label: 'Hasta'  },
  { key: 'motivo',      label: 'Motivo' },
  { key: 'tipo',        label: 'Tipo'   },
]

const EMPTY = { fechaInicio: '', fechaFin: '', motivo: '', tipo: 'dia' }

export default function FechasBloqueadasPage() {
  const [fechas, setFechas]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [modalOpen, setModalOpen]     = useState(false)
  const [form, setForm]               = useState(EMPTY)
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState(null)
  const [seleccionandoFin, setSeleccionandoFin] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete]       = useState(null)

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => { fetchFechas() }, [])

  async function fetchFechas() {
    try {
      setLoading(true)
      const res = await getFechasBloqueadas()
      setFechas(res.data)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleNew() {
    setForm(EMPTY)
    setFormError(null)
    setSeleccionandoFin(false)
    setModalOpen(true)
  }

  function handleSelectFecha(fecha) {
    if (form.tipo === 'dia') {
      setForm({ ...form, fechaInicio: fecha, fechaFin: fecha })
    } else {
      if (!seleccionandoFin) {
        setForm({ ...form, fechaInicio: fecha, fechaFin: '' })
        setSeleccionandoFin(true)
      } else {
        if (fecha < form.fechaInicio) {
          setForm({ ...form, fechaInicio: fecha, fechaFin: form.fechaInicio })
        } else {
          setForm({ ...form, fechaFin: fecha })
        }
        setSeleccionandoFin(false)
      }
    }
  }

  async function handleSave() {
    if (!form.fechaInicio)   return setFormError('Selecciona una fecha')
    if (!form.motivo.trim()) return setFormError('El motivo es obligatorio')
    if (form.tipo === 'rango' && !form.fechaFin)
      return setFormError('Selecciona la fecha de fin')
    try {
      setSaving(true)
      setFormError(null)
      await createFechaBloqueada({
        fechaInicio: form.fechaInicio,
        fechaFin:    form.tipo === 'dia' ? form.fechaInicio : form.fechaFin,
        motivo:      form.motivo,
        tipo:        form.tipo,
      })
      setModalOpen(false)
      showToast('Fecha bloqueada correctamente', 'success')
      fetchFechas()
    } catch (e) {
      setFormError(e.message)
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(fecha) {
    setToDelete(fecha)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    try {
      await deleteFechaBloqueada(toDelete.idBloqueo)
      setConfirmOpen(false)
      setToDelete(null)
      showToast('Fecha desbloqueada', 'success')
      fetchFechas()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Fechas Bloqueadas" subtitle="Días en que no se aceptan reservaciones"
        onNew={handleNew} btnLabel="+ Bloquear fecha" />
      <DataTable columns={COLUMNS} data={fechas} onEdit={null} onDelete={handleDelete} loading={loading} />

      <Modal open={modalOpen} title="Bloquear fecha" onClose={() => setModalOpen(false)}>
        <div className="form-grid">
          <div className="form-field form-field-full">
            <label>Tipo de bloqueo</label>
            <select value={form.tipo} onChange={e => {
              setForm({ ...form, tipo: e.target.value, fechaInicio: '', fechaFin: '' })
              setSeleccionandoFin(false)
            }}>
              <option value="dia">Un día específico</option>
              <option value="rango">Rango de días</option>
            </select>
          </div>
          <div className="form-field-full" style={{
            background: 'var(--gold-lt)', padding: '8px 12px',
            borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gray-mid)'
          }}>
            {form.tipo === 'dia' ? '📅 Selecciona el día que quieres bloquear'
              : seleccionandoFin ? '📅 Ahora selecciona la fecha de FIN del rango'
              : '📅 Selecciona la fecha de INICIO del rango'}
          </div>
          <div className="form-field-full" style={{ display: 'flex', justifyContent: 'center' }}>
            <CalendarioReserva
              fechaSeleccionada={seleccionandoFin ? form.fechaFin : form.fechaInicio}
              onSelect={handleSelectFecha}
              fechasBloqueadas={fechas}
            />
          </div>
          {form.fechaInicio && (
            <div className="form-field-full" style={{
              background: 'var(--rose-lt)', padding: '8px 12px',
              borderRadius: 'var(--radius)', fontSize: 13
            }}>
              {form.tipo === 'dia'
                ? `🚫 Bloqueando: ${form.fechaInicio}`
                : `🚫 Desde: ${form.fechaInicio} ${form.fechaFin ? `hasta: ${form.fechaFin}` : '→ selecciona fin'}`}
            </div>
          )}
          <div className="form-field form-field-full">
            <label>Motivo *</label>
            <input type="text" value={form.motivo}
              onChange={e => setForm({ ...form, motivo: e.target.value })}
              placeholder="Ej: Mantenimiento, Día festivo..." />
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Bloquear fecha'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        message={`¿Desbloquear las fechas del ${toDelete?.fechaInicio} al ${toDelete?.fechaFin}?`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <Toast message={toast.message} type={toast.type} onClose={hideToast} />
    </div>
  )
}