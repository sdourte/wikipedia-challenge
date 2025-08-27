// src/pages/index.js
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getRandomWikiPage } from '../lib/wikiAPI'

export default function Home() {
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
        .insert([{ start_page: startPage.title, target_page: targetPage.title }])
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
    } catch (err) {
      console.error(err)
      alert('Erreur pour rejoindre la partie')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Wikipedia Challenge</h1>
      <button onClick={createGame} disabled={loading}>{loading ? 'Création...' : 'Créer une partie'}</button>
      {game && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Partie créée !</h2>
          <p>Code / ID : {game.id}</p>
          <p>Page de départ : {game.start_page}</p>
          <p>Page cible : {game.target_page}</p>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2>Rejoindre une partie</h2>
        <input placeholder="Pseudo" value={playerName} onChange={e => setPlayerName(e.target.value)} style={{ marginRight: '1rem' }}/>
        <input placeholder="ID de la partie" value={joinGameId} onChange={e => setJoinGameId(e.target.value)} style={{ marginRight: '1rem' }}/>
        <button onClick={joinGame}>Rejoindre</button>
      </div>
    </div>
  )
}
