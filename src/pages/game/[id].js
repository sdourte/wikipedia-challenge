// src/pages/game/[id].js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { getWikiPage } from '../../lib/wikiAPI'

export default function GamePage() {
  const router = useRouter()
  const { id } = router.query

  const [game, setGame] = useState(null)
  const [player, setPlayer] = useState(null)
  const [currentPage, setCurrentPage] = useState('')
  const [pageHTML, setPageHTML] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetchGame = async () => {
      try {
        const { data, error } = await supabase.from('games').select('*').eq('id', id).single()
        if (error) throw error
        setGame(data)
        setCurrentPage(data.start_page)
        const { data: playerData } = await supabase.from('players').select('*').eq('game_id', id).single()
        setPlayer(playerData)
        setLoading(false)
      } catch (err) {
        console.error(err)
        setLoading(false)
      }
    }
    fetchGame()
  }, [id])

  useEffect(() => {
    if (!currentPage) return
    const fetchPage = async () => {
      try {
        const html = await getWikiPage(currentPage)
        setPageHTML(html)
      } catch (err) {
        console.error(err)
      }
    }
    fetchPage()
  }, [currentPage])

  const handleClick = async (e) => {
    const link = e.target.closest('a')
    if (!link) return
    const href = link.getAttribute('href')
    if (href.startsWith('/wiki/')) {
      e.preventDefault()
      const newTitle = decodeURIComponent(href.replace('/wiki/', ''))
      setCurrentPage(newTitle)
      if (player) {
        await supabase.from('players').update({ current_page: newTitle }).eq('id', player.id)
      }
    }
  }

  if (loading) return <div>Chargement...</div>
  if (!game) return <div>Partie introuvable</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Wikipedia Challenge</h1>
      <h2>Page de départ : {game.start_page}</h2>
      <h3>Page cible : {game.target_page}</h3>
      {player && <p>Joueur : {player.name}</p>}
      <div onClick={handleClick} dangerouslySetInnerHTML={{ __html: pageHTML }} style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem' }}/>
    </div>
  )
}
