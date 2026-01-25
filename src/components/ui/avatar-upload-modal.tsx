'use client'

import { useState } from 'react'
import { Button } from './button'
import { Input } from './input'

export type AvatarSaveData =
  | { type: 'url'; url: string }
  | { type: 'file'; file: File; preview: string }

interface AvatarUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: AvatarSaveData) => void
  currentAvatar?: string | null
}

export function AvatarUploadModal({ isOpen, onClose, onSave, currentAvatar }: AvatarUploadModalProps) {
  const [mode, setMode] = useState<'url' | 'file'>('url')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(currentAvatar || null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen')
        return
      }
      if (selectedFile.size > 2 * 1024 * 1024) {
        setError('El archivo no puede superar 2MB')
        return
      }
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setError(null)
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    setPreview(e.target.value)
    setError(null)
  }

  const handleSave = () => {
    setError(null)

    try {
      if (mode === 'url') {
        if (!url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
          throw new Error('URL de imagen invalida. Debe terminar en .jpg, .png, .gif o .webp')
        }
        onSave({ type: 'url', url })
      } else if (file && preview) {
        // Return file and preview - upload will happen when user saves the form
        onSave({ type: 'file', file, preview })
      } else {
        throw new Error('Selecciona un archivo para subir')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const handleClose = () => {
    setUrl('')
    setFile(null)
    setPreview(currentAvatar || null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
        <h3 className="text-lg font-bold text-text-main mb-4">Cambiar Foto de Perfil</h3>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              mode === 'url' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              mode === 'file' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Archivo
          </button>
        </div>

        {preview && (
          <div className="flex justify-center mb-4">
            <div
              className="w-24 h-24 rounded-full bg-cover bg-center border-4 border-slate-100"
              style={{ backgroundImage: `url(${preview})` }}
            />
          </div>
        )}

        {mode === 'url' ? (
          <Input
            label="URL de la imagen"
            placeholder="https://ejemplo.com/mi-foto.jpg"
            value={url}
            onChange={handleUrlChange}
          />
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Seleccionar archivo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer hover:file:bg-primary/90"
            />
            <p className="text-xs text-slate-500 mt-1">Maximo 2MB. Formatos: JPG, PNG, GIF, WebP</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}
