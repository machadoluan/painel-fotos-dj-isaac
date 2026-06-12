import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Layout from './admin/Layout'
import QRCodeModal from './QRCodeModal'

function generateUUID() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function StatCard({ label, value, sub, color = 'violet' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5">
      <p className="text-xs sm:text-sm text-slate-500 font-medium leading-tight">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1 hidden sm:block">{sub}</p>}
    </div>
  )
}

function DeleteConfirmModal({ eventName, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-2xl mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Excluir evento?</h3>
        <p className="text-slate-500 text-sm text-center mb-1">
          <span className="font-semibold text-slate-700">{eventName}</span>
        </p>
        <p className="text-slate-400 text-xs text-center mb-6">
          Todas as fotos serão excluídas permanentemente. Essa ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

const INTERVAL_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 15]

function EventCard({ event, onToggleActive, onSetFeatured, onUnfeatured, onDelete, onNavigate, onUpdateInterval, onUpdateLogo, onRemoveLogo }) {
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingLogo, setUpdatingLogo] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const uploadUrl = `${window.location.origin}/evento/${event.slug}`

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUpdatingLogo(true)
    await onUpdateLogo(event, file)
    setUpdatingLogo(false)
    e.target.value = ''
  }
  const carouselUrl = `${window.location.origin}/telao/${event.slug}`
  const currentInterval = event.slide_interval ?? 4

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/evento/${event.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(event)
    setDeleting(false)
    setConfirmDelete(false)
  }

  return (
    <>
      <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
        event.featured ? 'border-slate-900 shadow-md shadow-slate-200' : 'border-slate-200 hover:border-slate-300'
      }`}>
        {/* Banner thumbnail */}
        {event.banner_url && (
          <div className="h-24 w-full overflow-hidden bg-slate-100">
            <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className="font-semibold text-slate-900 text-base truncate">{event.name}</h3>
                {event.featured && (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    No QR
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs font-mono">{event.slug}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onToggleActive(event)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  event.active
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${event.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {event.active ? 'Ativo' : 'Inativo'}
              </button>

              <button
                onClick={() => setConfirmDelete(true)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Excluir evento"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {typeof event.photos?.[0]?.count === 'number' && (
            <p className="text-xs text-slate-400 mt-3">
              {event.photos[0].count} foto{event.photos[0].count !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Logo do casal */}
        <div className="px-4 pb-3 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400 font-medium">Logo do evento (telão)</p>
            <label className={`cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors ${updatingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} disabled={updatingLogo} />
              {updatingLogo ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Enviando...
                </span>
              ) : event.logo_url ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  Trocar logo
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Adicionar logo
                </span>
              )}
            </label>
          </div>
          {event.logo_url ? (
            <div className="relative h-14 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden px-3">
              <img src={event.logo_url} alt="Logo do evento" className="max-h-10 max-w-full object-contain" />
              <button
                onClick={() => onRemoveLogo(event)}
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded bg-black/50 hover:bg-red-600 text-white/60 hover:text-white transition-colors"
                title="Remover logo"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="h-14 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center">
              <p className="text-xs text-slate-300">Sem logo — exibe DJ Isaac no telão</p>
            </div>
          )}
        </div>

        {/* Intervalo do carrossel */}
        <div className="px-4 pb-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400 font-medium mb-2">Tempo por foto</p>
          <div className="flex flex-wrap gap-1.5">
            {INTERVAL_OPTIONS.map((sec) => (
              <button
                key={sec}
                onClick={() => onUpdateInterval(event, sec)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentInterval === sec
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
          {/* Gerenciar fotos — destaque */}
          <button
            onClick={() => onNavigate(event.id)}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Gerenciar fotos
          </button>

          {/* QR do evento + Telão */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setQrOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR do evento
            </button>
            <a
              href={carouselUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Telão
            </a>
          </div>

          {/* Vincular QR fixo */}
          {event.featured ? (
            <button
              onClick={() => onUnfeatured(event)}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Desvincular do QR fixo
            </button>
          ) : (
            <button
              onClick={() => onSetFeatured(event)}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Vincular ao QR fixo
            </button>
          )}

          {/* Copiar link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-semibold transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Link copiado!' : 'Copiar link do evento'}
          </button>
        </div>
      </div>

      {qrOpen && (
        <QRCodeModal
          url={uploadUrl}
          eventName={event.name}
          onClose={() => setQrOpen(false)}
        />
      )}

      {confirmDelete && (
        <DeleteConfirmModal
          eventName={event.name}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}
    </>
  )
}

// ──────────────────────────────────────────────
// Login page
// ──────────────────────────────────────────────
const AUTH_DOMAIN = '@fotoseventos.local'

function toEmail(username) {
  return `${username.trim().toLowerCase()}${AUTH_DOMAIN}`
}

function Waveform() {
  const bars = [4, 8, 14, 20, 28, 22, 16, 10, 18, 26, 32, 24, 14, 8, 20, 30, 22, 12, 18, 28, 20, 10, 16, 24, 30, 18, 8, 14, 22, 28]
  return (
    <div className="flex items-end gap-[3px] h-10">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-white/35"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  )
}

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    })

    if (err) {
      setError('Usuário ou senha incorretos.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Esquerda — visual ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden flex-col">
        {/* Fundo */}
        <div className="absolute inset-0 bg-[#060d1f]" />

        {/* Orbes de luz */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-400/15 rounded-full blur-[80px]" />

        {/* Grid decorativo */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col h-full px-14 py-20">
          {/* Logo topo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-white/70 text-sm font-medium tracking-wide">Fotos Eventos</span>
          </div>

          {/* Hero central */}
          <div className="flex-1 flex flex-col items-start justify-center">
            <div className="mb-6">
              <Waveform />
            </div>

            <p className="text-white/50 text-sm font-semibold tracking-[0.2em] uppercase mb-6">
              Painel de Gerenciamento
            </p>

            <img src="/logo.png" alt="DJ Isaac" className="w-96 xl:w-[28rem] mb-2 py-5" />

            <p className="text-white/45 text-base mt-6 leading-relaxed max-w-sm">
              Gerencie fotos dos seus eventos em tempo real. Seu telão, suas regras.
            </p>

            {/* Destaques */}
            <div className="mt-10 flex flex-col gap-3">
              {[
                'Upload direto pelo celular dos convidados',
                'Carrossel em tempo real no telão',
                'Moderação instantânea de fotos',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  </div>
                  <span className="text-white/55 text-sm">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé */}
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} DJ Isaac — Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* ── Direita — formulário ──────────────────────────── */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-12 xl:px-16">
          {/* Mobile: logo */}
          <div className="lg:hidden mb-8">
            <div className="bg-[#060d1f] rounded-2xl px-6 py-4">
              <img src="/logo.png" alt="DJ Isaac" className="w-40" />
            </div>
          </div>

          <div className="w-full max-w-sm">
            {/* Cabeçalho */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Bem-vindo 👋</h2>
              <p className="text-slate-500 text-sm">
                Entre com suas credenciais para acessar o painel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Usuário */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Usuário</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="seu usuário"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError('') }}
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                    autoFocus
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    className="w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-slate-200 hover:shadow-slate-300 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-slate-400 text-xs">© {new Date().getFullYear()} DJ Isaac</p>
        </div>
      </div>

    </div>
  )
}

// ──────────────────────────────────────────────
// New event dialog
// ──────────────────────────────────────────────
function NewEventDialog({ onSubmit, onClose, creating, newName, setNewName, error, setError, bannerPreview, onBannerChange, logoPreview, onLogoChange }) {
  // Fecha com Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !creating) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [creating, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !creating) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Banner upload */}
        <label className="block cursor-pointer group relative">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onBannerChange}
            disabled={creating}
          />
          {bannerPreview ? (
            <div className="h-44 relative">
              <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Trocar banner
                </span>
              </div>
            </div>
          ) : (
            <div className="h-36 bg-slate-50 flex flex-col items-center justify-center gap-2.5 group-hover:bg-slate-100 transition-colors border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-slate-200 transition-colors flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Adicionar banner</p>
                <p className="text-xs text-slate-400 mt-0.5">Opcional — aparece na página dos convidados</p>
              </div>
            </div>
          )}
        </label>

        {/* Form body */}
        <form onSubmit={onSubmit}>
          <div className="px-6 pt-5 pb-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Novo evento</h2>
                <p className="text-slate-400 text-xs mt-0.5">Preencha os dados para criar o evento</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do evento</label>
              <input
                type="text"
                placeholder="Ex: Casamento Ana & João"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setError('') }}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            {/* Logo do casal */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Logo do casal / evento
                <span className="text-slate-400 font-normal ml-1">(opcional)</span>
              </label>
              <label className="cursor-pointer group block">
                <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} disabled={creating} />
                {logoPreview ? (
                  <div className="h-20 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden px-4 relative group-hover:opacity-90 transition-opacity">
                    <img src={logoPreview} alt="" className="max-h-14 max-w-full object-contain" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full">Trocar logo</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2.5 group-hover:bg-slate-100 group-hover:border-slate-300 transition-all">
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="text-sm text-slate-400 group-hover:text-slate-600 transition-colors">Adicionar logo do casal</p>
                  </div>
                )}
              </label>
              <p className="text-xs text-slate-400 mt-1">Aparece no telão no lugar de "DJ ISAAC"</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-slate-200"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Criando...
                  </span>
                ) : 'Criar evento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Main dashboard
// ──────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const resetForm = () => {
    setShowForm(false)
    setNewName('')
    setError('')
    setBannerFile(null)
    setBannerPreview(null)
    setLogoFile(null)
    setLogoPreview(null)
  }

  const loadEvents = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*, photos(count)')
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => { loadEvents() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')

    const eventId = generateUUID()
    const slug = slugify(newName)
    let bannerUrl = null
    let bannerPath = null
    let logoUrl = null
    let logoPath = null

    if (bannerFile) {
      try {
        const compressed = await imageCompression(bannerFile, {
          maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true,
        })
        const ext = bannerFile.name.split('.').pop() || 'jpg'
        bannerPath = `banners/${eventId}.${ext}`
        const { error: se } = await supabase.storage
          .from('event-photos')
          .upload(bannerPath, compressed, { contentType: bannerFile.type })
        if (se) throw se
        const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(bannerPath)
        bannerUrl = urlData.publicUrl
      } catch (uploadErr) {
        setError(`Erro ao enviar banner: ${uploadErr.message}`)
        setCreating(false)
        return
      }
    }

    if (logoFile) {
      try {
        const compressed = await imageCompression(logoFile, {
          maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true,
        })
        const ext = logoFile.name.split('.').pop() || 'png'
        logoPath = `logos/${eventId}.${ext}`
        const { error: se } = await supabase.storage
          .from('event-photos')
          .upload(logoPath, compressed, { contentType: logoFile.type })
        if (se) throw se
        const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(logoPath)
        logoUrl = urlData.publicUrl
      } catch (uploadErr) {
        setError(`Erro ao enviar logo: ${uploadErr.message}`)
        setCreating(false)
        return
      }
    }

    const { data, error: err } = await supabase
      .from('events')
      .insert({ id: eventId, name: newName.trim(), slug, banner_url: bannerUrl, banner_path: bannerPath, logo_url: logoUrl, logo_path: logoPath })
      .select()
      .single()

    if (err) {
      setError(err.message.includes('unique') ? 'Já existe um evento com esse nome.' : err.message)
    } else {
      setEvents((prev) => [data, ...prev])
      resetForm()
    }
    setCreating(false)
  }

  const toggleActive = async (event) => {
    const { data } = await supabase
      .from('events')
      .update({ active: !event.active })
      .eq('id', event.id)
      .select()
      .single()
    if (data) setEvents((prev) => prev.map((e) => (e.id === data.id ? data : e)))
  }

  const setFeatured = async (event) => {
    await supabase.from('events').update({ featured: false }).neq('id', event.id)
    const { data } = await supabase
      .from('events')
      .update({ featured: true })
      .eq('id', event.id)
      .select()
      .single()
    if (data) setEvents((prev) => prev.map((e) => ({ ...e, featured: e.id === data.id })))
  }

  const unfeatureEvent = async (event) => {
    await supabase.from('events').update({ featured: false }).eq('id', event.id)
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, featured: false } : e)))
  }

  const updateInterval = async (event, seconds) => {
    console.log('[Admin] clicou intervalo:', seconds, 'evento:', event.id)
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, slide_interval: seconds } : e)))
    const { data, error } = await supabase
      .from('events')
      .update({ slide_interval: seconds })
      .eq('id', event.id)
      .select('slide_interval')
      .single()
    console.log('[Admin] resposta do banco:', data, 'erro:', error)
  }

  const updateLogo = async (event, file) => {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true,
      })
      const ext = file.name.split('.').pop() || 'png'
      if (event.logo_path) {
        await supabase.storage.from('event-photos').remove([event.logo_path])
      }
      const logoPath = `logos/${event.id}.${ext}`
      const { error: se } = await supabase.storage
        .from('event-photos')
        .upload(logoPath, compressed, { contentType: file.type, upsert: true })
      if (se) throw se
      const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(logoPath)
      const { data } = await supabase
        .from('events')
        .update({ logo_url: urlData.publicUrl, logo_path: logoPath })
        .eq('id', event.id)
        .select()
        .single()
      if (data) setEvents((prev) => prev.map((e) => (e.id === data.id ? data : e)))
    } catch (err) {
      console.error('Erro ao atualizar logo:', err)
    }
  }

  const removeLogo = async (event) => {
    if (event.logo_path) {
      await supabase.storage.from('event-photos').remove([event.logo_path])
    }
    const { data } = await supabase
      .from('events')
      .update({ logo_url: null, logo_path: null })
      .eq('id', event.id)
      .select()
      .single()
    if (data) setEvents((prev) => prev.map((e) => (e.id === data.id ? data : e)))
  }

  const deleteEvent = async (event) => {
    // Deleta arquivos do storage antes de remover o evento
    const { data: photos } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('event_id', event.id)

    if (photos?.length) {
      const paths = photos.map((p) => p.storage_path)
      await supabase.storage.from('event-photos').remove(paths)
    }

    await supabase.from('events').delete().eq('id', event.id)
    setEvents((prev) => prev.filter((e) => e.id !== event.id))
  }

  const totalPhotos = events.reduce((sum, e) => sum + (e.photos?.[0]?.count || 0), 0)
  const activeCount = events.filter((e) => e.active).length
  const featuredEvent = events.find((e) => e.featured)

  return (
    <Layout>
      <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Eventos</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gerencie os eventos e o QR code</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3 sm:px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden xs:inline">Novo </span>evento
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <StatCard label="Eventos" value={events.length} />
          <StatCard label="Ativos" value={activeCount} color="emerald" />
          <StatCard label="Fotos" value={totalPhotos} color="sky" />
        </div>

        {/* QR status banner */}
        <div className={`rounded-2xl border p-3 sm:p-4 mb-5 flex items-center gap-3 sm:gap-4 ${
          featuredEvent
            ? 'bg-slate-50 border-slate-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            featuredEvent ? 'bg-slate-100' : 'bg-amber-100'
          }`}>
            <svg className={`w-5 h-5 ${featuredEvent ? 'text-slate-700' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${featuredEvent ? 'text-slate-900' : 'text-amber-900'}`}>
              {featuredEvent ? `QR vinculado: ${featuredEvent.name}` : 'QR code sem evento vinculado'}
            </p>
            <p className={`text-xs mt-0.5 ${featuredEvent ? 'text-slate-600' : 'text-amber-600'}`}>
              {featuredEvent
                ? 'Convidados que escanearem o QR serão direcionados a este evento.'
                : 'Clique em "Vincular ao QR" em um evento para ativar o QR code.'}
            </p>
          </div>
        </div>

        {/* New event dialog */}
        {showForm && (
          <NewEventDialog
            onSubmit={handleCreate}
            onClose={resetForm}
            creating={creating}
            newName={newName}
            setNewName={setNewName}
            error={error}
            setError={setError}
            bannerPreview={bannerPreview}
            onBannerChange={handleBannerChange}
            logoPreview={logoPreview}
            onLogoChange={handleLogoChange}
          />
        )}

        {/* Events list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-48 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">Nenhum evento ainda</p>
            <p className="text-slate-400 text-sm mt-1">Crie o primeiro evento clicando em "Novo evento".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onToggleActive={toggleActive}
                onSetFeatured={setFeatured}
                onUnfeatured={unfeatureEvent}
                onDelete={deleteEvent}
                onNavigate={(id) => navigate(`/admin/evento/${id}`)}
                onUpdateInterval={updateInterval}
                onUpdateLogo={updateLogo}
                onRemoveLogo={removeLogo}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

// ──────────────────────────────────────────────
// Root export
// ──────────────────────────────────────────────
export default function AdminPanel() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <LoginPage />
  return <Dashboard />
}
