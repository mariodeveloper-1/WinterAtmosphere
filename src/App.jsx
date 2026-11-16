import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { descriviMeteo } from './meteo.js'
import './App.css'

const scenari = import.meta.env.DEV
  ? {
    Neve: 71,
    Pioggia: 61,
    Sereno: 0,
  }
  : null

// Coordinate e scale statiche degli alberi nella scena 3D
const CONFIGURAZIONE_ALBERI = [
  [-4, -1.8, -4, 1.2],
  [-2.5, -1.8, -2.5, 0.9],
  [0, -1.8, -2, 1.1],
  [2.4, -1.8, -3.4, 1.2],
  [4, -1.8, -4.5, 0.85],
  [-5, -1.8, 0, 0.7],
  [4.8, -1.8, 0, 0.75],
]

// Geometrie e materiali riutilizzati per tutti gli alberi
const geometriaTronco = new THREE.CylinderGeometry(0.16, 0.22, 0.8, 12)
const materialeTronco = new THREE.MeshStandardMaterial({ color: '#785342' })

const materialiChioma = [
  new THREE.MeshStandardMaterial({ color: '#416f60' }),
  new THREE.MeshStandardMaterial({ color: '#355f54' }),
]

const livelliChioma = [0, 1, 2].map((livello) => ({
  geometria: new THREE.ConeGeometry(0.85 - livello * 0.15, 1.35, 12),
  materiale: materialiChioma[livello === 1 ? 1 : 0],
  posizione: [0, 1.1 + livello * 0.53, 0],
}))

// Geometrie e materiali riutilizzati per il terreno
const geometriaTerreno = new THREE.PlaneGeometry(80, 80)
const materialeTerreno = new THREE.MeshStandardMaterial({ color: '#edf4f3' })

// Risorse condivise per le particelle delle precipitazioni
const NUM_PARTICELLE = 120
const geometriaNeve = new THREE.SphereGeometry(0.045, 6, 6)
const materialeNeve = new THREE.MeshBasicMaterial({ color: '#ffffff' })
const geometriaPioggia = new THREE.SphereGeometry(0.025, 5, 5)
const materialePioggia = new THREE.MeshBasicMaterial({ color: '#b9d8ec' })
const dummy = new THREE.Object3D()

// Ogni albero è composto da un tronco e da tre livelli di chioma con risorse condivise
function Albero({ posizione, scala = 1 }) {
  return (
    <group position={posizione} scale={scala}>
      <mesh position={[0, 0.4, 0]} geometry={geometriaTronco} material={materialeTronco} />
      {livelliChioma.map((livello, i) => (
        <mesh
          key={i}
          position={livello.posizione}
          geometry={livello.geometria}
          material={livello.materiale}
        />
      ))}
    </group>
  )
}

// Precipitazioni ottimizzate con InstancedMesh (1 singola draw call)
function Precipitazioni({ tipo }) {
  const meshRef = useRef()
  const particelleRef = useRef([])
  const isPioggia = tipo === 'pioggia'

  useEffect(() => {
    particelleRef.current = Array.from({ length: NUM_PARTICELLE }, () => ({
      x: Math.random() * 16 - 8,
      y: Math.random() * 9,
      z: Math.random() * 10 - 5,
      velocita: 0.6 + Math.random() * 0.8,
    }))
    if (!meshRef.current) return
    const lista = particelleRef.current
    for (let i = 0; i < lista.length; i++) {
      dummy.position.set(lista[i].x, lista[i].y, lista[i].z)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [tipo])

  useFrame((_, delta) => {
    if (!meshRef.current || particelleRef.current.length === 0) return
    const lista = particelleRef.current
    const fattore = isPioggia ? 5 : 1
    for (let i = 0; i < lista.length; i++) {
      const p = lista[i]
      p.y -= delta * p.velocita * fattore
      if (p.y < -1.8) p.y = 7
      dummy.position.set(p.x, p.y, p.z)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      key={tipo}
      ref={meshRef}
      args={[
        isPioggia ? geometriaPioggia : geometriaNeve,
        isPioggia ? materialePioggia : materialeNeve,
        NUM_PARTICELLE,
      ]}
    />
  )
}

function Scena({ tipo, giorno }) {
  const cielo = !giorno ? '#34445b' : tipo === 'sereno' ? '#b7dbe7' : '#aebfc8'

  return (
    <Canvas camera={{ position: [0, 2.2, 9], fov: 45 }}>
      <color attach="background" args={[cielo]} />
      <fog attach="fog" args={[cielo, 12, 30]} />
      <ambientLight intensity={giorno ? 1.4 : 0.7} />
      <directionalLight position={[4, 8, 5]} intensity={giorno ? 2 : 0.6} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.8, 0]}
        geometry={geometriaTerreno}
        material={materialeTerreno}
      />
      {CONFIGURAZIONE_ALBERI.map(([x, y, z, scala], i) => (
        <Albero key={i} posizione={[x, y, z]} scala={scala} />
      ))}
      {(tipo === 'neve' || tipo === 'pioggia') && <Precipitazioni key={tipo} tipo={tipo} />}
    </Canvas>
  )
}

async function leggiJson(url, signal) {
  const risposta = await fetch(url, { signal })
  if (!risposta.ok) throw new Error('Servizio meteo non disponibile')
  return risposta.json()
}

function App() {
  const [scenarioScelto, setScenario] = useState('')
  const [giornoSimulato, setGiornoSimulato] = useState(true)
  const scenario = import.meta.env.DEV ? scenarioScelto : ''
  const [citta, setCitta] = useState('Roma')
  const [ricerca, setRicerca] = useState('Roma')
  const [tentativo, setTentativo] = useState(0)
  const [meteo, setMeteo] = useState(null)
  const [errore, setErrore] = useState('')
  const [caricamento, setCaricamento] = useState(true)

  useEffect(() => {
    if (scenario) return

    const controller = new AbortController()
    async function carica() {
      setCaricamento(true)
      setErrore('')
      try {
        const luoghi = await leggiJson(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ricerca)}&count=1&language=it&format=json`,
          controller.signal
        )
        if (!luoghi.results?.length) throw new Error('Città non trovata. Prova un altro nome.')
        const luogo = luoghi.results[0]
        const dati = await leggiJson(
          `https://api.open-meteo.com/v1/forecast?latitude=${luogo.latitude}&longitude=${luogo.longitude}&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto`,
          controller.signal
        )
        if (!dati.current) throw new Error('Dati meteo non disponibili.')
        setMeteo({ ...dati.current, nome: luogo.name, paese: luogo.country })
      } catch (erroreRichiesta) {
        if (erroreRichiesta.name !== 'AbortError') {
          setErrore(
            erroreRichiesta.message === 'Failed to fetch'
              ? 'Connessione al servizio meteo non riuscita. Riprova.'
              : erroreRichiesta.message
          )
        }
      } finally {
        if (!controller.signal.aborted) setCaricamento(false)
      }
    }
    carica()
    return () => controller.abort()
  }, [ricerca, tentativo, scenario])

  const condizioni = scenario
    ? { weather_code: scenari[scenario], is_day: giornoSimulato ? 1 : 0 }
    : meteo

  const [descrizione, tipo] = condizioni
    ? descriviMeteo(condizioni.weather_code)
    : ['In attesa dei dati', 'neve']

  function cerca(evento) {
    evento.preventDefault()
    const nome = citta.trim()
    if (nome.length < 2) {
      setErrore('Inserisci almeno due lettere.')
      return
    }
    setRicerca(nome)
    setTentativo((numero) => numero + 1)
  }

  return (
    <main className="pagina">
      <header className="intestazione">
        <span className="marchio">✳</span>
        <span>WINTER ATMOSPHERE</span>
        <span className="stagione">UN PICCOLO MONDO, IN TEMPO REALE</span>
      </header>

      <section className="contenuto">
        <div className="testo">
          <span className="etichetta">GUARDA CHE TEMPO FA</span>
          <h1>
            Un momento
            <br />
            <em>per vedere il meteo.</em>
          </h1>
          <p>Un paesaggio d’inverno che si basa su dati reali</p>

          {!scenario && (
            <form onSubmit={cerca} className="ricerca">
              <label htmlFor="citta">Esplora una città</label>
              <div className="campo">
                <input
                  id="citta"
                  value={citta}
                  onChange={(e) => setCitta(e.target.value)}
                  placeholder="Scrivi una città"
                />
                <button type="submit">
                  Cerca <span aria-hidden="true">↗</span>
                </button>
              </div>
            </form>
          )}

          <div className="stato" aria-live="polite">
            {scenario
              ? 'Dati simulati'
              : caricamento
                ? 'Cerco il meteo…'
                : errore || (meteo ? `Meteo aggiornato per ${meteo.nome}, ${meteo.paese}` : '')}
          </div>

          {!scenario && meteo && (
            <div className="meteo">
              <div>
                <span className="localita">
                  {meteo.nome}, {meteo.paese}
                </span>
                <strong>{Math.round(meteo.temperature_2m)}°</strong>
              </div>
              <div className="dettagli">
                <span>{descrizione}</span>
                <span>Vento {Math.round(meteo.wind_speed_10m)} km/h</span>
              </div>
            </div>
          )}

          {import.meta.env.DEV && (
            <div>
              <p>
                <label htmlFor="scenario">Modalità test </label>
                <select
                  id="scenario"
                  value={scenario}
                  onChange={(evento) => setScenario(evento.target.value)}
                >
                  <option value="">Meteo reale</option>
                  {Object.keys(scenari).map((nome) => (
                    <option key={nome}>{nome}</option>
                  ))}
                </select>
              </p>
              {scenario && (
                <p>
                  <label htmlFor="luce-simulata">Illuminazione </label>
                  <select
                    id="luce-simulata"
                    value={giornoSimulato ? 'giorno' : 'notte'}
                    onChange={(evento) => setGiornoSimulato(evento.target.value === 'giorno')}>
                    <option value="giorno">Giorno</option>
                    <option value="notte">Notte</option>
                  </select>
                </p>
              )}
            </div>
          )}

          <p className="fonte">
            Dati meteo:{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{' '}
            · Località: GeoNames
          </p>
        </div>

        <div className="paesaggio">
          <div className="scena">
            <Scena tipo={tipo} giorno={condizioni ? condizioni.is_day === 1 : true} />
          </div>
          <div className="didascalia">
            <span>✳ &nbsp; IL TUO PAESAGGIO</span>
            <span>{condizioni ? descrizione.toUpperCase() : 'ATMOSFERA INVERNALE'}</span>
          </div>
        </div>
      </section>

      <footer>GUARDA CHE TEMPO FA</footer>
    </main>
  )
}

export default App
