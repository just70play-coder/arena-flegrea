# 🌋 Arena Flegrea

Tracker di prezzi dei minerali basato su aste e listini, pensato per chi colleziona
e vuole capire quanto vale davvero un pezzo. I dati vengono inseriti **a mano**,
una scelta deliberata: niente scraping, niente dipendenze da siti terzi.

## Funzioni

- **Quick Add** — inserimento rapido di un risultato d'asta (mercato, prezzo, peso, note,
  minerali secondari per le associazioni)
- **Database Prezzi** — gruppi minerale + località, filtri stile Excel (mercato, data,
  prezzo, peso), ricerca libera, ordinamento, paginazione
- **Valutatore** — stima del valore di un pezzo:
  `Base di mercato × fattore località (giacimento tipico) × Score qualità × fattore integrità`
  con scoring fotografico su 6 criteri ponderati e scomposizione trasparente del calcolo
- **Statistiche** — distribuzione per mercato, trend temporale, campioni notevoli
- **Backup** — esportazione e importazione del database in JSON

## Come si usa

Apri `index.html` nel browser (basta un doppio clic) oppure lancia un server statico:

    python3 -m http.server

I dati sono salvati nel **localStorage del browser**: prima di cambiare computer o
browser, esporta un backup da Impostazioni → "💾 Esporta Backup".

## Sviluppo e test

La suite di test (jsdom) vive in `test/`:

    cd test
    npm install
    node run-tests.js    # 327 asserzioni
    node smoke.js        # avvio app senza errori

## Convenzioni del progetto

- Tutto in italiano: nomi di funzioni, commenti, UI
- Fine riga **CRLF** (workflow Notepad++): `.gitattributes` (`* -text`) disattiva
  ogni conversione, il clone resta identico su qualsiasi PC
- Commenti di sezione nel formato `// ====`
- Nessun framework: HTML + CSS + JavaScript vanilla, zero build

## Storia delle versioni

| versione | cosa |
|---|---|
| v0.2.5.1 | filtri Excel-like, provenienza sconosciuta (0.7x) |
| v0.2.6 | località canoniche e giacimenti tipici |
| v0.2.7 | Phase 5: scoring fotografico (6 criteri ponderati) |
| v0.2.8 | scala: paginazione, tetto liste filtri, migrazione canonica, minerali secondari |
| v0.2.9 | restyling: palette Vesuviano-Partenopeo (dark azzurro + glow cyberpunk) + stelle cadenti con scoppietti, Vesuvio e Monte Somma (profilo a M a dimensioni fisse), luci del golfo, vele e luna che sorge |
