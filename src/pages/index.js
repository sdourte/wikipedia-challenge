import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getRandomWikiPage } from '../lib/wikiAPI'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [game, setGame] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [joinGameId, setJoinGameId] = useState('')

  const createGame = async () => {
    setLoading(true)
    try {
      const startPage = await getRandomWikiPage()
      const targetPage = await getRandomWikiPage()

      const { data, error } = await supabase
        .from('games')
        .insert([{
          start_page: startPage.title,
          target_page: targetPage.title,
          start_time: new Date().toISOString(),
          start_page_url: startPage.url,
          target_page_url: targetPage.url,
          started: false, // Partie non démarrée
        }])
        .select()

      if (error) throw error
      setGame(data[0])
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la création de la partie')
    } finally {
      setLoading(false)
    }
  }

  const joinGame = async () => {
    if (!playerName || !joinGameId) {
      alert('Veuillez entrer votre pseudo et l’ID de la partie')
      return
    }
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ name: playerName, game_id: joinGameId, current_page: '' }])
        .select()
      if (error) throw error

      alert(`Vous avez rejoint la partie ! ID joueur : ${data[0].id}`)
      // Rediriger automatiquement vers la page de jeu
      router.push(`/game/${joinGameId}`)
    } catch (err) {
      console.error(err)
      alert('Erreur pour rejoindre la partie')
    }
  }

  const startGame = async () => {
    if (!game) return
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('games')
        .update({ start_time: now, started: true })
        .eq('id', game.id)
      if (error) throw error

      setGame({ ...game, start_time: now, started: true })
      alert('La partie a commencé !')
    } catch (err) {
      console.error(err)
      alert('Erreur lors du lancement de la partie')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Wikipedia Challenge</h1>
      <button onClick={createGame} disabled={loading}>
        {loading ? 'Création...' : 'Créer une partie'}
      </button>

      {game && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Partie créée !</h2>
          <p>Code / ID : {game.id}</p>
          <p>
            Page de départ :{' '}
            <a href={game.start_page_url} target="_blank" rel="noopener noreferrer">
              {game.start_page}
            </a>
          </p>
          <p>
            Page cible :{' '}
            <a href={game.target_page_url} target="_blank" rel="noopener noreferrer">
              {game.target_page}
            </a>
          </p>

          {!game.started && (
            <button onClick={startGame} style={{ marginTop: '1rem' }}>
              Lancer la partie
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2>Rejoindre une partie</h2>
        <input
          placeholder="Pseudo"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          style={{ marginRight: '1rem' }}
        />
        <input
          placeholder="ID de la partie"
          value={joinGameId}
          onChange={e => setJoinGameId(e.target.value)}
          style={{ marginRight: '1rem' }}
        />
        <button onClick={joinGame}>Rejoindre</button>
      </div>
    </div>
  )
}
