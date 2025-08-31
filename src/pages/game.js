// src/pages/game.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function Game() {
  const router = useRouter()
  const { gameId } = router.query
  const [game, setGame] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const init = async () => {
      console.log('[GAME INIT] gameId reçu:', gameId)

      const uid = localStorage.getItem('playerId')
      if (!uid) {
        console.warn('[GAME INIT] Aucun playerId en localStorage → retour accueil')
        alert('Retour à l’accueil')
        router.push('/')
        return
      }
      setUserId(uid)
      console.log('[GAME INIT] playerId trouvé:', uid)

      // 🔹 Récupération de la partie
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

      if (error) {
        console.error('[GAME INIT] Erreur récupération game:', error)
        return
      }
      console.log('[GAME INIT] Game chargé:', data)

      setGame(data)
      setStartTime(Date.now())

      // 🔹 Écoute temps réel pour rediriger si la partie est annulée ou autre
      const channel = supabase
        .channel(`game-${gameId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          payload => {
            const updatedGame = payload.new
            console.log('[GAME REALTIME] Update reçu:', updatedGame)

            // Si jamais le statut change pour une raison autre que "in_progress", on peut gérer
            if (!updatedGame) return
          }
        )
        .subscribe()

      return () => supabase.removeChannel(channel)
    }

    if (gameId) init()
  }, [gameId])

  const handleValidate = async () => {
    if (!userId || !startTime) {
      console.warn('[GAME VALIDATE] userId ou startTime manquant')
      return
    }

    const timeTaken = Math.floor((Date.now() - startTime) / 1000)
    console.log('[GAME VALIDATE] Temps pris (s):', timeTaken)

    const { data, error } = await supabase
      .from('game_players')
      .update({ finished: true, time_taken: timeTaken })
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('[GAME VALIDATE] Erreur update joueur:', error)
    } else {
      console.log('[GAME VALIDATE] Update réussi:', data)

      // 🔹 Redirection vers la page de classement une fois que le joueur a validé
      router.push(`/ranking/${gameId}`)
    }
  }

  if (!game) return <p>Chargement...</p>

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh' }}>
      <h1>Wikipedia Challenge</h1>
      <p>
        Départ :{' '}
        <a href={game.page_start} target="_blank" rel="noreferrer">
          {game.page_start}
        </a>
      </p>
      <p>Arrivée : {game.page_end}</p>
      <button
        onClick={handleValidate}
        style={{ marginTop:'2rem', padding:'1rem 2rem', backgroundColor:'#10B981', color:'white', borderRadius:'0.5rem' }}
      >
        J’ai trouvé !
      </button>
    </div>
  )
}
