import { useState, useRef } from 'react'
import './ImageUpload.css'

const CLOUD_NAME   = 'dtvxsuoma'
const UPLOAD_PRESET = 'larequinta_uploads'

export default function ImageUpload({ value, onChange, label = 'Imagen' }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const [preview, setPreview]     = useState(value || null)
  const inputRef                  = useRef()

  async function handleFile(file) {
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes (JPG, PNG, WebP)')
      return
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede pesar más de 5MB')
      return
    }

    try {
      setUploading(true)
      setError(null)

      // Preview local inmediato
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target.result)
      reader.readAsDataURL(file)

      // Subir a Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)
      formData.append('folder', 'larequinta')

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      )

      if (!res.ok) throw new Error('Error al subir la imagen')

      const data = await res.json()

      // URL segura de Cloudinary
      setPreview(data.secure_url)
      onChange(data.secure_url)

    } catch (e) {
      setError(e.message)
      setPreview(value || null)
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleRemove() {
    setPreview(null)
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="image-upload">
      <label className="image-upload-label">{label}</label>

      {preview ? (
        <div className="image-preview">
          <img src={preview} alt="preview" />
          <div className="image-preview-overlay">
            <button
              type="button"
              className="image-change-btn"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '⏳ Subiendo...' : '🔄 Cambiar'}
            </button>
            <button
              type="button"
              className="image-remove-btn"
              onClick={handleRemove}
              disabled={uploading}
            >
              🗑️ Quitar
            </button>
          </div>
          {uploading && (
            <div className="image-uploading-bar">
              <div className="image-uploading-progress" />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`image-dropzone ${uploading ? 'uploading' : ''}`}
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          {uploading ? (
            <>
              <span className="dropzone-spinner">⏳</span>
              <p>Subiendo imagen...</p>
            </>
          ) : (
            <>
              <span className="dropzone-icon">🖼️</span>
              <p className="dropzone-text">
                Arrastra una imagen aquí<br/>
                <span>o haz clic para seleccionar</span>
              </p>
              <p className="dropzone-hint">JPG, PNG, WebP — máx. 5MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />

      {error && <p className="image-error">⚠ {error}</p>}
    </div>
  )
}