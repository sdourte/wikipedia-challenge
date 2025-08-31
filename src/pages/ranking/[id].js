// src/pages/ranking/[id].js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function Ranking() {
  const router = useRouter()
  const { id } = router.query  // ici c’est "id" car le fichier est [id].js
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [game, setGame] = useState(null)

  useEffect(() => {
    if (!id) return

    const fetchRanking = async () => {
      setLoading(true)
      console.log('[RANKING] Chargement classement pour gameId:', id)

      try {
        // 🔹 1. Récupère la partie
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', id)
          .single()
        if (gameError) throw gameError
        setGame(gameData)
        console.log('[RANKING] Partie chargée:', gameData)

        // 🔹 2. Récupère les joueurs avec leur pseudo
        const { data: playersData, error: playersError } = await supabase
          .from('game_players')
          .select('user_id, time_taken, finished, users(name)')
          .eq('game_id', id)

        if (playersError) throw playersError
        console.log('[RANKING] Joueurs récupérés:', playersData)

        // 🔹 3. Tri : ceux qui n’ont pas fini vont à la fin
        const sortedPlayers = [...playersData]
          .sort((a, b) => {
            if (a.time_taken === null) return 1
            if (b.time_taken === null) return -1
            return a.time_taken - b.time_taken
          })
          .map((p, index) => ({
            ...p,
            position: p.time_taken ? index + 1 : null
          }))

        setPlayers(sortedPlayers)
      } catch (err) {
        console.error('[RANKING] Erreur chargement classement:', err)
        alert('Erreur lors du chargement du classement')
      } finally {
        setLoading(false)
      }
    }

    fetchRanking()
  }, [id])

  const handleReplay = () => {
    console.log('[RANKING] Rejouer → retour accueil')
    router.push('/')
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Classement</h1>

      {game && (
        <div style={{ marginBottom: '2rem' }}>
          <p>Départ : {game.page_start}</p>
          <p>Arrivée : {game.page_end}</p>
        </div>
      )}

      <table style={{ borderCollapse: 'collapse', marginBottom: '2rem', width: '300px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Position</th>
            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Joueur</th>
            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Temps (s)</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.user_id}>
              <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>
                {p.position ?? '-'}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
                {p.users?.name ?? p.user_id}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>
                {p.time_taken ?? 'En cours...'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={handleReplay}
        style={{
          padding: '1rem 2rem',
          backgroundColor: '#1D4ED8',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1.25rem'
        }}
      >
        Rejouer
      </button>
    </div>
  )
}
