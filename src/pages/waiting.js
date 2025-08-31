import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function Waiting() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [players, setPlayers] = useState([])

  useEffect(() => {
    const playerName = localStorage.getItem('playerName') || 'Joueur'

    const createOrFetchUser = async () => {
      setLoading(true)
      try {
        // Vérifie si un joueur avec ce nom existe déjà (optionnel)
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('name', playerName)
          .single()

        let userData
        if (existingUser) {
          userData = existingUser
        } else {
          const { data, error } = await supabase
            .from('users')
            .insert([{ name: playerName }])
            .select()
            .single()
          if (error) throw error
          userData = data
        }

        localStorage.setItem('playerId', userData.id)
        setUser(userData)
      } catch (err) {
        console.error('Erreur création ou récupération utilisateur :', err)
      } finally {
        setLoading(false)
      }
    }

    createOrFetchUser()
  }, [])

  // Récupère la liste des joueurs toutes les 2 secondes
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
      if (error) {
        console.error(error)
      } else {
        setPlayers(data)
      }
    }

    fetchPlayers()
    const interval = setInterval(fetchPlayers, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleStartGame = () => {
    router.push('/game') // page du jeu à créer
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>Wikipedia Challenge</h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
        {loading ? 'Création de votre profil...' : 'En attente des autres joueurs...'}
      </p>
      
      <div style={{ marginBottom: '2rem', width: '300px', textAlign: 'left' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Joueurs présents :</h2>
        <ul>
          {players.map(p => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleStartGame}
        style={{
          padding: '1rem 2rem',
          backgroundColor: '#1D4ED8',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1.25rem'
        }}
        disabled={loading}
      >
        {loading ? 'Chargement...' : 'Démarrer la partie'}
      </button>
    </div>
  )
}
