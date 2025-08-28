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

  // Charger la partie + un joueur (pour tester)
  useEffect(() => {
    if (!id) return
    const fetchGame = async () => {
      try {
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', id)
          .single()
        if (gameError) throw gameError

        setGame(gameData)
        setCurrentPage(gameData.start_page)

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

  // Charger la page Wikipédia courante
  useEffect(() => {
    if (!currentPage) return

    const fetchPage = async () => {
      try {
        const html = await getWikiPage(currentPage)
        // Retire toute balise <base> qui pourrait re-résoudre les liens hors de notre app
        const sanitized = html.replace(/<base[^>]*>/gi, '')
        setPageHTML(sanitized)
      } catch (err) {
        console.error('Erreur de chargement de la page Wikipédia :', err)
      }
    }
    fetchPage()
  }, [currentPage])

  // Interception DÉLÉGUÉE en phase de capture sur le conteneur
  useEffect(() => {
    const container = document.getElementById('wiki-container')
    // On scroll la page vers le haut en douceur
    window.scrollTo({ top: 0, behavior: 'smooth' })

    if (!container) return

    const handleContainerClick = async (e) => {
      // On attrape le <a> le plus proche de la cible
      const a = e.target.closest('a')
      if (!a || !container.contains(a)) return

      let href = a.getAttribute('href') || ''
      if (!href) return

      // Ignore les ancres internes/externes non pertinentes
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return

      // Détecte si c’est un lien interne Wikipédia
      // Cas possibles: "/wiki/Titre", "./Titre", "/w/index.php?title=Titre", "https://en.wikipedia.org/wiki/Titre"
      let newTitle = null

      if (href.startsWith('/wiki/')) {
        newTitle = href.slice('/wiki/'.length)
      } else if (href.startsWith('./')) {
        newTitle = href.slice(2)
      } else if (href.startsWith('/w/index.php')) {
        try {
          const url = new URL(href, 'https://en.wikipedia.org') // base nécessaire si href est relatif
          const t = url.searchParams.get('title')
          if (t) newTitle = t
        } catch {}
      } else if (/^https?:\/\/[^/]*wikipedia\.org\/wiki\//i.test(href)) {
        newTitle = href.split('/wiki/')[1]
      }

      if (!newTitle) return // On laisse passer les liens externes

      // Enlève éventuel fragment "#..."
      newTitle = decodeURIComponent(newTitle.split('#')[0])

      // Empêche la navigation native AVANT tout
      e.preventDefault()
      e.stopPropagation()
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation()
      }

      // Met à jour l’état local (charge la nouvelle page)
      setCurrentPage(newTitle)

      // Sauvegarde la progression du joueur
      if (player) {
        try {
          await supabase
            .from('players')
            .update({ current_page: newTitle })
            .eq('id', player.id)
        } catch (err) {
          console.error('Erreur mise à jour joueur :', err)
        }
      }

      // Vérifie la victoire
      if (game && newTitle === game.target_page) {
        alert('🎉 Bravo ! Vous avez atteint la page cible.')
      }
    }

    // Phase de capture = true pour choper l’événement avant la navigation par défaut
    container.addEventListener('click', handleContainerClick, true)
    return () => container.removeEventListener('click', handleContainerClick, true)
  }, [pageHTML, player, game])

  if (loading) return <div>Chargement...</div>
  if (!game) return <div>Partie introuvable</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Wikipedia Challenge</h1>
      <h2>Page de départ : {game.start_page}</h2>
      <h3>Page cible : {game.target_page}</h3>
      {player ? <p>Joueur : {player.name}</p> : <p>Aucun joueur trouvé</p>}

      <div
        id="wiki-container"
        dangerouslySetInnerHTML={{ __html: pageHTML }}
        style={{
          border: '1px solid #ccc',
          padding: '1rem',
          marginTop: '1rem',
          maxHeight: '70vh',
          overflowY: 'scroll'
        }}
      />
    </div>
  )
}
