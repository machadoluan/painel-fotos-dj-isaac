import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function UploadRedirect() {
  const navigate = useNavigate()
  const [error, setError] = useState(false)

  useEffect(() => {
    const redirect = async () => {
      const { data } = await supabase
        .from('events')
        .select('slug')
        .eq('featured', true)
        .eq('active', true)
        .single()

      if (data?.slug) {
        navigate(`/evento/${data.slug}`, { replace: true })
      } else {
        setError(true)
      }
    }

    redirect()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">📷</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Nenhum evento ativo</h1>
          <p className="text-gray-500">O organizador ainda não vinculou este QR code a um evento.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse text-slate-400 text-lg">Carregando evento...</div>
    </div>
  )
}
