# Winter Atmosphere

Una piccola applicazione meteo con un paesaggio invernale in 3D. Cerca una città per vedere la temperatura, le condizioni attuali e la velocità del vento. Il cielo e le precipitazioni della scena cambiano in base al meteo e all'alternanza tra giorno e notte.

## Avvio del progetto

Per avviare il progetto servono [Node.js e npm](https://nodejs.org/). Apri il terminale nella cartella del progetto e installa le dipendenze:

```bash
npm install
```

Avvia il server di sviluppo:

```bash
npm run dev
```

Apri nel browser l'indirizzo `Local` mostrato nel terminale. All'avvio l'app cerca il meteo di Roma; puoi cercare un'altra città usando il campo nella pagina. Per ricevere i dati meteo è necessaria una connessione Internet.

## Comandi disponibili

- `npm run dev`: avvia l'app in modalità sviluppo.
- `npm run build`: crea nella cartella `dist` la versione pronta per la pubblicazione.
- `npm run preview`: mostra in locale la versione compilata, dopo aver eseguito la build.
- `npm run lint`: controlla il codice con ESLint.

## Come è costruita

- **React** gestisce l'interfaccia, la ricerca e i dati meteo.
- **Three.js e React Three Fiber** creano e animano la scena 3D.
- **Vite** avvia il server di sviluppo e compila il progetto.
- **Open-Meteo** fornisce le coordinate delle città e i dati meteo; i dati delle località sono basati su GeoNames.

Il codice principale è in `src/App.jsx`. Gli stili sono in `src/App.css` e `src/index.css`.

Dati meteo: [Open-Meteo](https://open-meteo.com/). Dati delle località: [GeoNames](https://www.geonames.org/).

## Verifica del progetto

Esegui `npm test` per verificare come i codici di Open-Meteo vengono tradotti in descrizioni ed effetti. I test usano il runner integrato di Node.js e funzionano anche senza connessione.

Con `npm run dev`, scegli **Neve**, **Pioggia** o **Sereno** nel menu **Modalità test**, poi scegli **Giorno** o **Notte** nel menu **Illuminazione**. Per una prova manuale, passa da Neve di giorno a Neve di notte e verifica che il cielo si scurisca mentre i fiocchi continuano a cadere. Durante la simulazione la ricerca e le richieste meteo sono sospese. Seleziona **Meteo reale** per riprenderle. I menu sono disponibili solo in sviluppo.

Per una prova visiva su iPhone, avvia `npm run dev -- --host` e apri in Safari l'indirizzo **Network** mostrato nel terminale. Mac e iPhone devono essere sulla stessa rete Wi-Fi.
