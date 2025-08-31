// src/pages/waiting.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { getRandomWikiPage, getWikiPageByKeyword, searchWikiPage } from '../lib/wikiAPI'

export default function Waiting() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [players, setPlayers] = useState([])
  const [game, setGame] = useState(null)
  const [user, setUser] = useState(null)
  const [startKeyword, setStartKeyword] = useState('')
  const [endKeyword, setEndKeyword] = useState('')
  const [startManual, setStartManual] = useState('')
  const [endManual, setEndManual] = useState('')
  const [mode, setMode] = useState('random')
  const [errorMsg, setErrorMsg] = useState('')

  // Liste de thèmes pour le mode "Mot-clé"
    const themes = [
    "Auteur", "Pays", "Animal", "Histoire", "Technologie", "Sport", "Musique", "Cinéma",
    "Art", "Science", "Invention", "Philosophie", "Littérature", "Cuisine", "Mode",
    "Nature", "Mythologie", "Géographie", "Politique", "Économie", "Éducation",
    "Télévision", "Jeux vidéo", "Architecture", "Religion", "Astronomie", "Chimie",
    "Physique", "Biologie", "Psychologie", "Transport", "Événement", "Festival"
    ]

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const playerName = localStorage.getItem('playerName') || 'Joueur'

        let { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('name', playerName)
          .single()
        if (userError && userError.code !== 'PGRST116') console.error(userError)

        if (!existingUser) {
          const { data: newUser } = await supabase
            .from('users')
            .insert([{ name: playerName }])
            .select()
            .single()
          existingUser = newUser
        }
        setUser(existingUser)
        localStorage.setItem('playerId', existingUser.id)

        let { data: existingGame } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'waiting')
          .limit(1)
          .single()
        if (!existingGame) {
          const { data: newGame } = await supabase
            .from('games')
            .insert([{ page_start: '', page_end: '', page_start_title:'', page_end_title:'', status: 'waiting' }])
            .select()
            .single()
          existingGame = newGame
        }
        setGame(existingGame)

        const { data: existingGP } = await supabase
          .from('game_players')
          .select('*')
          .eq('game_id', existingGame.id)
          .eq('user_id', existingUser.id)
          .maybeSingle()

        if (!existingGP) {
          await supabase.from('game_players').insert([{ game_id: existingGame.id, user_id: existingUser.id }])
        }

        const fetchPlayers = async () => {
          const { data } = await supabase
            .from('game_players')
            .select('users(name)')
            .eq('game_id', existingGame.id)
          if (data) setPlayers(data.map(p => p.users))
        }
        fetchPlayers()
        const interval = setInterval(fetchPlayers, 2000)
        return () => clearInterval(interval)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!game) return
    const channel = supabase.channel(`game-${game.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
        (payload) => {
          setGame(payload.new)
          if (payload.new.status === 'in_progress') {
            router.push(`/game/${game.id}`)
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [game])

  const handleStartGame = async () => {
    if (!game) return
    setErrorMsg('')

    let startPage, endPage

    try {
      if (mode === 'random') {
        startPage = await getRandomWikiPage()
        endPage = await getRandomWikiPage()
      } else if (mode === 'keyword') {
        startPage = await getWikiPageByKeyword(startKeyword)
        endPage = await getWikiPageByKeyword(endKeyword)
        if (!startPage || !endPage) {
          setErrorMsg('Impossible de générer une page avec ces mots-clés.')
          return
        }
      } else if (mode === 'manual') {
        startPage = await searchWikiPage(startManual)
        endPage = await searchWikiPage(endManual)
        if (!startPage || !endPage) {
          setErrorMsg('Une ou plusieurs pages saisies sont introuvables.')
          return
        }
      }

      const { data, error } = await supabase
        .from('games')
        .update({
          page_start: startPage.url,
          page_start_title: startPage.title,
          page_end: endPage.url,
          page_end_title: endPage.title,
          status: 'in_progress'
        })
        .eq('id', game.id)
        .select()

      if (error) console.error(error)
      else console.log('Partie démarrée', data)
    } catch (err) {
      console.error(err)
      setErrorMsg('Erreur lors de la génération des pages.')
    }
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh' }}>
      <h1 style={{ fontSize:'3rem', marginBottom:'2rem' }}>Salle d’attente</h1>
      {loading && <p>Chargement...</p>}

      <h2>Joueurs :</h2>
      <ul>{players.map((p, i) => <li key={i}>{p.name}</li>)}</ul>

      {game && game.page_start_title && game.page_end_title && (
        <div style={{ marginTop:'1rem' }}>
          <p>Départ : <strong>{game.page_start_title}</strong></p>
          <p>Arrivée : <strong>{game.page_end_title}</strong></p>
        </div>
      )}

      <div style={{ marginTop:'2rem' }}>
        <label>
          <input type="radio" value="random" checked={mode==='random'} onChange={()=>setMode('random')} /> Aléatoire
        </label>
        <label style={{ marginLeft:'1rem' }}>
          <input type="radio" value="keyword" checked={mode==='keyword'} onChange={()=>setMode('keyword')} /> Mot-clé
        </label>
        <label style={{ marginLeft:'1rem' }}>
          <input type="radio" value="manual" checked={mode==='manual'} onChange={()=>setMode('manual')} /> Manuel
        </label>
      </div>

      {mode==='keyword' && (
        <div style={{ marginTop:'1rem' }}>
          <select value={startKeyword} onChange={e=>setStartKeyword(e.target.value)}>
            <option value="">Thème départ</option>
            {themes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={endKeyword} onChange={e=>setEndKeyword(e.target.value)} style={{ marginLeft:'0.5rem' }}>
            <option value="">Thème arrivée</option>
            {themes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {mode==='manual' && (
        <div style={{ marginTop:'1rem' }}>
          <input placeholder="Page départ exacte" value={startManual} onChange={e=>setStartManual(e.target.value)} />
          <input placeholder="Page arrivée exacte" value={endManual} onChange={e=>setEndManual(e.target.value)} style={{ marginLeft:'0.5rem' }} />
        </div>
      )}

      {errorMsg && <p style={{ color:'red', marginTop:'1rem' }}>{errorMsg}</p>}

      <button
        onClick={handleStartGame}
        style={{ marginTop:'2rem', padding:'1rem 2rem', backgroundColor:'#1D4ED8', color:'white', borderRadius:'0.5rem', cursor:'pointer' }}
      >
        Démarrer la partie
      </button>
    </div>
  )
}
