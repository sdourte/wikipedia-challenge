// src/lib/wikiAPI.js
export async function getRandomWikiPage() {
  const res = await fetch('https://fr.wikipedia.org/api/rest_v1/page/random/summary')
  if (!res.ok) throw new Error('Erreur lors de la récupération de la page')
  const data = await res.json()

  return {
    title: data.title,
    url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(data.title)}`
  }
}

export async function getWikiPage(title) {
  const url = `https://fr.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Erreur lors de la récupération de la page')
  const html = await res.text()
  return html
}
