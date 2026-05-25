import { useState, useEffect } from 'react'
import PageHeader    from '../../components/PageHeader.jsx'
import SearchBar     from '../../components/SearchBar.jsx'
import DataTable     from '../../components/DataTable.jsx'
import Modal         from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import ImageUpload   from '../../components/ImageUpload.jsx'
import '../../components/FilterBar.css'
import '../../components/Form.css'
import {
  getProductos, crearProducto, actualizarProducto,
  eliminarProducto, ajustarStock
} from '../../api/inventario.js'
import { getCategoriasInsumo } from '../../api/categoriaInsumo.js'
import { useNotificaciones } from '../../components/NotificacionesContext.jsx'

const FORM_EMPTY = {
  nombre: '', descripcion: '', idCategoria: '',
  unidad: 'pieza', stockActual: '0', stockMinimo: '5',
  precioUnitario: '0', imagen: ''
}

export default function ProductosInventarioPage() {
  const [productos, setProductos]     = useState([])
  const [filtered, setFiltered]       = useState([])
  const [search, setSearch]           = useState('')
  const [filtroStock, setFiltroStock] = useState('todos')
  const [categorias, setCategorias]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const [modalOpen, setModalOpen]         = useState(false)
  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [ajusteOpen, setAjusteOpen]       = useState(false)
  const [seleccionado, setSeleccionado]   = useState(null)
  const [saving, setSaving]               = useState(false)
  const [errores, setErrores]             = useState({})
  const [form, setForm]                   = useState(FORM_EMPTY)
  const [ajusteForm, setAjusteForm]       = useState({
    cantidad: '', motivo: '', usuario: ''
  })
  const [ajusteErrores, setAjusteErrores] = useState({})

  const { fetchAlertas } = useNotificaciones()

  useEffect(() => {
    fetchProductos()
    getCategoriasInsumo().then(r => setCategorias(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(productos.filter(p => {
      const matchSearch = p.nombre?.toLowerCase().includes(q) ||
                          p.nombreCategoria?.toLowerCase().includes(q)
      const matchStock  = filtroStock === 'todos' ? true
        : filtroStock === 'bajo' ? p.stockBajo : !p.stockBajo
      return matchSearch && matchStock
    }))
  }, [search, filtroStock, productos])

  async function fetchProductos() {
    try {
      setLoading(true)
      const res = await getProductos()
      setProductos(res.data)
      setFiltered(res.data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function handleNew() {
    setSeleccionado(null)
    setForm(FORM_EMPTY)
    setErrores({})
    setModalOpen(true)
  }

  function handleEdit(p) {
    setSeleccionado(p)
    setForm({
      nombre:         p.nombre,
      descripcion:    p.descripcion ?? '',
      idCategoria:    p.idCategoria ?? '',
      unidad:         p.unidad,
      stockActual:    String(p.stockActual),
      stockMinimo:    String(p.stockMinimo),
      precioUnitario: String(p.precioUnitario),
      imagen:         p.imagen ?? ''
    })
    setErrores({})
    setModalOpen(true)
  }

  function handleAjuste(p) {
    setSeleccionado(p)
    setAjusteForm({ cantidad: '', motivo: '', usuario: '' })
    setAjusteErrores({})
    setAjusteOpen(true)
  }

  // ── Validaciones ─────────────────────────────────────────
  function validarForm() {
    const e = {}
    if (!form.nombre.trim())
      e.nombre = 'El nombre es obligatorio'
    if (!form.unidad)
      e.unidad = 'Selecciona una unidad'
    if (form.stockMinimo === '' || isNaN(Number(form.stockMinimo)))
      e.stockMinimo = 'Ingresa un stock mínimo válido'
    else if (Number(form.stockMinimo) < 0)
      e.stockMinimo = 'El stock mínimo no puede ser negativo'
    if (form.stockActual === '' || isNaN(Number(form.stockActual)))
      e.stockActual = 'Ingresa un stock actual válido'
    if (form.precioUnitario !== '' && isNaN(Number(form.precioUnitario)))
      e.precioUnitario = 'Ingresa un precio válido'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  function validarAjuste() {
    const e = {}
    if (!ajusteForm.cantidad || isNaN(Number(ajusteForm.cantidad)))
      e.cantidad = 'Ingresa una cantidad válida'
    else if (Number(ajusteForm.cantidad) === 0)
      e.cantidad = 'La cantidad no puede ser cero'
    if (!ajusteForm.motivo.trim())
      e.motivo = 'El motivo es obligatorio'
    setAjusteErrores(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validarForm()) return
    try {
      setSaving(true)
      const payload = {
        ...form,
        idCategoria:    form.idCategoria    ? Number(form.idCategoria)    : null,
        stockActual:    Number(form.stockActual),
        stockMinimo:    Number(form.stockMinimo),
        precioUnitario: Number(form.precioUnitario),
      }
      if (seleccionado) await actualizarProducto(seleccionado.idProducto, payload)
      else              await crearProducto(payload)
      setModalOpen(false)
      fetchProductos()
      fetchAlertas()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleSuspender() {
    try {
      await eliminarProducto(seleccionado.idProducto)
      setConfirmOpen(false)
      fetchProductos()
    } catch (e) { setError(e.message) }
  }

  async function handleAjustarStock() {
    if (!validarAjuste()) return
    try {
      setSaving(true)
      await ajustarStock(seleccionado.idProducto, {
        cantidad: Number(ajusteForm.cantidad),
        motivo:   ajusteForm.motivo,
        usuario:  ajusteForm.usuario || 'Admin'
      })
      setAjusteOpen(false)
      fetchProductos()
      fetchAlertas()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  // ── Columnas ─────────────────────────────────────────────
  const COLUMNS = [
    { key: 'idProducto', label: 'ID' },
    {
      key: 'nombre', label: 'Producto',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {row.imagen
            ? <img src={row.imagen} alt={v} style={{
                width: 36, height: 36, borderRadius: 8,
                objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: '#fdf0f8', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0 }}>📦</div>
          }
          <div>
            <p style={{ fontWeight: 600, fontSize: 13 }}>{v}</p>
            {row.nombreCategoria && (
              <p style={{ fontSize: 11, color: '#b090a8' }}>{row.nombreCategoria}</p>
            )}
          </div>
        </div>
      )
    },
    { key: 'unidad', label: 'Unidad' },
    {
      key: 'stockActual', label: 'Stock',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontWeight: 700, fontSize: 14,
            color: row.stockBajo ? '#de2989' : '#2a9437'
          }}>
            {Number(v).toLocaleString('es-MX')}
          </span>
          {row.stockBajo && (
            <span style={{
              background: '#fce8f3', color: '#de2989',
              fontSize: 10, fontWeight: 700, padding: '2px 6px',
              borderRadius: 20, border: '1px solid rgba(222,41,137,0.2)'
            }}>⚠ Bajo</span>
          )}
        </div>
      )
    },
    { key: 'stockMinimo', label: 'Mín.',
      render: v => Number(v).toLocaleString('es-MX') },
    { key: 'precioUnitario', label: 'Precio',
      render: v => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    {
      key: 'acciones', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={e => { e.stopPropagation(); handleAjuste(row) }}
            style={{
              background: '#e8f5e9', color: '#2a9437',
              border: '1px solid rgba(42,148,55,0.25)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}
          >📥 Ajustar</button>
          <button
            onClick={e => { e.stopPropagation(); setSeleccionado(row); setConfirmOpen(true) }}
            style={{
              background: '#fff8ec', color: '#c47d00',
              border: '1px solid rgba(247,167,25,0.3)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}
          >⏸ Suspender</button>
        </div>
      )
    }
  ]

  if (error) return <div style={{ color: 'var(--danger)', padding: 24 }}>{error}</div>

  return (
    <div>
      <PageHeader
        title="Inventario de Productos"
        subtitle="Gestiona el stock de productos del restaurante"
        onNew={handleNew}
        btnLabel="+ Nuevo producto"
      />

      <div className="filter-bar">
        <SearchBar value={search} onChange={setSearch}
          placeholder="Buscar producto o categoría..." />
        <select className="filter-select" value={filtroStock}
          onChange={e => setFiltroStock(e.target.value)}>
          <option value="todos">Todo el stock</option>
          <option value="bajo">⚠ Stock bajo</option>
          <option value="ok">✓ Stock OK</option>
        </select>
        <span className="filter-count">
          {filtered.filter(p => p.stockBajo).length} con stock bajo
        </span>
      </div>

      <DataTable
        columns={COLUMNS}
        data={filtered}
        onEdit={handleEdit}
        loading={loading}
      />

      {/* ── Modal Producto ── */}
      <Modal
        open={modalOpen}
        title={seleccionado ? 'Editar producto' : 'Nuevo producto'}
        onClose={() => setModalOpen(false)}
      >
        <div className="form-grid">

          <div className="form-field form-field-full">
            <label>Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => {
                setForm({ ...form, nombre: e.target.value })
                setErrores(err => ({ ...err, nombre: null }))
              }}
              placeholder="Nombre del producto"
              className={errores.nombre ? 'input-error' : ''}
            />
            {errores.nombre && <p className="wizard-field-error">⚠ {errores.nombre}</p>}
          </div>

          <div className="form-field form-field-full">
            <label>Descripción</label>
            <textarea value={form.descripcion} rows={2}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción opcional" />
          </div>

          <div className="form-field">
            <label>Categoría</label>
            <select value={form.idCategoria}
              onChange={e => setForm({ ...form, idCategoria: e.target.value })}>
              <option value="">Sin categoría</option>
              {categorias.map(c => (
                <option key={c.idCatInsumo} value={c.idCatInsumo}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Unidad *</label>
            <select
              value={form.unidad}
              onChange={e => {
                setForm({ ...form, unidad: e.target.value })
                setErrores(err => ({ ...err, unidad: null }))
              }}
              className={errores.unidad ? 'input-error' : ''}
            >
              <option value="">Selecciona una unidad</option>
              {['pieza','litro','kg','caja','botella','lata','bolsa','sobre','paquete'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            {errores.unidad && <p className="wizard-field-error">⚠ {errores.unidad}</p>}
          </div>

          <div className="form-field">
            <label>Stock actual *</label>
            <input
              type="number" min="0"
              value={form.stockActual}
              onChange={e => {
                setForm({ ...form, stockActual: e.target.value })
                setErrores(err => ({ ...err, stockActual: null }))
              }}
              className={errores.stockActual ? 'input-error' : ''}
            />
            {errores.stockActual && <p className="wizard-field-error">⚠ {errores.stockActual}</p>}
          </div>

          <div className="form-field">
            <label>Stock mínimo (alerta) *</label>
            <input
              type="number" min="0"
              value={form.stockMinimo}
              onChange={e => {
                setForm({ ...form, stockMinimo: e.target.value })
                setErrores(err => ({ ...err, stockMinimo: null }))
              }}
              className={errores.stockMinimo ? 'input-error' : ''}
            />
            {errores.stockMinimo && <p className="wizard-field-error">⚠ {errores.stockMinimo}</p>}
            <p style={{ fontSize: 11.5, color: '#b090a8', marginTop: 3 }}>
              Se genera alerta cuando el stock baja de este número
            </p>
          </div>

          <div className="form-field">
            <label>Precio unitario</label>
            <input
              type="number" min="0" step="0.01"
              value={form.precioUnitario}
              onChange={e => {
                setForm({ ...form, precioUnitario: e.target.value })
                setErrores(err => ({ ...err, precioUnitario: null }))
              }}
              className={errores.precioUnitario ? 'input-error' : ''}
            />
            {errores.precioUnitario && <p className="wizard-field-error">⚠ {errores.precioUnitario}</p>}
          </div>

          <div className="form-field form-field-full">
            <label>Imagen</label>
            <ImageUpload
              value={form.imagen}
              onChange={url => setForm({ ...form, imagen: url })}
            />
          </div>

          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Ajuste de stock ── */}
      <Modal
        open={ajusteOpen}
        title={`📥 Ajustar stock — ${seleccionado?.nombre}`}
        onClose={() => setAjusteOpen(false)}
      >
        {seleccionado && (
          <div className="form-grid">

            <div className="form-field-full" style={{
              background: seleccionado.stockBajo ? '#fce8f3' : '#e8f5e9',
              padding: '10px 14px', borderRadius: 'var(--radius)',
              border: `1px solid ${seleccionado.stockBajo ? '#f48fb1' : '#a5d6a7'}`,
              fontSize: 13,
              color: seleccionado.stockBajo ? '#880e4f' : '#1b5e20'
            }}>
              Stock actual: <strong>
                {Number(seleccionado.stockActual).toLocaleString('es-MX')} {seleccionado.unidad}
              </strong>
              {seleccionado.stockBajo && (
                <span style={{ marginLeft: 8, fontWeight: 700 }}>
                  ⚠ Por debajo del mínimo ({seleccionado.stockMinimo} {seleccionado.unidad})
                </span>
              )}
            </div>

            <div className="form-field form-field-full">
              <label>Cantidad *</label>
              <input
                type="number"
                value={ajusteForm.cantidad}
                onChange={e => {
                  setAjusteForm({ ...ajusteForm, cantidad: e.target.value })
                  setAjusteErrores(err => ({ ...err, cantidad: null }))
                }}
                placeholder="Ej: 10 para agregar, -5 para restar"
                className={ajusteErrores.cantidad ? 'input-error' : ''}
              />
              {ajusteErrores.cantidad && (
                <p className="wizard-field-error">⚠ {ajusteErrores.cantidad}</p>
              )}
              <p style={{ fontSize: 11.5, color: '#b090a8', marginTop: 4 }}>
                Positivo (+) para entradas · Negativo (–) para salidas
              </p>
            </div>

            <div className="form-field form-field-full">
              <label>Motivo *</label>
              <input
                type="text"
                value={ajusteForm.motivo}
                onChange={e => {
                  setAjusteForm({ ...ajusteForm, motivo: e.target.value })
                  setAjusteErrores(err => ({ ...err, motivo: null }))
                }}
                placeholder="Ej: Restock semanal, Merma, Inventario físico..."
                className={ajusteErrores.motivo ? 'input-error' : ''}
              />
              {ajusteErrores.motivo && (
                <p className="wizard-field-error">⚠ {ajusteErrores.motivo}</p>
              )}
            </div>

            <div className="form-field form-field-full">
              <label>Registrado por</label>
              <input
                type="text"
                value={ajusteForm.usuario}
                onChange={e => setAjusteForm({ ...ajusteForm, usuario: e.target.value })}
                placeholder="Nombre del responsable"
              />
            </div>

            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setAjusteOpen(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleAjustarStock}
                disabled={saving}
                style={{ background: 'linear-gradient(135deg, #2a9437, #1b6e26)' }}
              >
                {saving ? 'Aplicando...' : '📥 Aplicar ajuste'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Confirmar suspender ── */}
      <ConfirmDialog
        open={confirmOpen}
        message={`¿Suspender el producto "${seleccionado?.nombre}"? Seguirá en la base de datos pero desaparecerá del panel.`}
        onConfirm={handleSuspender}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}