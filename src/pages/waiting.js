// src/pages/waiting.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function Waiting() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [players, setPlayers] = useState([])
  const [game, setGame] = useState(null)
  const [user, setUser] = useState(null)

  // --------------------------
  // INIT : utilisateur + partie
  // --------------------------
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        console.log('[INIT] Lancement init...')
        const playerName = localStorage.getItem('playerName') || 'Joueur'
        console.log('[INIT] Pseudo récupéré :', playerName)

        // 🔹 1. Récupère ou crée le joueur
        let { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('name', playerName)
          .single()

        if (userError && userError.code !== 'PGRST116') console.error('[INIT] Erreur récupération utilisateur:', userError)

        if (!existingUser) {
          console.log('[INIT] Création nouvel utilisateur...')
          const { data: newUser, error: insertUserErr } = await supabase
            .from('users')
            .insert([{ name: playerName }])
            .select()
            .single()
          if (insertUserErr) console.error('[INIT] Erreur création utilisateur:', insertUserErr)
          existingUser = newUser
        }
        setUser(existingUser)
        localStorage.setItem('playerId', existingUser.id)
        console.log('[INIT] Utilisateur final:', existingUser)

        // 🔹 2. Vérifie s’il existe déjà une partie en attente
        let { data: existingGame, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'waiting')
          .limit(1)
          .single()

        if (gameError && gameError.code !== 'PGRST116') console.error('[INIT] Erreur récupération game:', gameError)

        if (!existingGame) {
          console.log('[INIT] Pas de partie en attente → création...')
          const { data: newGame, error: insertGameErr } = await supabase
            .from('games')
            .insert([{ page_start: '', page_end: '', status: 'waiting' }])
            .select()
            .single()
          if (insertGameErr) console.error('[INIT] Erreur création game:', insertGameErr)
          existingGame = newGame
        }
        setGame(existingGame)
        console.log('[INIT] Partie utilisée:', existingGame)

        // 🔹 3. Ajoute le joueur à la partie s’il n’y est pas déjà
        const { data: existingGP } = await supabase
          .from('game_players')
          .select('*')
          .eq('game_id', existingGame.id)
          .eq('user_id', existingUser.id)
          .maybeSingle()

        if (!existingGP) {
          console.log('[INIT] Ajout du joueur à la partie...')
          await supabase.from('game_players').insert([
            { game_id: existingGame.id, user_id: existingUser.id }
          ])
        }

        // 🔹 4. Récupère les joueurs régulièrement
        const fetchPlayers = async () => {
          const { data, error } = await supabase
            .from('game_players')
            .select('users(name)')
            .eq('game_id', existingGame.id)

          if (error) console.error('[FETCH PLAYERS] Erreur:', error)
          if (data) {
            console.log('[FETCH PLAYERS] Joueurs:', data)
            setPlayers(data.map(p => p.users))
          }
        }

        fetchPlayers()
        const interval = setInterval(fetchPlayers, 2000)
        return () => clearInterval(interval)

      } catch (err) {
        console.error('[INIT] Exception:', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // --------------------------
  // REALTIME : écoute des updates de la partie
  // --------------------------
  useEffect(() => {
    if (!game) return
    console.log('[REALTIME] Abonnement au canal pour la partie:', game.id)

    const channel = supabase.channel(`game-${game.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
        (payload) => {
          console.log('[REALTIME] Update détecté:', payload)
          if (payload.new.status === 'in_progress') {
            console.log('[REALTIME] Redirection vers /game/', game.id)
            router.push(`/game/${game.id}`) // 🔹 tous les joueurs vont sur la page du jeu
          }
        }
      )
      .subscribe(status => console.log('[REALTIME] Statut subscription:', status))

    return () => {
      console.log('[REALTIME] Unsubscribe du canal pour la partie:', game.id)
      supabase.removeChannel(channel)
    }
  }, [game])

  // --------------------------
  // ACTION : lancement de la partie
  // --------------------------
  const handleStartGame = async () => {
    if (!game) {
      console.warn('[START GAME] Aucun game chargé')
      return
    }

    console.log('[START GAME] Lancement mise à jour...')
    const start = 'https://fr.wikipedia.org/wiki/France'
    const end = 'https://fr.wikipedia.org/wiki/Italie'

    const { data, error } = await supabase
      .from('games')
      .update({ page_start: start, page_end: end, status: 'in_progress' })
      .eq('id', game.id)
      .select()

    if (error) console.error('[START GAME] Erreur update:', error)
    else console.log('[START GAME] Update réussie:', data)
  }

  // --------------------------
  // Rendu UI
  // --------------------------
  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>Salle d’attente</h1>
      {loading && <p>Chargement...</p>}

      <h2>Joueurs :</h2>
      <ul>
        {players.map((p, i) => (
          <li key={i}>{p.name}</li>
        ))}
      </ul>

      <button
        onClick={handleStartGame}
        style={{
          marginTop: '2rem',
          padding: '1rem 2rem',
          backgroundColor: '#1D4ED8',
          color: 'white',
          borderRadius: '0.5rem',
          cursor: 'pointer'
        }}
      >
        Démarrer la partie
      </button>
    </div>
  )
}
