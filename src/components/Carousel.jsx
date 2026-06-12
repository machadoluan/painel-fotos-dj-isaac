import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useEvent } from '../hooks/useEvent'

export default function Carousel() {
  const { slug } = useParams()
  const { event: initialEvent, loading: eventLoading } = useEvent(slug)

  // Cópia local do evento — atualizada via realtime/polling para refletir mudanças de slide_interval
  const [event, setEvent] = useState(null)

  const [photos, setPhotos] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(null)
  const [sliding, setSliding] = useState(false)
  const timerRef = useRef(null)
  const animatingRef = useRef(false)

  // Sincroniza quando o evento inicial chega
  useEffect(() => {
    if (initialEvent) setEvent(initialEvent)
  }, [initialEvent])

  // Realtime + polling para capturar mudanças no evento (ex: slide_interval)
  useEffect(() => {
    if (!initialEvent?.id) return

    // Realtime
    const channel = supabase
      .channel(`event-settings:${initialEvent.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${initialEvent.id}` },
        (payload) => { if (payload.new) setEvent(payload.new) }
      )
      .subscribe()

    // Polling a cada 2s como fallback — sempre aplica resultado
    const poll = async () => {
      const { data, error } = await supabase
        .from('events').select('slide_interval, logo_url, logo_path').eq('id', initialEvent.id).single()
      console.log('[Carousel] poll evento:', data, 'erro:', error)
      if (data) setEvent((prev) => {
        if (!prev) return prev
        const changed = prev.slide_interval !== data.slide_interval || prev.logo_url !== data.logo_url
        if (!changed) return prev
        return { ...prev, slide_interval: data.slide_interval, logo_url: data.logo_url, logo_path: data.logo_path }
      })
    }
    const pollInterval = setInterval(poll, 2000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [initialEvent?.id])

  useEffect(() => {
    if (!event) return

    const load = async () => {
      const { data } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', event.id)
        .eq('visible', true)
        .order('created_at', { ascending: true })

      setPhotos(data || [])
    }

    load()

    const channel = supabase
      .channel(`photos:${event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'photos', filter: `event_id=eq.${event.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPhotos((prev) => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setPhotos((prev) =>
              prev
                .map((p) => (p.id === payload.new.id ? payload.new : p))
                .filter((p) => p.visible)
            )
          } else if (payload.eventType === 'DELETE') {
            setPhotos((prev) => prev.filter((p) => p.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [event])

  const advanceRef = useRef(null)

  const advance = useCallback(() => {
    if (photos.length <= 1 || animatingRef.current) return
    animatingRef.current = true

    const next = (currentIndex + 1) % photos.length
    setNextIndex(next)
    setSliding(false)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSliding(true)
        setTimeout(() => {
          setCurrentIndex(next)
          setNextIndex(null)
          setSliding(false)
          animatingRef.current = false
        }, 550)
      })
    })
  }, [currentIndex, photos])

  // Mantém ref sempre atualizada sem ser dependência do timer
  advanceRef.current = advance

  const intervalMs = (event?.slide_interval ?? 4) * 1000

  console.log('[Carousel] render — slide_interval:', event?.slide_interval, '| intervalMs:', intervalMs)

  // Timer só reinicia quando intervalMs muda — não toda vez que advance muda
  useEffect(() => {
    if (photos.length === 0) return
    console.log('[Carousel] timer RESET → novo intervalo:', intervalMs, 'ms')
    const tick = () => advanceRef.current?.()
    clearInterval(timerRef.current)
    timerRef.current = setInterval(tick, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [photos.length, intervalMs])

  useEffect(() => {
    if (currentIndex >= photos.length && photos.length > 0) {
      setCurrentIndex(0)
    }
  }, [photos, currentIndex])

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (eventLoading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Carregando...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Evento não encontrado</div>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]
  const nextPhoto = nextIndex !== null ? photos[nextIndex] : null

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {photos.length === 0 ? (
        <div className="absolute inset-0">
          <img
            src={event.logo_url || '/logo.png'}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-contain select-none"
          />
          <p className="absolute bottom-8 left-0 right-0 text-center text-white/50 text-lg animate-pulse">Aguardando fotos...</p>
        </div>
      ) : (
        <>
          {currentPhoto && (
            <img
              key={currentPhoto.id}
              src={currentPhoto.url}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
              style={{
                transform: sliding ? 'translateX(-100%)' : 'translateX(0)',
                transition: sliding ? 'transform 550ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                willChange: 'transform',
              }}
            />
          )}

          {nextIndex !== null && photos[nextIndex] && (
            <img
              key={`next-${photos[nextIndex].id}`}
              src={photos[nextIndex].url}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
              style={{
                transform: sliding ? 'translateX(0)' : 'translateX(100%)',
                transition: sliding ? 'transform 550ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                willChange: 'transform',
              }}
            />
          )}

          {/* Branding nas laterais */}
          {(() => {
            const logoSrc = event.logo_url || '/logo.png'
            const isEventLogo = !!event.logo_url
            const baseStyle = {
              maxHeight: 'clamp(50px, 7vh, 100px)',
              maxWidth: '12vw',
              objectFit: 'contain',
              opacity: 0.5,
            }
            const eventLogoStyle = {
              ...baseStyle,
              filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8)) drop-shadow(0 0 2px rgba(255,255,255,1))',
            }
            return (
              <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                <img
                  src={logoSrc}
                  alt=""
                  className="select-none"
                  style={isEventLogo ? eventLogoStyle : { ...baseStyle, transform: 'rotate(-90deg)' }}
                />
                <img
                  src={logoSrc}
                  alt=""
                  className="select-none"
                  style={isEventLogo ? eventLogoStyle : { ...baseStyle, transform: 'rotate(90deg)' }}
                />
              </div>
            )
          })()}

          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
            {photos.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <button
        onClick={handleFullscreen}
        className="absolute top-4 right-4 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 p-2 rounded-lg transition-all"
        title="Tela cheia"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      <div className="absolute top-4 left-4 text-white/50 text-sm font-medium">
        {event.name}
      </div>
    </div>
  )
}
