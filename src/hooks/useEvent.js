import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// byId=false → busca por slug (rota do convidado/telão, exige active=true)
// byId=true  → busca por id (admin, sem filtro de active)
export function useEvent(slugOrId, byId = false) {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slugOrId) return

    const fetch = async () => {
      setLoading(true)
      setError(null)

      const field = byId ? 'id' : 'slug'
      let query = supabase.from('events').select('*').eq(field, slugOrId)
      if (!byId) query = query.eq('active', true) // convidado/telão só vê eventos ativos
      const { data, error: err } = await query.single()

      if (err || !data) {
        setError(err?.message || 'Evento não encontrado')
        setEvent(null)
      } else {
        setEvent(data)
      }
      setLoading(false)
    }

    fetch()
  }, [slugOrId, byId])

  return { event, loading, error }
}
