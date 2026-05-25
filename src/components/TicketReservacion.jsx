import { useRef, useState } from 'react'
import './TicketReservacion.css'

export default function TicketReservacion({ reservacion, onClose }) {
  const ticketRef = useRef()
  const [descargando, setDescargando] = useState(false)

  async function descargarPDF() {
    try {
      setDescargando(true)
      const { default: jsPDF }       = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf     = new jsPDF('p', 'mm', 'a4')
      const pdfW    = pdf.internal.pageSize.getWidth()
      const pdfH    = (canvas.height * pdfW) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      pdf.save(`ticket-${reservacion.idReservacion}.pdf`)
    } finally { setDescargando(false) }
  }

  if (!reservacion) return null
  const pago = reservacion.pago
  const r    = reservacion

  const fmtMXN = n => `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  const tipoLabel =
    r.tipo === 'salon'       ? 'Salon de Eventos' :
    r.tipo === 'catering'    ? 'Catering'          :
    r.tipo === 'restaurante' ? 'Restaurante'        : r.tipo

  return (
    <div className="tk-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tk-modal">

        {/* Barra superior */}
        <div className="tk-topbar">
          <div className="tk-topbar-brand">
            <img src="/larequinta.png" alt="La Requinta" className="tk-topbar-logo" crossOrigin="anonymous" />
            <span>Comprobante de Reservacion</span>
          </div>
          <div className="tk-topbar-actions">
            <button className="tk-btn-dl" onClick={descargarPDF} disabled={descargando}>
              {descargando ? 'Generando...' : 'Descargar PDF'}
            </button>
            <button className="tk-btn-close" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Ticket imprimible */}
        <div className="tk-paper" ref={ticketRef}>

          {/* Header */}
          <div className="tk-header">
            <div className="tk-header-left">
              <img src="/larequinta.png" alt="La Requinta"
                className="tk-logo" crossOrigin="anonymous" />
              <div>
                <p className="tk-brand">La Requinta</p>
                <p className="tk-brand-sub">Restaurante y Eventos</p>
              </div>
            </div>
            <div className="tk-header-right">
              <p className="tk-folio-label">Folio</p>
              <p className="tk-folio-num">#{String(r.idReservacion).padStart(6, '0')}</p>
              <p className="tk-fecha-gen">
                {new Date().toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Linea dorada */}
          <div className="tk-linea" />

          {/* Codigo de pago */}
          {pago && (
            <div className="tk-codigo-box">
              <div className="tk-codigo-left">
                <p className="tk-codigo-label">Codigo de Pago</p>
                <p className="tk-codigo-valor">{pago.codigoPago}</p>
              </div>
              <div className="tk-codigo-right">
                <p className="tk-codigo-vence-label">Pagar antes del</p>
                <p className="tk-codigo-vence">
                  {pago.fechaLimite
                    ? new Date(pago.fechaLimite).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })
                    : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Badges tipo / estado */}
          <div className="tk-badges">
            <span className="tk-badge tk-badge-tipo">{tipoLabel}</span>
            <span className={`tk-badge tk-badge-estado tk-estado-${r.estado}`}>
              {r.estado}
            </span>
          </div>

          {/* Detalles */}
          <div className="tk-seccion">
            <p className="tk-seccion-titulo">Detalles de la Reservacion</p>
            <div className="tk-grid">
              <div className="tk-campo">
                <span className="tk-campo-label">Fecha del evento</span>
                <span className="tk-campo-valor">
                  {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-MX', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </span>
              </div>
              <div className="tk-campo">
                <span className="tk-campo-label">No. de personas</span>
                <span className="tk-campo-valor">{r.noPersonas} personas</span>
              </div>

              {r.salon && (
                <>
                  <div className="tk-campo">
                    <span className="tk-campo-label">Zona / Espacio</span>
                    <span className="tk-campo-valor">{r.salon.nombreZona}</span>
                  </div>
                  <div className="tk-campo">
                    <span className="tk-campo-label">Horario</span>
                    <span className="tk-campo-valor">
                      {r.salon.horaInicio} — {r.salon.horaFin} ({r.salon.duracionHoras}h)
                    </span>
                  </div>
                </>
              )}

              {r.restaurante && (
                <div className="tk-campo">
                  <span className="tk-campo-label">Hora de llegada</span>
                  <span className="tk-campo-valor">{r.restaurante.horaLlegada}</span>
                </div>
              )}

              {r.catering && (
                <>
                  <div className="tk-campo">
                    <span className="tk-campo-label">Lugar</span>
                    <span className="tk-campo-valor">{r.catering.lugar}</span>
                  </div>
                  <div className="tk-campo">
                    <span className="tk-campo-label">Horario</span>
                    <span className="tk-campo-valor">
                      {r.catering.horaInicio} — {r.catering.horaFin}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div className="tk-seccion">
            <p className="tk-seccion-titulo">Datos del Cliente</p>
            <div className="tk-grid">
              <div className="tk-campo">
                <span className="tk-campo-label">Nombre</span>
                <span className="tk-campo-valor">{r.nombreCliente}</span>
              </div>
              {r.correoCliente && (
                <div className="tk-campo">
                  <span className="tk-campo-label">Correo</span>
                  <span className="tk-campo-valor">{r.correoCliente}</span>
                </div>
              )}
            </div>
          </div>

          {/* Platillos */}
          {r.platillos?.length > 0 && (
            <div className="tk-seccion">
              <p className="tk-seccion-titulo">Platillos Seleccionados</p>
              <table className="tk-tabla">
                <thead>
                  <tr>
                    <th>Platillo</th>
                    <th>Cant.</th>
                    <th>Precio unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {r.platillos.map((p, i) => (
                    <tr key={i}>
                      <td>{p.nombrePlatillo}</td>
                      <td className="tk-td-center">{p.cantidad}</td>
                      <td className="tk-td-right">{fmtMXN(p.precioUnitario)}</td>
                      <td className="tk-td-right">{fmtMXN(p.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Insumos y decoración */}
          {r.insumos?.length > 0 && (
            <div className="tk-seccion">
              <p className="tk-seccion-titulo">Insumos y Decoracion</p>
              <table className="tk-tabla">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Cant.</th>
                    <th>Precio unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {r.insumos.map((ins, i) => (
                    <tr key={i}>
                      <td>{ins.nombre}</td>
                      <td className="tk-td-center">{ins.cantidad}</td>
                      <td className="tk-td-right">{fmtMXN(ins.precioUnitario)}</td>
                      <td className="tk-td-right">{fmtMXN(ins.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Total */}
          <div className="tk-total-box">
            {/* Desglose si hay platillos o insumos */}
            {(r.platillos?.length > 0 || r.insumos?.length > 0) && (
              <>
                {r.platillos?.length > 0 && (
                  <div className="tk-total-row tk-total-sub">
                    <span>Subtotal platillos</span>
                    <span>{fmtMXN(r.platillos.reduce((s,p)=>s+Number(p.subtotal??0),0))}</span>
                  </div>
                )}
                {r.insumos?.length > 0 && (
                  <div className="tk-total-row tk-total-sub">
                    <span>Subtotal insumos</span>
                    <span>{fmtMXN(r.insumos.reduce((s,i)=>s+Number(i.subtotal??0),0))}</span>
                  </div>
                )}
              </>
            )}
            <div className="tk-total-row">
              <span className="tk-total-label">Total a pagar</span>
              <span className="tk-total-valor">{fmtMXN(r.precioTotal)}</span>
            </div>
            {pago?.estado && (
              <div className="tk-total-row tk-total-sub">
                <span>Estado del pago</span>
                <span style={{ textTransform: 'capitalize' }}>{pago.estado}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="tk-footer">
            <div className="tk-linea" style={{ margin: '6mm 0 4mm' }} />
            <p className="tk-footer-gracias">Gracias por elegir La Requinta</p>
            <p className="tk-footer-nota">
              Este documento es su comprobante de reservacion. Conservelo para presentarlo el dia del evento.
            </p>
            <p className="tk-footer-fecha">
              Generado el {new Date().toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}