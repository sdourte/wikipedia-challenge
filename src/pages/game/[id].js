import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function GamePage() {
  const router = useRouter()
  const { id } = router.query

  const [game, setGame] = useState(null)
  const [player, setPlayer] = useState(null)
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetchGame = async () => {
      try {
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', id)
          .single()
        if (gameError || !gameData) throw gameError

        setGame(gameData)

        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', id)
          .limit(1)
          .single()
        if (playerData) setPlayer(playerData)

        setLoading(false)
      } catch (err) {
        console.error(err)
        setLoading(false)
      }
    }
    fetchGame()
  }, [id])

  const startGame = async () => {
    if (!game) return
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('games')
        .update({ start_time: now, started: true })
        .eq('id', id)
      if (error) throw error

      setGame({ ...game, start_time: now, started: true })
      alert('La partie a commencé !')
    } catch (err) {
      console.error(err)
      alert('Erreur lors du lancement de la partie')
    }
  }

  const handleValidate = async () => {
    if (!submittedUrl || !game.started) return

    try {
      // Fonction pour normaliser une URL Wikipédia
      const normalizeWikiUrl = (url) => {
        let u = decodeURIComponent(url.trim().toLowerCase())
        // Retirer le préfixe Wikipédia si présent
        u = u.replace(/^https?:\/\/fr\.wikipedia\.org\/wiki\//, '')
        // Remplacer underscores par espaces
        u = u.replace(/_/g, ' ')
        // Supprimer les doubles espaces
        u = u.replace(/\s+/g, ' ').trim()
        return u
      }

      const submitted = normalizeWikiUrl(submittedUrl)
      const target = normalizeWikiUrl(game.target_page_url || '')

      console.log('Normalized submitted:', submitted)
      console.log('Normalized target   :', target)

      if (submitted === target) {
        const finishedAt = new Date()
        let duration = null
        if (game.start_time) {
          const startTime = new Date(game.start_time) // UTC de Supabase
          duration = Math.floor((finishedAt - startTime) / 1000)
        }

        await supabase
          .from('players')
          .update({
            finished_at: finishedAt.toISOString(),
            time: duration,
            current_url: submittedUrl,
          })
          .eq('id', player.id)

        alert(`🎉 Bravo ! Vous avez trouvé la page cible en ${duration || '?'} secondes.`)
        setPlayer((p) => ({
          ...p,
          finished_at: finishedAt,
          time: duration,
          current_url: submittedUrl,
        }))
      } else {
        alert('❌ Mauvaise page, continue à chercher !')
        console.log('Page soumise:', submittedUrl)
        console.log('Page cible   :', game.target_page_url)
      }
    } catch (err) {
      console.error('Erreur lors de la validation :', err)
    }
  }

  // Formate une durée en secondes en une chaîne lisible
  const formatDuration = (seconds) => {
    if (!seconds) return '?'
    if (seconds < 60) return `${seconds} s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs === 0 ? `${mins} min` : `${mins} min ${secs} s`
  }

  if (loading) return <div>Chargement...</div>
  if (!game) return <div>Partie introuvable</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Wikipedia Challenge</h1>

      <h2>Page de départ :</h2>
      <p>
        <a href={game.start_page_url} target="_blank" rel="noopener noreferrer">
          {game.start_page}
        </a>
      </p>

      <h2>Page cible :</h2>
      <p>{game.target_page}</p>

      {!game.started && (
        <button onClick={startGame} style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}>
          Lancer la partie
        </button>
      )}

      {game.started ? (
        player && !player.finished_at ? (
          <div style={{ marginTop: '2rem' }}>
            <input
              type="text"
              placeholder="Collez ici l’URL Wikipédia trouvée"
              value={submittedUrl}
              onChange={(e) => setSubmittedUrl(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />
            <button onClick={handleValidate} style={{ padding: '0.5rem 1rem' }}>
              Valider
            </button>
          </div>
        ) : player ? (
          <p>✅ Vous avez terminé en {formatDuration(player.time)}.</p>
        ) : (
          <p>Aucun joueur trouvé</p>
        )
      ) : (
        <p>⏳ La partie n’a pas encore commencé. Attendez que le créateur lance la partie.</p>
      )}
    </div>
  )
}
