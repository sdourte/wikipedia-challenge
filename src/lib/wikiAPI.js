// src/lib/wikiAPI.js

/**
 * Récupère une page aléatoire depuis l'API REST de Wikipedia
 * Renvoie { title, url }
 */
export async function getRandomWikiPage() {
  const res = await fetch('https://fr.wikipedia.org/api/rest_v1/page/random/summary')
  if (!res.ok) throw new Error('Erreur lors de la récupération de la page aléatoire')
  const data = await res.json()

  return {
    title: data.title,
    url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(data.title)}`
  }
}

/**
 * Récupère le contenu HTML complet d'une page Wikipedia
 */
export async function getWikiPage(title) {
  const url = `https://fr.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Erreur lors de la récupération de la page')
  const html = await res.text()
  return html
}

/**
 * Vérifie si une page Wikipedia existe
 * Renvoie { title, url } si elle existe, null sinon
 */
export async function searchWikiPage(title) {
  const res = await fetch(
    `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&format=json&origin=*`
  )
  if (!res.ok) throw new Error('Erreur lors de la vérification de la page')
  const data = await res.json()
  const pages = data.query.pages
  const pageId = Object.keys(pages)[0]

  if (pageId === "-1") return null // page introuvable

  return {
    title: pages[pageId].title,
    url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(pages[pageId].title)}`
  }
}

/**
 * Récupère une page Wikipedia correspondant à un mot clé
 * Renvoie { title, url } ou null si aucun résultat
 * Sélection aléatoire parmi les 5 premiers résultats pour varier le gameplay
 */
export async function getWikiPageByKeyword(keyword) {
  const res = await fetch(
    `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword)}&format=json&origin=*`
  )
  if (!res.ok) throw new Error('Erreur lors de la recherche de page par mot-clé')
  const data = await res.json()

  const results = data.query?.search
  if (!results || results.length === 0) return null

  // Choisir une page aléatoire parmi les 100 premiers résultats
  const chosen = results[Math.floor(Math.random() * Math.min(100, results.length))]
  return {
    title: chosen.title,
    url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(chosen.title)}`
  }
}
