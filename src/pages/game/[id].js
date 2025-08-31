// src/pages/game/[id].js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function Game() {
  const router = useRouter()
  const { id: gameId } = router.query
  const [game, setGame] = useState(null)
  const [userId, setUserId] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [inputUrl, setInputUrl] = useState('')
  const [feedback, setFeedback] = useState(null)

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

  const normalize = str => decodeURIComponent(str).replace(/_/g, ' ').toLowerCase()

  const handleValidate = async () => {
    if (!game || !userId || !startTime) return

    // 🔹 Vérifie l’URL
    const wikiMatch = inputUrl.match(/\/wiki\/(.+)/)
    if (!wikiMatch) {
      setFeedback('URL invalide : doit contenir /wiki/...')
      return
    }

    const pageId = normalize(wikiMatch[1])
    const targetPageId = normalize(game.page_end.split('/wiki/')[1])

    if (pageId !== targetPageId) {
      setFeedback('Mauvaise page, essayez encore !')
      return
    }

    // 🔹 URL correcte → update temps et marque le joueur comme fini
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)
    const { data, error } = await supabase
      .from('game_players')
      .update({ finished: true, time_taken: timeTaken })
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('[GAME VALIDATE] Erreur update joueur:', error)
      setFeedback('Erreur lors de l’enregistrement du score.')
    } else {
      router.push(`/ranking/${gameId}`)
    }
  }

  if (!game) return <p>Chargement...</p>

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh' }}>
      <h1>Wikipedia Challenge</h1>
      <p>Départ : <a href={game.page_start} target="_blank" rel="noreferrer">{game.page_start}</a></p>
      <p>Arrivée : {game.page_end}</p>

      <input
        type="text"
        value={inputUrl}
        onChange={e => setInputUrl(e.target.value)}
        placeholder="Collez ici l’URL de la page finale"
        style={{ marginTop:'2rem', padding:'0.5rem', width:'300px' }}
      />

      <button
        onClick={handleValidate}
        style={{ marginTop:'1rem', padding:'1rem 2rem', backgroundColor:'#10B981', color:'white', borderRadius:'0.5rem' }}
      >
        Valider
      </button>

      {feedback && <p style={{ marginTop:'1rem', color: feedback.includes('correct') ? 'green' : 'red' }}>{feedback}</p>}
    </div>
  )
}
