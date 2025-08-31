// src/pages/index.js

import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')

  const handlePlay = () => {
    if (!playerName.trim()) {
      alert('Veuillez entrer un pseudo')
      return
    }
    localStorage.setItem('playerName', playerName.trim())
    router.push('/waiting')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>Wikipedia Challenge</h1>
      <input
        type="text"
        placeholder="Votre pseudo"
        value={playerName}
        onChange={e => setPlayerName(e.target.value)}
        style={{ padding: '0.5rem 1rem', fontSize: '1rem', marginBottom: '1.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
      />
      <button
        onClick={handlePlay}
        style={{
          padding: '1rem 2rem',
          backgroundColor: '#1D4ED8',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1.25rem'
        }}
      >
        Jouer
      </button>
    </div>
  )
}
