// src/lib/validateUrl.js

export function isCorrectWikiUrl(inputUrl, targetUrl) {
  try {
    const normalize = (url) => {
      // Récupère la partie après /wiki/
      const wikiPart = url.split('/wiki/')[1]
      if (!wikiPart) return null
      // Décode les caractères spéciaux et remplace les %20 ou _ par espace ou tiret si besoin
      return decodeURIComponent(wikiPart.replace(/_/g, ' '))
    }

    const inputPart = normalize(inputUrl)
    const targetPart = normalize(targetUrl)

    if (!inputPart || !targetPart) return false

    // Comparaison insensible à la casse
    return inputPart.toLowerCase() === targetPart.toLowerCase()
  } catch (err) {
    console.error('[validateUrl] Erreur lors de la vérification URL', err)
    return false
  }
}
