// src/pages/game/[id].js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function Game() {
  const router = useRouter()
  const { id: gameId } = router.query
  const [game, setGame] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const init = async () => {
      if (!gameId) return
      const uid = localStorage.getItem('playerId')
      if (!uid) {
        alert('Retour à l’accueil')
        router.push('/')
        return
      }
      setUserId(uid)

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()
      if (error) {
        console.error(error)
        return
      }
      setGame(data)
      setStartTime(Date.now())
    }
    init()
  }, [gameId])

  const handleValidate = async () => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)

    await supabase
      .from('game_players')
      .update({ finished: true, time_taken: timeTaken })
      .eq('game_id', gameId)
      .eq('user_id', userId)

    router.push(`/ranking/${gameId}`) // après validation → classement
  }

  if (!game) return <p>Chargement...</p>

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh' }}>
      <h1>Wikipedia Challenge</h1>
      <p>Départ : <a href={game.page_start} target="_blank" rel="noreferrer">{game.page_start}</a></p>
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
