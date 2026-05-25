import './DataTable.css'

export default function DataTable({ columns, data, onEdit, onDelete, loading }) {
  if (loading) return (
    <div className="dt-empty">Cargando...</div>
  )

  if (!data || data.length === 0) return (
    <div className="dt-empty">Sin resultados</div>
  )

  return (
    <div className="dt-wrapper">
      <div className="dt-scroll">
        <table className="dt-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className="dt-th">{col.label}</th>
              ))}
              {(onEdit || onDelete) && (
                <th className="dt-th dt-th-actions">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="dt-tr">
                {columns.map(col => (
                  <td key={col.key} className="dt-td">
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key] ?? '—'}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="dt-td dt-td-actions">
                    <div className="dt-actions">
                      {onEdit && (
                        <button className="dt-btn dt-btn-edit"
                          onClick={() => onEdit(row)} title="Editar">
                          ✏️ Editar
                        </button>
                      )}
                      {onDelete && (
                        <button className="dt-btn dt-btn-delete"
                          onClick={() => onDelete(row)} title="Eliminar">
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dt-footer">
        {data.length} registro{data.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}