import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import './App.css'

// Ogni albero è composto da un tronco e da tre livelli di chioma.
function Albero({ posizione, scala = 1 }) {
  return (
    <group position={posizione} scale={scala}>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.16, 0.22, 0.8, 12]} /><meshStandardMaterial color="#785342" /></mesh>
      {[0, 1, 2].map((livello) => (
        <group key={livello} position={[0, 1.1 + livello * 0.53, 0]}>
          <mesh><coneGeometry args={[0.85 - livello * 0.15, 1.35, 12]} /><meshStandardMaterial color={livello === 1 ? '#355f54' : '#416f60'} /></mesh>
        </group>
      ))}
    </group>
  )
}

// I fiocchi vengono spostati a ogni fotogramma e ricominciano dall'alto.
function Precipitazioni({ tipo }) {
  const gruppo = useRef()
  const [particelle] = useState(() => Array.from({ length: 100 }, () => ({
    x: Math.random() * 16 - 8, y: Math.random() * 9, z: Math.random() * 10 - 5,
    velocita: 0.6 + Math.random() * 0.8,
  })))
  useFrame((_, delta) => {
    gruppo.current.children.forEach((fiocco, i) => {
      fiocco.position.y -= delta * particelle[i].velocita * (tipo === 'pioggia' ? 5 : 1)
      if (fiocco.position.y < -1.8) fiocco.position.y = 7
    })
  })
  return <group ref={gruppo}>{particelle.map((p, i) => (
    <mesh key={i} position={[p.x, p.y, p.z]}>
      <sphereGeometry args={tipo === 'pioggia' ? [0.025, 5, 5] : [0.045, 6, 6]} />
      <meshBasicMaterial color={tipo === 'pioggia' ? '#b9d8ec' : '#ffffff'} />
    </mesh>
  ))}</group>
}

function descriviMeteo(codice) {
  if (codice === 0) return ['Cielo sereno', 'sereno']
  if (codice <= 3) return ['Parzialmente nuvoloso', 'nuvoloso']
  if (codice <= 48) return ['Nebbia', 'nuvoloso']
  if ((codice >= 71 && codice <= 77) || codice === 85 || codice === 86) return ['Neve', 'neve']
  if (codice >= 95) return ['Temporale', 'pioggia']
  if ((codice >= 51 && codice <= 67) || (codice >= 80 && codice <= 82)) return ['Pioggia', 'pioggia']
  return ['Nuvoloso', 'nuvoloso']
}

function Scena({ tipo, giorno }) {
  const cielo = !giorno ? '#34445b' : tipo === 'sereno' ? '#b7dbe7' : '#aebfc8'
  const alberi = [[-4, -1.8, -4, 1.2], [-2.5, -1.8, -2.5, 0.9], [0, -1.8, -2, 1.1], [2.4, -1.8, -3.4, 1.2], [4, -1.8, -4.5, 0.85], [-5, -1.8, 0, 0.7], [4.8, -1.8, 0, 0.75]]
  return <Canvas camera={{ position: [0, 2.2, 9], fov: 45 }}>
    <color attach="background" args={[cielo]} />
    <fog attach="fog" args={[cielo, 12, 30]} />
    <ambientLight intensity={giorno ? 1.4 : 0.7} />
    <directionalLight position={[4, 8, 5]} intensity={giorno ? 2 : 0.6} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#edf4f3" /></mesh>
    {alberi.map(([x, y, z, scala], i) => <Albero key={i} posizione={[x, y, z]} scala={scala} />)}
    {(tipo === 'neve' || tipo === 'pioggia') && <Precipitazioni key={tipo} tipo={tipo} />}
  </Canvas>
}

async function leggiJson(url, signal) {
  const risposta = await fetch(url, { signal })
  if (!risposta.ok) throw new Error('Servizio meteo non disponibile')
  return risposta.json()
}

function App() {
  const [citta, setCitta] = useState('Roma')
  const [ricerca, setRicerca] = useState('Roma')
  const [tentativo, setTentativo] = useState(0)
  const [meteo, setMeteo] = useState(null)
  const [errore, setErrore] = useState('')
  const [caricamento, setCaricamento] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    async function carica() {
      setCaricamento(true)
      setErrore('')
      try {
        const luoghi = await leggiJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ricerca)}&count=1&language=it&format=json`, controller.signal)
        if (!luoghi.results?.length) throw new Error('Città non trovata. Prova un altro nome.')
        const luogo = luoghi.results[0]
        const dati = await leggiJson(`https://api.open-meteo.com/v1/forecast?latitude=${luogo.latitude}&longitude=${luogo.longitude}&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto`, controller.signal)
        if (!dati.current) throw new Error('Dati meteo non disponibili.')
        setMeteo({ ...dati.current, nome: luogo.name, paese: luogo.country })
      } catch (erroreRichiesta) {
        if (erroreRichiesta.name !== 'AbortError') setErrore(erroreRichiesta.message === 'Failed to fetch' ? 'Connessione al servizio meteo non riuscita. Riprova.' : erroreRichiesta.message)
      } finally {
        if (!controller.signal.aborted) setCaricamento(false)
      }
    }
    carica()
    return () => controller.abort()
  }, [ricerca, tentativo])

  const [descrizione, tipo] = meteo ? descriviMeteo(meteo.weather_code) : ['In attesa dei dati', 'neve']
  function cerca(evento) {
    evento.preventDefault()
    const nome = citta.trim()
    if (nome.length < 2) { setErrore('Inserisci almeno due lettere.'); return }
    setRicerca(nome)
    setTentativo(numero => numero + 1)
  }
  return <main className="pagina">
    <header className="intestazione"><span className="marchio">✳</span><span>WINTER ATMOSPHERE</span><span className="stagione">UN PICCOLO MONDO, IN TEMPO REALE</span></header>
    <section className="contenuto">
      <div className="testo"><span className="etichetta">GUARDA CHE TEMPO FA</span><h1>Un momento<br /><em>per vedere il meteo.</em></h1><p>Un paesaggio d’inverno che si basa su dati reali</p>
        <form onSubmit={cerca} className="ricerca"><label htmlFor="citta">Esplora una città</label><div className="campo"><input id="citta" value={citta} onChange={e => setCitta(e.target.value)} placeholder="Scrivi una città" /><button type="submit">Cerca <span aria-hidden="true">↗</span></button></div></form>
        <div className="stato" aria-live="polite">{caricamento ? 'Cerco il meteo…' : errore || (meteo ? `Meteo aggiornato per ${meteo.nome}, ${meteo.paese}` : '')}</div>
        {meteo && <div className="meteo"><div><span className="localita">{meteo.nome}, {meteo.paese}</span><strong>{Math.round(meteo.temperature_2m)}°</strong></div><div className="dettagli"><span>{descrizione}</span><span>Vento {Math.round(meteo.wind_speed_10m)} km/h</span></div></div>}
        <p className="fonte">Dati meteo: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · Località: GeoNames</p>
      </div>
      <div className="paesaggio"><div className="scena"><Scena tipo={tipo} giorno={meteo ? meteo.is_day === 1 : true} /></div><div className="didascalia"><span>✳ &nbsp; IL TUO PAESAGGIO</span><span>{meteo ? descrizione.toUpperCase() : 'ATMOSFERA INVERNALE'}</span></div></div>
    </section>
    <footer>GUARDA CHE TEMPO FA</footer>
  </main>
}
export default App
