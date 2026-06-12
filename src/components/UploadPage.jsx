import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabaseClient'
import { useEvent } from '../hooks/useEvent'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_SIZE_MB = 10

const STATUS_LABEL = { compressing: 'Comprimindo', uploading: 'Enviando', done: '✓', error: '✗' }
const STATUS_BG = {
  compressing: 'bg-sky-500/70',
  uploading: 'bg-slate-700/70',
  done: 'bg-emerald-500/80',
  error: 'bg-red-500/80',
}

export default function UploadPage() {
  const { slug } = useParams()
  const { event, loading: eventLoading, error: eventError } = useEvent(slug)

  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({})
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState([])
  const [dragging, setDragging] = useState(false)

  const processFiles = useCallback((raw) => {
    const valid = []
    const invalid = []
    for (const f of raw) {
      const isImage = ACCEPTED_TYPES.includes(f.type) || /\.(heic|heif)$/i.test(f.name)
      if (!isImage) { invalid.push(`${f.name}: formato não suportado`); continue }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { invalid.push(`${f.name}: maior que ${MAX_SIZE_MB}MB`); continue }
      valid.push(f)
    }
    setErrors(invalid)
    setFiles(valid)
    setDone(false)
    setProgress({})
    setPreviews(valid.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })))
  }, [])

  const handleChange = (e) => processFiles(Array.from(e.target.files || []))

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  const handleUpload = async () => {
    if (!event || files.length === 0) return
    setUploading(true)
    const uploadErrors = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        setProgress((p) => ({ ...p, [i]: 'compressing' }))
        const compressed = await imageCompression(file, {
          maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.82,
        })

        setProgress((p) => ({ ...p, [i]: 'uploading' }))
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${event.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: se } = await supabase.storage.from('event-photos').upload(path, compressed, { contentType: file.type })
        if (se) throw se

        const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(path)
        const { error: de } = await supabase.from('photos').insert({ event_id: event.id, storage_path: path, url: urlData.publicUrl })
        if (de) throw de

        setProgress((p) => ({ ...p, [i]: 'done' }))
      } catch (err) {
        uploadErrors.push(`${file.name}: ${err.message}`)
        setProgress((p) => ({ ...p, [i]: 'error' }))
      }
    }

    setUploading(false)
    if (uploadErrors.length === 0) {
      setDone(true)
      setFiles([])
      setPreviews([])
    } else {
      setErrors(uploadErrors)
    }
  }

  // ── Loading ─────────────────────────────────────────
  if (eventLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Evento não encontrado ────────────────────────────
  if (eventError || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-5">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Evento não encontrado</h1>
          <p className="text-slate-400 text-sm">Este link não corresponde a nenhum evento ativo.</p>
        </div>
      </div>
    )
  }

  // ── Sucesso ─────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full mb-6">
            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Enviado!</h2>
          <p className="text-slate-500 text-sm mb-8">Suas fotos já aparecem no telão.</p>
          <button
            onClick={() => setDone(false)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Enviar mais fotos
          </button>
        </div>
      </div>
    )
  }

  // ── Upload UI ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero header */}
      {event.banner_url ? (
        <div className="relative w-full h-52 shrink-0 overflow-hidden">
          <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 text-center">
            <h1 className="text-2xl font-bold text-white drop-shadow">{event.name}</h1>
            <p className="text-white/70 text-sm mt-1">Compartilhe suas fotos do evento</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-slate-100 px-6 pt-10 pb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-2xl mb-4">
            <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
          <p className="text-slate-400 text-sm mt-1">Compartilhe suas fotos do evento</p>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 px-4 py-6 max-w-md w-full mx-auto">
        {errors.length > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
            {errors.map((e, i) => (
              <p key={i} className="text-red-600 text-sm">{e}</p>
            ))}
          </div>
        )}

        {/* Drop zone */}
        <label
          className={`block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragging
              ? 'border-slate-400 bg-slate-50'
              : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/50 bg-white'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            multiple
            className="hidden"
            onChange={handleChange}
            disabled={uploading}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="text-slate-700 font-semibold">Toque para selecionar fotos</p>
              <p className="text-slate-400 text-sm mt-0.5">JPG, PNG, WEBP, HEIC · até 10MB cada</p>
            </div>
          </div>
        </label>

        {/* Previews */}
        {previews.length > 0 && (
          <div className="mt-5">
            <p className="text-slate-500 text-xs font-medium mb-3">
              {previews.length} foto{previews.length !== 1 ? 's' : ''} selecionada{previews.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  {progress[i] && (
                    <div className={`absolute inset-0 ${STATUS_BG[progress[i]]} backdrop-blur-sm flex items-center justify-center`}>
                      {progress[i] === 'uploading' || progress[i] === 'compressing' ? (
                        <div className="text-center">
                          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto mb-1" />
                          <span className="text-white text-xs font-medium">{STATUS_LABEL[progress[i]]}</span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold text-white">{STATUS_LABEL[progress[i]]}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão enviar */}
        {files.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-6 w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-base transition-colors shadow-sm shadow-slate-200"
          >
            {uploading ? 'Enviando...' : `Enviar ${files.length} foto${files.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  )
}
