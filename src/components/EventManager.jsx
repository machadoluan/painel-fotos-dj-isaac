import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Layout from './admin/Layout'

function PhotoModal({ photo, onHide, onShow, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl overflow-hidden w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-black">
          <img src={photo.url} alt="" className="w-full max-h-[55vh] object-contain" />
          {!photo.visible && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-white/10 backdrop-blur text-white text-sm font-medium px-3 py-1.5 rounded-full border border-white/20">
                Oculta do telão
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-2">
          {photo.visible ? (
            <button
              onClick={onHide}
              className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Ocultar do telão
            </button>
          ) : (
            <button
              onClick={onShow}
              className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Mostrar no telão
            </button>
          )}

          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Deletar permanentemente
          </button>
        </div>
      </div>
    </div>
  )
}

const POLL_INTERVAL = 4000

export default function EventManager() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [liveStatus, setLiveStatus] = useState('connecting')

  // ── Carga inicial ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [{ data: ev }, { data: ph }] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('photos').select('*').eq('event_id', id).order('created_at', { ascending: false }),
      ])
      setEvent(ev)
      setPhotos(ph || [])
      setLoading(false)
    }
    load()
  }, [id])

  // ── Realtime ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const channel = supabase
      .channel(`admin:photos:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos', filter: `event_id=eq.${id}` }, (payload) => {
        if (!cancelled) setPhotos((p) => {
          if (p.some((x) => x.id === payload.new.id)) return p
          return [payload.new, ...p]
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'photos', filter: `event_id=eq.${id}` }, (payload) => {
        if (!cancelled) setPhotos((p) => p.map((x) => (x.id === payload.new.id ? payload.new : x)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'photos', filter: `event_id=eq.${id}` }, (payload) => {
        if (!cancelled) setPhotos((p) => p.filter((x) => x.id !== payload.old.id))
      })
      .subscribe((status) => {
        if (!cancelled) setLiveStatus(status === 'SUBSCRIBED' ? 'live' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'error' : 'connecting')
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [id])

  // ── Polling fallback (garante atualização mesmo sem realtime) ──
  useEffect(() => {
    if (loading) return

    const poll = async () => {
      const { data } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false })

      if (!data) return

      setPhotos((prev) => {
        const prevMap = new Map(prev.map((p) => [p.id, p]))
        const nextMap = new Map(data.map((p) => [p.id, p]))
        let changed = false

        // Detecta novas ou atualizadas
        for (const [pid, photo] of nextMap) {
          const existing = prevMap.get(pid)
          if (!existing || existing.visible !== photo.visible) {
            prevMap.set(pid, photo)
            changed = true
          }
        }
        // Detecta deletadas
        for (const pid of prevMap.keys()) {
          if (!nextMap.has(pid)) {
            prevMap.delete(pid)
            changed = true
          }
        }

        if (!changed) return prev
        return Array.from(prevMap.values()).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )
      })
    }

    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [id, loading])

  const hidePhoto = async (photo) => {
    const { data } = await supabase
      .from('photos')
      .update({ visible: false })
      .eq('id', photo.id)
      .select()
      .single()
    if (data) setPhotos((p) => p.map((x) => (x.id === data.id ? data : x)))
    setSelected(null)
  }

  const showPhoto = async (photo) => {
    const { data } = await supabase
      .from('photos')
      .update({ visible: true })
      .eq('id', photo.id)
      .select()
      .single()
    if (data) {
      setPhotos((p) => p.map((x) => (x.id === data.id ? data : x)))
      // Garante que o usuário veja a foto após mostrar (pode estar na aba "Ocultas")
      setFilter('all')
    }
    setSelected(null)
  }

  const deletePhoto = async (photo) => {
    if (!confirm('Deletar esta foto permanentemente?')) return
    await supabase.storage.from('event-photos').remove([photo.storage_path])
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos((p) => p.filter((x) => x.id !== photo.id))
    setSelected(null)
  }

  const visibleCount = photos.filter((p) => p.visible).length
  const hiddenCount = photos.length - visibleCount

  const filtered = photos.filter((p) => {
    if (filter === 'visible') return p.visible
    if (filter === 'hidden') return !p.visible
    return true
  })

  return (
    <Layout>
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {loading ? '...' : event?.name}
              </h1>
              {liveStatus === 'live' && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Ao vivo
                </span>
              )}
              {liveStatus === 'connecting' && (
                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs font-medium px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" />
                  Conectando...
                </span>
              )}
              {liveStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  Sem tempo real
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              {photos.length} foto(s) — {visibleCount} visível(eis), {hiddenCount} oculta(s)
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        {!loading && photos.length > 0 && (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: `Todas (${photos.length})` },
              { key: 'visible', label: `Visíveis (${visibleCount})` },
              { key: 'hidden', label: `Ocultas (${hiddenCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filter === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Masonry */}
        {loading ? (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2 sm:gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-3 rounded-xl bg-slate-200 animate-pulse"
                style={{ height: `${[120, 180, 140, 200, 160, 130][i % 6]}px` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">Nenhuma foto aqui</p>
            <p className="text-slate-400 text-sm mt-1">
              {filter === 'all' ? 'Aguardando os convidados enviarem fotos.' : 'Nenhuma foto nesta categoria.'}
            </p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2 sm:gap-3">
            {filtered.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelected(photo)}
                className="relative group break-inside-avoid mb-3 block w-full rounded-xl overflow-hidden bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <img
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  className={`w-full h-auto block transition-all duration-200 group-hover:scale-105 ${
                    !photo.visible ? 'opacity-50 grayscale' : ''
                  }`}
                />
                {!photo.visible && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-black/60 backdrop-blur text-white text-xs px-2 py-0.5 rounded-full">
                      Oculta
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <PhotoModal
          photo={selected}
          onHide={() => hidePhoto(selected)}
          onShow={() => showPhoto(selected)}
          onDelete={() => deletePhoto(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </Layout>
  )
}
