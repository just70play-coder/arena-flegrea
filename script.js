// ===========================
// ARENA FLEGREA v0.2.8
// Phase 4: Filtri Excel-like + v0.2.5: Provenienza Sconosciuta (0.7x)
// v0.2.5.1: fix lookup fattori località specifici per minerale
// v0.2.6: LOCALITÀ CANONICHE — alias, corrispondenza case-insensitive e
//         fattori per giacimento tipico (es. hardystonite da Parker Shaft 1.6x)
// v0.2.7: PHASE 5 — scoring fotografico: 6 criteri ponderati (25/20/20/15/10/10),
//         fattore integrità derivato dal voto, formula Valore = Base × Località ×
//         (Score/10) × Integrità, scomposizione trasparente nel risultato
// v0.2.8: SCALA — paginazione di griglia e modal, liste dei filtri con tetto,
//         migrazione canonicalizzante dei gruppi, minerali secondari delle associazioni
// (Database Prezzi + Modal dettagli)
// v0.3.0: SCORING FOTOGRAFICO v2 — estetica RIMossa, 8 criteri (15/15/15/14/13/12/8/8):
//         cristallinita', integrita', trasparenza, fluorescenza, rarita', dimensioni,
//         iridescenza, riflessione; formula del valore invariata
// ===========================

// ===========================
// CONFIGURAZIONE
// ===========================

const CONFIG = {
    pesiMercato: {
        catawiki: 0.40,
        ebay: 0.30,
        etsy: 0.15,
        heritage: 0.10,
        dealer: 0.05
    },
    fattoreCorrezioneEtsy: 0.7,
    
    // v0.2.5: località sconosciuta (coefficiente 0.7x = minimo del range Phase 5: 0.7-1.5)
    localitaSconosciuta: 'Sconosciuta',
    fattoreLocalitaSconosciuta: 0.7,
    
    // v0.2.6: le località specifiche per minerale vivono in LOCALITA_CANONICHE (sotto),
    // che aggiunge alias, corrispondenza case-insensitive e fattori per minerale
    
    // v0.2.8: struttura per database con centinaia di campioni
    gruppoPerPage: 12,        // gruppi (minerale + località) per pagina nel Database Prezzi
    campioniPerPagina: 20,    // campioni per pagina nel modal dei dettagli
    sogliaPopoverFiltri: 150, // oltre questa soglia le liste dei filtri mostrano solo le prime voci
    
    // Fallback per una località NON presente in LOCALITA_CANONICHE: fattore neutro 1.0
    // (scelta v0.2.6: nessuna penalità implicita; solo "Sconosciuta" vale 0.7)
    fattoreLocalitaDefault: 1.0,
    
    // Fallback generico per località: usato quando LOCALITA_CANONICHE non ha un
    // fattore specifico per quel minerale. Le voci 'Sconosciuta' e 'altra località'
    // sono volutamente assenti: la prima vale fattoreLocalitaSconosciuta (0.7),
    // la seconda fattoreLocalitaDefault (1.0).
    // ===========================
    // PHASE 5: SCORING FOTOGRAFICO (pesi fissi dalla specifica di Fabio)
    // v0.3.0: estetica RIMossa; 8 criteri, totale 100 (15/15/15/14/13/12/8/8)
    // ===========================
    scoringCriteri: {
        cristallinita: { peso: 15, etichetta: 'Cristallinità',
            descrizione: 'Sviluppo e definizione dei cristalli' },
        integrita: { peso: 15, etichetta: 'Integrità',
            descrizione: 'Assenza di rotture, riparazioni e scheggiature' },
        trasparenza: { peso: 15, etichetta: 'Trasparenza',
            descrizione: 'Grado di trasmissione della luce' },
        fluorescenza: { peso: 14, etichetta: 'Fluorescenza',
            descrizione: 'Colori emessi sotto luce ultravioletta' },
        rarita: { peso: 13, etichetta: 'Rarità',
            descrizione: 'Frequenza della specie e di questa forma' },
        dimensioni: { peso: 12, etichetta: 'Dimensioni',
            descrizione: 'Grandezza rispetto allo standard della specie' },
        iridescenza: { peso: 8, etichetta: 'Iridescenza',
            descrizione: 'Gioco di colori sulla superficie dei cristalli' },
        riflessione: { peso: 8, etichetta: 'Riflessione',
            descrizione: 'Brillantezza e specchiatura delle facce' }
    },
    // Voto di default: 5 per tutti i criteri, 10 per Integrità
    // (10 = integrità perfetta: a default lo Score vale 5.5/10 come nella specifica)
    scoringDefault: 5,
    scoringDefaultIntegrita: 10,
    // Il fattore integrità DERIVA dal voto del criterio (decisione Fabio: opzione C)
    fattoreIntegritaMin: 0.60,
    fattoreIntegritaMax: 1.00,
    // Comportamento v0.2.5.1 per le chiamate senza score (retrocompatibilità)
    fattoreQualitaLegacy: 0.5,
    fattoreIntegritaLegacy: 0.95,
    
    fattoriLocalita: {
        'Monte Nuovo': 1.4,
        'Solfatara': 1.5,
        'Madagascar': 1.1,
        'Brasile': 1.0
    }
};

// ===========================
// v0.2.6: LOCALITÀ CANONICHE
// Giacimenti tipici riconosciuti: ogni località ha i suoi alias e il fattore
// specifico per minerale. È la regola fondamentale del progetto: lo stesso
// minerale vale di più se viene dal giacimento di riferimento.
//   minerali: fattore > 1 = giacimento tipico, < 1 = provenienza ordinaria
//   alias: scritture accettate (senza accenti, minuscole, anche parziali)
// ===========================

const LOCALITA_CANONICHE = {
    'Parker Shaft (Franklin, New Jersey)': {
        alias: ['parker shaft', 'franklin mine', 'franklin', 'franklin mining district',
                'new jersey', 'sussex county', 'franklinite mine'],
        minerali: {
            hardystonite: 1.6, clinohedrite: 1.6, willemite: 1.5,
            franklinite: 1.4, datolite: 1.3, calcite: 1.15
        }
    },
    'Monte Nuovo': {
        alias: ['monte nuovo', 'montenuovo', 'quarantola', 'monte nuovo (pozzuoli)',
                'campi flegrei monte nuovo'],
        minerali: { sanidino: 1.4 }
    },
    'Solfatara': {
        alias: ['solfatara', 'solfatara di pozzuoli', 'la solfatara'],
        minerali: { sanidino: 1.5 }
    },
    'Pisciarelli': {
        alias: ['pisciarelli', 'pisciarelli di agnano'],
        minerali: { sanidino: 1.6 }
    },
    'Vesuvio': {
        alias: ['vesuvio', 'somma vesuvio', 'monte somma', 'vesuvius'],
        minerali: { sanidino: 1.2 }
    },
    'Madagascar': {
        alias: ['madagascar'],
        minerali: { 'diaspro rosso': 1.2, quarzo: 1.1 }
    },
    'Brasile': {
        alias: ['brasile', 'brazil'],
        minerali: { quarzo: 1.15, 'diaspro rosso': 1.0 }
    },
    'Alpi': {
        alias: ['alpi', 'alps', 'alpi italiane'],
        minerali: { quarzo: 1.25 }
    },
    'Egitto': {
        alias: ['egitto', 'egypt'],
        minerali: { 'diaspro rosso': 1.3 }
    },
    'Australia': {
        alias: ['australia'],
        minerali: { 'diaspro rosso': 1.15 }
    },
    'Sconosciuta': {
        alias: ['sconosciuta', 'ignota', 'unknown', 'provenienza sconosciuta'],
        minerali: {}
    }
};

// Indice di risoluzione: alias (minuscoli) -> nome canonico, ordinati dal più lungo
// al più corto perché la corrispondenza esatta venga provata prima di quella parziale
const INDICE_LOCALITA = (() => {
    const indice = {};
    for (const [nome, dati] of Object.entries(LOCALITA_CANONICHE)) {
        for (const alias of [nome, ...dati.alias]) {
            indice[alias.toLowerCase().trim()] = nome;
        }
    }
    return indice;
})();

const ALIAS_MINERALI = {
 'diaspro rosso': ['jasper red', 'jaspis', 'red jasper', 'jasper rosso', 'ocean jasper', 'picture jasper', 'fire jasper', 'vivid jasper'],
 'quarzo': ['quartz', 'cristallo di rocca', 'rock crystal', 'clear quartz', 'vivid quartz'],
 'ametista': ['amethyst', 'ametista viola', 'purple amethyst', 'vivid amethyst'],
 'citrino': ['citrine', 'citrino naturale'],
 'calcite': ['calcite', 'calcita'],
 'fluorite': ['fluorite', 'fluorita', 'fluorspar'],
 'sanidino': ['sanidine', 'sanidina'],
 'leucite': ['leucita', 'leucite crystal'],
 'hauyne': ['hauyna', 'haüyne', 'hauynite'],
 'agata': ['agate', 'agata muschiata', 'moss agate'],
 'opale': ['opal', 'opale di fuoco', 'fire opal']
};

let dbPrezzi = {};

// ===========================
// DATABASE
// ===========================

function caricaDatabase() {
    const saved = localStorage.getItem('arenaFlegreaPrezzi');
    if (saved) {
        try {
            dbPrezzi = JSON.parse(saved);
            console.log('✓ Database caricato:', Object.keys(dbPrezzi).length, 'minerali');
        } catch (e) {
            console.error('Errore caricamento:', e);
            dbPrezzi = {};
        }
    }
    // v0.2.8: allinea i dati esistenti alle forme canoniche (minerale e località)
    canonicalizzaDatabase();
}

// v0.2.8 MIGRAZIONE: riscrive i gruppi con minerale e località canonici e accorpa
// i duplicati che ne derivano. Non distruttiva: nessun campione viene perso e i
// campioni accorpati mantengono l'ordine (prima quelli del gruppo canonico).
function canonicalizzaDatabase() {
    const migrato = {};
    let gruppiRinominati = 0;
    let gruppiAccorpati = 0;
    
    for (const gruppo of Object.values(dbPrezzi)) {
        const minerale = normalizzaMinerale(gruppo.minerale);
        const localita = normalizzaLocalita(gruppo.localita);
        const chiave = generaChiave(minerale, localita);
        
        if (!migrato[chiave]) {
            migrato[chiave] = {
                minerale: minerale,
                localita: localita,
                campioni: gruppo.campioni.slice(),
                medie: {}
            };
        } else {
            migrato[chiave].campioni.push(...gruppo.campioni);
            gruppiAccorpati++;
        }
        
        if (minerale !== gruppo.minerale || localita !== gruppo.localita) gruppiRinominati++;
    }
    
    if (gruppiRinominati === 0 && gruppiAccorpati === 0) return false;
    
    for (const gruppo of Object.values(migrato)) {
        gruppo.medie = calcolaMedie(gruppo.campioni);
    }
    
    dbPrezzi = migrato;
    salvaDatabase();
    console.log('✓ Canonicalizzazione: ' + gruppiRinominati + ' gruppi rinominati, ' +
                gruppiAccorpati + ' accorpati');
    return true;
}

function salvaDatabase() {
    try {
        localStorage.setItem('arenaFlegreaPrezzi', JSON.stringify(dbPrezzi));
        aggiornaStatistiche();
        aggiornaDatalist(); // ← AGGIUNGI QUESTA
    } catch (e) {
        alert('Errore salvataggio database');
    }
}

function aggiornaDatalist() {
    // Set per evitare duplicati
    const minerali = new Set();
    const localita = new Set();
    
    // Estrai minerali e località dal database
    Object.values(dbPrezzi).forEach(gruppo => {
        minerali.add(gruppo.minerale);
        localita.add(gruppo.localita);
    });
    
    // Aggiungi anche gli alias dei minerali
    Object.keys(ALIAS_MINERALI).forEach(nome => {
        minerali.add(nome.charAt(0).toUpperCase() + nome.slice(1));
    });
    
    // v0.2.6: aggiungi le località canoniche (così l'utente seleziona sempre la stessa
    // scrittura e non frammenta i gruppi con varianti)
    Object.keys(LOCALITA_CANONICHE).forEach(nome => localita.add(nome));
    
    // Converti in array ordinati
    const listaMinerali = Array.from(minerali).sort();
    const listaLocalita = Array.from(localita).sort();
    
    console.log('📋 Aggiornamento datalist:', listaMinerali.length, 'minerali,', listaLocalita.length, 'località');
    
    // Popola i datalist per Quick Add
    const datalistMineraliQA = document.getElementById('datalist-minerali-qa');
    const datalistLocalitaQA = document.getElementById('datalist-localita-qa');
    
    if (datalistMineraliQA) {
        datalistMineraliQA.innerHTML = listaMinerali.map(m => `<option value="${m}">`).join('');
        console.log('✓ datalist-minerali-qa popolato');
    } else {
        console.error('❌ datalist-minerali-qa non trovato!');
    }
    
    if (datalistLocalitaQA) {
        datalistLocalitaQA.innerHTML = listaLocalita.map(l => `<option value="${l}">`).join('');
        console.log('✓ datalist-localita-qa popolato');
    } else {
        console.error('❌ datalist-localita-qa non trovato!');
    }
    
    // Popola i datalist per Valutatore
    const datalistMineraliVal = document.getElementById('datalist-minerali-val');
    const datalistLocalitaVal = document.getElementById('datalist-localita-val');
    
    if (datalistMineraliVal) {
        datalistMineraliVal.innerHTML = listaMinerali.map(m => `<option value="${m}">`).join('');
        console.log('✓ datalist-minerali-val popolato');
    } else {
        console.error('❌ datalist-minerali-val non trovato!');
    }
    
    if (datalistLocalitaVal) {
        datalistLocalitaVal.innerHTML = listaLocalita.map(l => `<option value="${l}">`).join('');
        console.log('✓ datalist-localita-val popolato');
    } else {
        console.error('❌ datalist-localita-val non trovato!');
    }
}

// ===========================
// UTILITY
// ===========================

function normalizzaMinerale(input) {
 const inputLower = input.toLowerCase().trim()
  .replace(/[\/\\'"]/g, '') // Rimuove caratteri speciali
  .replace(/\s+/g, ' ');    // Normalizza spazi
 
 // Parole da NON capitalizzare (preposizioni, congiunzioni)
 const paroleBasse = ['con', 'e', 'di', 'da', 'in', 'su', 'per', 'a', 'il', 'la', 'lo', 'le', 'gli', 'dei', 'delle'];
 
 // Se contiene "con", "e", o virgola → capitalizza intelligente
 if (/\s+con\s+|\s+e\s+|,/.test(inputLower)) {
  return input.trim().split(' ').map((parola, idx) => {
   const parolaLower = parola.toLowerCase();
   // Prima parola sempre maiuscola, altre solo se NON sono preposizioni
   if (idx === 0 || !paroleBasse.includes(parolaLower)) {
    return parola.charAt(0).toUpperCase() + parola.slice(1).toLowerCase();
   }
   return parolaLower; // Preposizione in minuscolo
  }).join(' ');
 }
 
 // Cerca corrispondenza ESATTA (non parziale)
 for (const [standard, aliases] of Object.entries(ALIAS_MINERALI)) {
  if (inputLower === standard) return standard.charAt(0).toUpperCase() + standard.slice(1);
  
  for (const alias of aliases) {
   if (inputLower === alias) {
    return standard.charAt(0).toUpperCase() + standard.slice(1);
   }
  }
 }
 
 // Capitalizza se non trovato
 return inputLower.charAt(0).toUpperCase() + inputLower.slice(1);
}

// Sanitizza località (rimuove backslash e normalizza)
function sanitizzaLocalita(input) {
 return input
  .replace(/[\\]/g, '')  // Rimuove \
  .replace(/\s+/g, ' ')  // Normalizza spazi
  .trim();
}

// v0.2.5: normalizza località — varianti di "sconosciuta" → località canonica
// (evita gruppi duplicati: "sconosciuta", "SCONOSCIUTA", " Sconosciuta " → "Sconosciuta")
function normalizzaLocalita(input) {
    const pulita = sanitizzaLocalita(input);
    // v0.2.6: risolve la scrittura alla località canonica (alias + case-insensitive).
    // Se non c'è corrispondenza la località resta come digitata: niente dati persi.
    return localitaCanonica(pulita).nome || pulita;
}

// v0.2.8: legge il campo "minerali secondari" (separati da virgola) in un array normalizzato
function parseMineraliSecondari(testo) {
    return String(testo || '')
        .split(',')
        .map(parte => normalizzaMinerale(parte.trim()))
        .filter(Boolean);
}

// Estrae il minerale DOMINANTE da un'associazione multiminerale
// ("Hardystonite, Clinohedrite e Willemite" -> "Hardystonite")
function estraiMineraleDominante(input) {
    const primo = String(input || '').split(/,|\be\b|\+|\//i)[0].trim();
    return primo || String(input || '').trim();
}

// Risolve una località alla forma canonica: corrispondenza esatta sugli alias,
// poi parziale (l'alias compare come parola all'interno della stringa digitata).
// Restituisce { nome, dati } oppure { nome: null, dati: null } se non censita.
function localitaCanonica(input) {
    const pulita = sanitizzaLocalita(String(input == null ? '' : input)).toLowerCase();
    if (!pulita) return { nome: null, dati: null };

    if (INDICE_LOCALITA[pulita]) {
        const nome = INDICE_LOCALITA[pulita];
        return { nome: nome, dati: LOCALITA_CANONICHE[nome] };
    }

    const parole = pulita.split(/[^a-z0-9àèéìòù]+/).filter(Boolean);
    for (const alias of Object.keys(INDICE_LOCALITA).sort((a, b) => b.length - a.length)) {
        const tokenAlias = alias.split(' ');
        if (tokenAlias.length > 1 && pulita.includes(alias)) {
            const nome = INDICE_LOCALITA[alias];
            return { nome: nome, dati: LOCALITA_CANONICHE[nome] };
        }
        if (tokenAlias.length === 1 && alias.length > 3 && parole.includes(alias)) {
            const nome = INDICE_LOCALITA[alias];
            return { nome: nome, dati: LOCALITA_CANONICHE[nome] };
        }
    }

    return { nome: null, dati: null };
}

// ===========================
// PHASE 5: SCORING FOTOGRAFICO
// ===========================

// Punteggio ponderato 1-10 sugli 8 criteri (pesi v0.3.0: 15/15/15/14/13/12/8/8)
function calcolaScore(voti) {
    let somma = 0;
    let pesoTotale = 0;
    const votiNormalizzati = {};
    
    for (const [chiave, criterio] of Object.entries(CONFIG.scoringCriteri)) {
        const voto = Number(voti ? voti[chiave] : NaN);
        const votoSicuro = isNaN(voto) ? CONFIG.scoringDefault : Math.min(10, Math.max(1, voto));
        votiNormalizzati[chiave] = votoSicuro;
        somma += votoSicuro * criterio.peso;
        pesoTotale += criterio.peso;
    }
    
    // I voti normalizzati viaggiano con lo score: chi calcola il valore ha sempre
    // a disposizione il voto di integrità da cui deriva il fattore correttivo
    return {
        voti: votiNormalizzati,
        score: pesoTotale > 0 ? somma / pesoTotale : 0,
        suDieci: pesoTotale > 0 ? somma / pesoTotale / 10 : 0
    };
}

// Il fattore integrità 0.60-1.00 DERIVA dal voto del criterio Integrità (1 → 0.60, 10 → 1.00)
function fattoreDaIntegrita(voto) {
    const v = Math.min(10, Math.max(1, Number(voto) || CONFIG.scoringDefaultIntegrita));
    return CONFIG.fattoreIntegritaMin + (v - 1) * (CONFIG.fattoreIntegritaMax - CONFIG.fattoreIntegritaMin) / 9;
}

// Legge i 6 cursori del Valutatore
function leggiVotiScoring() {
    const voti = {};
    for (const chiave of Object.keys(CONFIG.scoringCriteri)) {
        const input = document.getElementById('score-' + chiave);
        voti[chiave] = input ? Number(input.value) : CONFIG.scoringDefault;
    }
    return voti;
}

// Aggiorna il pannello live "Score X.X / 10" sotto i cursori
function aggiornaPannelloScoring() {
    const voti = leggiVotiScoring();
    const { score } = calcolaScore(voti);
    const fattore = fattoreDaIntegrita(voti.integrita);
    
    const valore = document.getElementById('score-valore');
    if (valore) valore.textContent = score.toFixed(1);
    const fattoreEl = document.getElementById('score-fattore-integrita');
    if (fattoreEl) fattoreEl.textContent = fattore.toFixed(2);
    
    const percentuale = document.getElementById('score-barra-riempimento');
    if (percentuale) percentuale.style.width = (score * 10).toFixed(1) + '%';
    
    return { voti: voti, score: score, fattoreIntegrita: fattore };
}

// Rimette i cursori ai valori di default
function resetScoring() {
    for (const [chiave, criterio] of Object.entries(CONFIG.scoringCriteri)) {
        const input = document.getElementById('score-' + chiave);
        if (input) input.value = chiave === 'integrita' ? CONFIG.scoringDefaultIntegrita : criterio.peso ? CONFIG.scoringDefault : 5;
        const output = document.getElementById('score-valore-' + chiave);
        if (output) output.textContent = input ? input.value : CONFIG.scoringDefault;
    }
    aggiornaPannelloScoring();
}

function getFattoreLocalita(minerale, localita) {
    // v0.2.5: provenienza sconosciuta → coefficiente fisso 0.7x
    const localitaTesto = String(localita == null ? '' : localita).trim().toLowerCase();
    if (localitaTesto === CONFIG.localitaSconosciuta.toLowerCase()) {
        return CONFIG.fattoreLocalitaSconosciuta;
    }
    
    // v0.2.6: il fattore si cerca sulla LOCALITÀ CANONICA, non sulla stringa digitata
    const canonica = localitaCanonica(localita);
    const nomeCanonica = canonica.nome;
    
    // Sconosciuta scritta in una variante non prevista dal controllo sopra
    if (nomeCanonica === CONFIG.localitaSconosciuta) {
        return CONFIG.fattoreLocalitaSconosciuta;
    }
    
    // Associazioni multiminerali: il fattore segue il minerale dominante
    const mineraleNorm = normalizzaMinerale(estraiMineraleDominante(minerale)).toLowerCase();
    
    // 1) fattore specifico minerale + località (giacimento tipico)
    if (canonica.dati && canonica.dati.minerali[mineraleNorm] !== undefined) {
        return canonica.dati.minerali[mineraleNorm];
    }
    
    // 2) fallback generico per quella località
    if (nomeCanonica && CONFIG.fattoriLocalita[nomeCanonica] !== undefined) {
        return CONFIG.fattoriLocalita[nomeCanonica];
    }
    
    // 3) località non censita → fattore neutro
    return CONFIG.fattoreLocalitaDefault;
}

function generaChiave(minerale, localita) {
    return `${normalizzaMinerale(minerale)}_${localita}`.toLowerCase().replace(/\s+/g, '_');
}

function calcolaMedie(campioni) {
    const medie = {};
    const mercati = ['catawiki', 'ebay', 'etsy', 'heritage', 'dealer'];
    
    mercati.forEach(mercato => {
        const campioniMercato = campioni.filter(c => c.mercato === mercato);
        
        if (campioniMercato.length > 0) {
            const prezzi = campioniMercato.map(c => c.prezzo);
            const pesi = campioniMercato.map(c => c.peso).filter(p => p > 0);
            const prezziGrammo = campioniMercato.map(c => c.prezzogrammo).filter(pg => pg > 0);
            
            medie[mercato] = {
                mediaPrezzo: prezzi.reduce((a, b) => a + b, 0) / prezzi.length,
                mediaPeso: pesi.length > 0 ? pesi.reduce((a, b) => a + b, 0) / pesi.length : 0,
                mediaPrezzoGrammo: prezziGrammo.length > 0 ? prezziGrammo.reduce((a, b) => a + b, 0) / prezziGrammo.length : 0,
                min: Math.min(...prezzi),
                max: Math.max(...prezzi),
                n: campioniMercato.length
            };
        }
    });
    
    return medie;
}

// ===========================
// STATISTICHE AVANZATE
// ===========================

function calcolaStatisticheAvanzate(campioni) {
    if (!campioni || campioni.length === 0) {
        return null;
    }
    
    const prezzi = campioni.map(c => c.prezzo).sort((a, b) => a - b);
    const prezziGrammo = campioni.map(c => c.prezzogrammo).filter(pg => pg > 0).sort((a, b) => a - b);
    const pesi = campioni.map(c => c.peso).sort((a, b) => a - b);
    
    // Calcola mediana
    function mediana(arr) {
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
    }
    
    // Calcola deviazione standard
    function devStandard(arr) {
        const media = arr.reduce((a, b) => a + b, 0) / arr.length;
        const varianza = arr.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / arr.length;
        return Math.sqrt(varianza);
    }
    
    // Trova campione più costoso e più economico
    const indicePiuCostoso = campioni.indexOf(campioni.reduce((max, c) => c.prezzo > max.prezzo ? c : max, campioni[0]));
    const indicePiuEconomico = campioni.indexOf(campioni.reduce((min, c) => c.prezzo < min.prezzo ? c : min, campioni[0]));
    
    // Migliore affare (€/g più basso)
    const campioneMiglioreAffare = campioni.filter(c => c.prezzogrammo > 0)
        .reduce((min, c) => c.prezzogrammo < min.prezzogrammo ? c : min, campioni.filter(c => c.prezzogrammo > 0)[0]);
    
    return {
        totale: campioni.length,
        
        // Prezzi
        prezzoMin: Math.min(...prezzi),
        prezzoMax: Math.max(...prezzi),
        prezzoMedia: prezzi.reduce((a, b) => a + b, 0) / prezzi.length,
        prezzoMediana: mediana(prezzi),
        prezzoDevStd: devStandard(prezzi),
        
        // Prezzi per grammo
        prezzoGrammoMin: prezziGrammo.length > 0 ? Math.min(...prezziGrammo) : 0,
        prezzoGrammoMax: prezziGrammo.length > 0 ? Math.max(...prezziGrammo) : 0,
        prezzoGrammoMedia: prezziGrammo.length > 0 ? prezziGrammo.reduce((a, b) => a + b, 0) / prezziGrammo.length : 0,
        
        // Pesi
        pesoMin: Math.min(...pesi),
        pesoMax: Math.max(...pesi),
        pesoMedia: pesi.reduce((a, b) => a + b, 0) / pesi.length,
        pesoTotale: pesi.reduce((a, b) => a + b, 0),
        
        // Campioni notevoli
        campionePiuCostoso: campioni[indicePiuCostoso],
        campionePiuEconomico: campioni[indicePiuEconomico],
        campioneMiglioreAffare: campioneMiglioreAffare,
        
        // Distribuzione mercati
        distribuzioneMercati: calcolaDistribuzioneMercati(campioni),
        
        // Trend temporale
        trendTemporale: calcolaTrendTemporale(campioni)
    };
}

function calcolaDistribuzioneMercati(campioni) {
    const mercati = {};
    const totale = campioni.length;
    
    campioni.forEach(c => {
        if (!mercati[c.mercato]) {
            mercati[c.mercato] = { count: 0, percentuale: 0 };
        }
        mercati[c.mercato].count++;
    });
    
    // Calcola percentuali
    Object.keys(mercati).forEach(m => {
        mercati[m].percentuale = (mercati[m].count / totale) * 100;
    });
    
    return mercati;
}

function calcolaTrendTemporale(campioni) {
    // Ordina per data
    const campionOrdinati = [...campioni].sort((a, b) => new Date(a.data) - new Date(b.data));
    
    if (campionOrdinati.length < 2) {
        return { trend: 'insufficiente', variazione: 0 };
    }
    
    const primo = campionOrdinati[0];
    const ultimo = campionOrdinati[campionOrdinati.length - 1];
    
    const variazione = ((ultimo.prezzo - primo.prezzo) / primo.prezzo) * 100;
    
    let trend = 'stabile';
    if (variazione > 10) trend = 'crescita';
    if (variazione < -10) trend = 'calo';
    
    return {
        trend: trend,
        variazione: variazione,
        primoCampione: primo,
        ultimoCampione: ultimo
    };
}

function calcolaMediaPonderata(medie, usaPesoGrammo = false) {
    let somma = 0;
    let pesoTotale = 0;
    
    for (const [mercato, dati] of Object.entries(medie)) {
        if (CONFIG.pesiMercato[mercato]) {
            let valore = usaPesoGrammo ? dati.mediaPrezzoGrammo : dati.mediaPrezzo;
            
            if (mercato === 'etsy') {
                valore *= CONFIG.fattoreCorrezioneEtsy;
            }
            
            somma += valore * CONFIG.pesiMercato[mercato];
            pesoTotale += CONFIG.pesiMercato[mercato];
        }
    }
    
    return pesoTotale > 0 ? somma / pesoTotale : 0;
}

// ===========================
// NAVIGAZIONE
// ===========================

function mostraSezione(nomeSezione) {
    // Nascondi tutte
    document.querySelectorAll('.sezione').forEach(s => s.classList.remove('active'));
    
    // Rimuovi active da nav
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Mostra sezione
    const sezione = document.getElementById(nomeSezione);
    if (sezione) {
        sezione.classList.add('active');
    }
    
    // Attiva bottone
    event.target.classList.add('active');
    
    // Aggiorna database se necessario
    if (nomeSezione === 'database-prezzi') {
        mostraDatabase();
    }
    
    if (nomeSezione === 'dashboard') {
        aggiornaStatistiche();
    }
}

// ===========================
// QUICK ADD
// ===========================

function inizializzaQuickAdd() {
    const form = document.getElementById('form-quick-add');
    const pesoInput = document.getElementById('qa-peso');
    const prezzoInput = document.getElementById('qa-prezzo');
    const euroGrammoSpan = document.getElementById('qa-eurogrammo');
    
    function aggiornaEuroGrammo() {
        const peso = parseFloat(pesoInput.value);
        const prezzo = parseFloat(prezzoInput.value);
        
        if (peso > 0 && prezzo > 0) {
            euroGrammoSpan.textContent = (prezzo / peso).toFixed(2);
        } else {
            euroGrammoSpan.textContent = '0.00';
        }
    }
    
    pesoInput.addEventListener('input', aggiornaEuroGrammo);
    prezzoInput.addEventListener('input', aggiornaEuroGrammo);
    
    // Set data odierna
    document.getElementById('qa-data').valueAsDate = new Date();
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const minerale = normalizzaMinerale(document.getElementById('qa-minerale').value);
        // v0.2.5: checkbox "provenienza sconosciuta" → località canonica
        const provenienzaSconosciuta = document.getElementById('qa-localita-sconosciuta').checked;
        const localita = provenienzaSconosciuta
            ? CONFIG.localitaSconosciuta
            : normalizzaLocalita(document.getElementById('qa-localita').value);
        const peso = parseFloat(pesoInput.value);
        const prezzo = parseFloat(prezzoInput.value);
        const mercato = document.getElementById('qa-mercato').value;
        
        if (!minerale || !localita || peso <= 0 || prezzo <= 0) {
            alert('Compila tutti i campi obbligatori!\n\n(oppure spunta "Provenienza sconosciuta" se non conosci la località)');
            return;
        }
        
        const mineraleNorm = normalizzaMinerale(minerale);
        const chiave = generaChiave(mineraleNorm, localita);
        const prezzogrammo = prezzo / peso;
        
        if (!dbPrezzi[chiave]) {
            dbPrezzi[chiave] = {
                minerale: mineraleNorm,
                localita: localita,
                campioni: [],
                medie: {}
            };
        }
        
        dbPrezzi[chiave].campioni.push({
            prezzo: prezzo,
            peso: peso,
            prezzogrammo: prezzogrammo,
            mineraliSecondari: parseMineraliSecondari(document.getElementById('qa-minerali-secondari')?.value),
            dimensioni: document.getElementById('qa-dimensioni').value.trim(),
            mercato: mercato,
            data: document.getElementById('qa-data').value,
            link: document.getElementById('qa-link').value.trim(),
            note: document.getElementById('qa-note').value.trim()
        });
        
        dbPrezzi[chiave].medie = calcolaMedie(dbPrezzi[chiave].campioni);
        
        salvaDatabase();
        
        alert(`✓ Prezzo salvato!\n${mineraleNorm} - ${localita}\n€${prezzo.toFixed(2)} / ${peso}g = €${prezzogrammo.toFixed(2)}/g`);
        
        form.reset();
        euroGrammoSpan.textContent = '0.00';
        document.getElementById('qa-data').valueAsDate = new Date();
        resetStatoSconosciuta('qa'); // v0.2.5: riattiva il campo località
    });
	aggiornaDatalist();
}

function resetQuickAdd() {
    document.getElementById('form-quick-add').reset();
    document.getElementById('qa-eurogrammo').textContent = '0.00';
    document.getElementById('qa-data').valueAsDate = new Date();
    resetStatoSconosciuta('qa'); // v0.2.5
}

// ===========================
// V0.2.5: PROVENIENZA SCONOSCIUTA
// ===========================

// Checkbox "Provenienza sconosciuta": disattiva/riattiva il campo località
// (prefisso: 'qa' per Quick Add, 'val' per Valutatore)
function toggleLocalitaSconosciuta(prefisso) {
    const checkbox = document.getElementById(prefisso + '-localita-sconosciuta');
    const input = document.getElementById(prefisso + '-localita');
    if (!checkbox || !input) return;
    
    if (checkbox.checked) {
        input.value = '';
        input.disabled = true;
        input.removeAttribute('required');
    } else {
        input.disabled = false;
        input.setAttribute('required', '');
    }
    
    // Nascondi/mostra l'asterisco obbligatorio
    const gruppo = input.closest('.form-group');
    const stella = gruppo ? gruppo.querySelector('label > .required') : null;
    if (stella) stella.style.visibility = checkbox.checked ? 'hidden' : '';
}

// Ripristina lo stato del campo dopo un reset del form
// (form.reset() riporta i valori ma NON riabilita gli input disabilitati via JS)
function resetStatoSconosciuta(prefisso) {
    const checkbox = document.getElementById(prefisso + '-localita-sconosciuta');
    const input = document.getElementById(prefisso + '-localita');
    if (checkbox) checkbox.checked = false;
    if (input) {
        input.disabled = false;
        input.setAttribute('required', '');
    }
    const gruppo = input ? input.closest('.form-group') : null;
    const stella = gruppo ? gruppo.querySelector('label > .required') : null;
    if (stella) stella.style.visibility = '';
}

// Lookup dati per valutazione con località nota (comportamento classico)
function trovaDatiGruppo(mineraleNorm, localita) {
    const chiave = generaChiave(mineraleNorm, localita);
    const datiDB = dbPrezzi[chiave];
    if (!datiDB || Object.keys(datiDB.medie).length === 0) return null;
    return { datiDB: datiDB, localitaFattore: localita, etichetta: localita };
}

// v0.2.5: lookup con provenienza sconosciuta — strategia IBRIDA:
// 1) se esiste il gruppo minerale+"Sconosciuta" → usa quello
// 2) altrimenti aggrega i campioni di TUTTE le località di quel minerale
// Il fattore località è sempre 0.7x (minimo del range Phase 5)
function trovaDatiLocalitaSconosciuta(mineraleNorm) {
    // 1) Gruppo dedicato "Sconosciuta"
    const chiaveSconosciuta = generaChiave(mineraleNorm, CONFIG.localitaSconosciuta);
    const gruppoSconosciuto = dbPrezzi[chiaveSconosciuta];
    if (gruppoSconosciuto && gruppoSconosciuto.campioni.length > 0) {
        return {
            datiDB: {
                minerale: mineraleNorm,
                localita: CONFIG.localitaSconosciuta,
                campioni: gruppoSconosciuto.campioni,
                medie: calcolaMedie(gruppoSconosciuto.campioni)
            },
            localitaFattore: CONFIG.localitaSconosciuta,
            etichetta: CONFIG.localitaSconosciuta + ' (0.7x)',
            aggregato: false
        };
    }
    
    // 2) Fallback: aggrega tutte le località del minerale
    const campioniAggregati = [];
    let gruppiUsati = 0;
    Object.values(dbPrezzi).forEach(gruppo => {
        if (gruppo.minerale === mineraleNorm && gruppo.campioni.length > 0) {
            campioniAggregati.push(...gruppo.campioni);
            gruppiUsati++;
        }
    });
    if (campioniAggregati.length === 0) return null;
    
    return {
        datiDB: {
            minerale: mineraleNorm,
            localita: CONFIG.localitaSconosciuta,
            campioni: campioniAggregati,
            medie: calcolaMedie(campioniAggregati)
        },
        localitaFattore: CONFIG.localitaSconosciuta,
        etichetta: CONFIG.localitaSconosciuta + ' — tutte le località (' + gruppiUsati + (gruppiUsati === 1 ? ' zona' : ' zone') + ') (0.7x)',
        aggregato: true
    };
}

// ===========================
// VALUTATORE
// ===========================

function inizializzaValutatore() {
    const form = document.getElementById('form-valutatore');
    const pesoInput = document.getElementById('val-peso');
    const prezzoInput = document.getElementById('val-prezzo');
    const euroGrammoSpan = document.getElementById('val-eurogrammo');
    
    function aggiornaEuroGrammo() {
        const peso = parseFloat(pesoInput.value);
        const prezzo = parseFloat(prezzoInput.value);
        
        if (peso > 0 && prezzo > 0) {
            euroGrammoSpan.textContent = (prezzo / peso).toFixed(2);
        } else {
            euroGrammoSpan.textContent = '0.00';
        }
    }
    
    pesoInput.addEventListener('input', aggiornaEuroGrammo);
    prezzoInput.addEventListener('input', aggiornaEuroGrammo);
    
    // PHASE 5: score ponderato live + pulsante di ripristino
    for (const chiave of Object.keys(CONFIG.scoringCriteri)) {
        const input = document.getElementById('score-' + chiave);
        const output = document.getElementById('score-valore-' + chiave);
        if (!input) continue;
        input.addEventListener('input', () => {
            if (output) output.textContent = input.value;
            aggiornaPannelloScoring();
        });
    }
    document.getElementById('score-reset')?.addEventListener('click', resetScoring);
    aggiornaPannelloScoring();
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const minerale = document.getElementById('val-minerale').value.trim();
        // v0.2.5: provenienza sconosciuta via checkbox (o digitando "sconosciuta")
        const provenienzaSconosciuta = document.getElementById('val-localita-sconosciuta').checked;
        const localitaInput = normalizzaLocalita(document.getElementById('val-localita').value);
        const peso = parseFloat(pesoInput.value);
        const prezzo = parseFloat(prezzoInput.value);
        
        if (!minerale || peso <= 0 || prezzo <= 0 || (!provenienzaSconosciuta && !localitaInput)) {
            alert('Compila tutti i campi!\n\n(oppure spunta "Provenienza sconosciuta" se non conosci la località)');
            return;
        }
        
        const mineraleNorm = normalizzaMinerale(minerale);
        const usaSconosciuta = provenienzaSconosciuta || localitaInput === CONFIG.localitaSconosciuta;
        
        // v0.2.5: lookup dati — sconosciuta usa strategia ibrida, altrimenti gruppo esatto
        const lookup = usaSconosciuta
            ? trovaDatiLocalitaSconosciuta(mineraleNorm)
            : trovaDatiGruppo(mineraleNorm, localitaInput);
        
        if (!lookup) {
            alert(usaSconosciuta
                ? `⚠ Nessun dato per ${mineraleNorm}\n\n(né con località "${CONFIG.localitaSconosciuta}" né in altre località)\n\nAggiungi prima dei prezzi nel Quick Add!`
                : `⚠ Nessun dato per ${mineraleNorm} - ${localitaInput}\n\nAggiungi prima dei prezzi nel Quick Add!`);
            return;
        }
        
        // PHASE 5: lo score ponderato degli 8 criteri entra nella formula
        const voti = leggiVotiScoring();
        const score = calcolaScore(voti);
        const scomposizione = generaScomposizione(mineraleNorm, lookup.localitaFattore, peso, lookup.datiDB, score);
        const valoreStimato = calcolaValoreStimato(mineraleNorm, lookup.localitaFattore, peso, lookup.datiDB, score);
        const percentuale = (prezzo / valoreStimato) * 100;
        const raccomandazione = generaRaccomandazione(percentuale);
        
        mostraRisultatiValutazione({
            minerale: mineraleNorm,
            localita: lookup.etichetta,
            peso: peso,
            prezzo: prezzo,
            prezzogrammo: prezzo / peso,
            valoreStimato: valoreStimato,
            percentuale: percentuale,
            raccomandazione: raccomandazione,
            datiDB: lookup.datiDB,
            scomposizione: scomposizione
        });
    });
	aggiornaDatalist();
}

// PHASE 5: Valore = MediaMercati × (Score/10) × Località × Integrità
// Senza il parametro score (chiamate legacy) restituisce il valore v0.2.5.1:
// base × località × 0.5 × 0.95
function calcolaValoreStimato(minerale, localita, peso, datiDB, score) {
    const medie = datiDB.medie;
    
    let mediaPonderata;
    const hasPrezzoGrammo = Object.values(medie).some(m => m.mediaPrezzoGrammo > 0);
    
    if (hasPrezzoGrammo) {
        const mediaPrezzoGrammo = calcolaMediaPonderata(medie, true);
        mediaPonderata = mediaPrezzoGrammo * peso;
    } else {
        mediaPonderata = calcolaMediaPonderata(medie, false);
    }
    
    const fattoreLocalita = getFattoreLocalita(minerale, localita);
    
    if (!score) {
        const fattoreLegacy = CONFIG.fattoreQualitaLegacy * CONFIG.fattoreIntegritaLegacy;
        return mediaPonderata * fattoreLocalita * fattoreLegacy;
    }
    
    const votoIntegrita = score.voti && score.voti.integrita !== undefined
        ? score.voti.integrita
        : CONFIG.scoringDefaultIntegrita;
    const fattoreIntegrita = score.fattoreIntegrita !== undefined
        ? score.fattoreIntegrita
        : fattoreDaIntegrita(votoIntegrita);
    const valore = mediaPonderata * fattoreLocalita * score.suDieci * fattoreIntegrita;
    
    return valore;
}

// Scomposizione trasparente della formula (mostrata nel risultato della valutazione)
function generaScomposizione(minerale, localita, peso, datiDB, score) {
    const medie = datiDB.medie;
    const hasPrezzoGrammo = Object.values(medie).some(m => m.mediaPrezzoGrammo > 0);
    const mediaUnitaria = calcolaMediaPonderata(medie, true);
    const base = hasPrezzoGrammo ? mediaUnitaria * peso : calcolaMediaPonderata(medie, false);
    const fattoreLocalita = getFattoreLocalita(minerale, localita);
    const votoIntegrita = score.voti ? score.voti.integrita : CONFIG.scoringDefaultIntegrita;
    const fattoreIntegrita = score.fattoreIntegrita !== undefined
        ? score.fattoreIntegrita
        : fattoreDaIntegrita(votoIntegrita);
    
    return {
        base: base,
        peso: peso,
        perGrammo: hasPrezzoGrammo,
        mediaUnitaria: mediaUnitaria,
        fattoreLocalita: fattoreLocalita,
        score: score.score,
        suDieci: score.suDieci,
        fattoreIntegrita: fattoreIntegrita,
        votoIntegrita: votoIntegrita,
        valore: base * fattoreLocalita * score.suDieci * fattoreIntegrita
    };
}



function generaRaccomandazione(percentuale) {
    if (percentuale <= 60) return { testo: 'ACQUISTO ECCELLENTE', classe: 'eccellente', emoji: '🌟' };
    if (percentuale <= 80) return { testo: 'BUON ACQUISTO', classe: 'buono', emoji: '✓' };
    if (percentuale <= 100) return { testo: 'PREZZO CORRETTO', classe: 'corretto', emoji: '=' };
    if (percentuale <= 120) return { testo: 'SOPRAVVALUTATO', classe: 'sopravvalutato', emoji: '⚠' };
    return { testo: 'SCONSIGLIATO', classe: 'sconsigliato', emoji: '✗' };
}

function mostraRisultatiValutazione(r) {
    const container = document.getElementById('risultato-valutazione');
    
    container.innerHTML = `
        <div class="risultato-card raccomandazione-${r.raccomandazione.classe}">
            <h3>${r.raccomandazione.emoji} ${r.raccomandazione.testo}</h3>
            
            <div class="risultato-principale">
                <div class="valore-riga">
                    <span>Prezzo proposto:</span>
                    <strong>€${r.prezzo.toFixed(2)}</strong>
                </div>
                <div class="valore-riga">
                    <span>Valore stimato:</span>
                    <strong>€${r.valoreStimato.toFixed(2)}</strong>
                </div>
                <div class="valore-riga percentuale">
                    <span>Rapporto:</span>
                    <strong>${r.percentuale.toFixed(1)}%</strong>
                </div>
            </div>
            
            ${r.scomposizione ? generaBloccoScomposizione(r.scomposizione) : ''}
            
            <div class="dettagli-valutazione">
                <h4>Dettagli</h4>
                <p><strong>Minerale:</strong> ${r.minerale}</p>
                <p><strong>Località:</strong> ${r.localita}</p>
                <p><strong>Peso:</strong> ${r.peso}g</p>
                <p><strong>€/grammo:</strong> €${r.prezzogrammo.toFixed(2)}/g</p>
                
                <h4>Database (${r.datiDB.campioni.length} campioni)</h4>
                ${generaTabellaStorico(r.datiDB.medie)}
            </div>
        </div>
    `;
}

// PHASE 5: mostra ogni passaggio della formula, così il valore stimato è verificabile
function generaBloccoScomposizione(sc) {
    const baseTesto = sc.perGrammo
        ? `€${sc.mediaUnitaria.toFixed(4)}/g × ${sc.peso} g = €${sc.base.toFixed(2)}`
        : `media ponderata dei mercati = €${sc.base.toFixed(2)}`;
    
    return `
        <div class="dettagli-valutazione scomposizione">
            <h4>Come è calcolato il valore</h4>
            <div class="scomposizione-riga">
                <span>Base di mercato</span>
                <strong>${baseTesto}</strong>
            </div>
            <div class="scomposizione-riga">
                <span>Fattore località</span>
                <strong>× ${sc.fattoreLocalita.toFixed(2)}</strong>
            </div>
            <div class="scomposizione-riga">
                <span>Score qualità (${sc.score.toFixed(1)}/10)</span>
                <strong>× ${sc.suDieci.toFixed(3)}</strong>
            </div>
            <div class="scomposizione-riga">
                <span>Fattore integrità (voto ${sc.votoIntegrita}/10)</span>
                <strong>× ${sc.fattoreIntegrita.toFixed(3)}</strong>
            </div>
            <div class="scomposizione-riga totale">
                <span>Valore stimato</span>
                <strong>€${sc.valore.toFixed(2)}</strong>
            </div>
        </div>
    `;
}

function generaTabellaStorico(medie) {
    let html = '<table class="tabella-storico"><thead><tr><th>Mercato</th><th>€ medio</th><th>€/g medio</th><th>n</th></tr></thead><tbody>';
    
    for (const [mercato, dati] of Object.entries(medie)) {
        html += `
            <tr>
                <td>${mercato.toUpperCase()}</td>
                <td>€${dati.mediaPrezzo.toFixed(2)}</td>
                <td>${dati.mediaPrezzoGrammo > 0 ? '€' + dati.mediaPrezzoGrammo.toFixed(2) + '/g' : '-'}</td>
                <td>${dati.n}</td>
            </tr>
        `;
    }
    
    html += '</tbody></table>';
    return html;
}

// ===========================
// DATABASE
// ===========================

function mostraDatabase() {
    const container = document.getElementById('database-list');
    
    if (Object.keys(dbPrezzi).length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Database vuoto. Aggiungi prezzi con Quick Add!</p></div>';
        aggiornaContatoreRisultati(0, 0);
        return;
    }
    
    // Reset ricerca e ordinamento (i filtri avanzati restano attivi)
    document.getElementById('search-db').value = '';
    document.getElementById('ordina-db').value = 'alfabetico';
    
    // Popola dropdown filtri
    popolaFiltri();
    
    // Mostra tutto
    filtraDatabase();
}

// ===========================
// PHASE 4: FILTRI EXCEL-LIKE
// ===========================

// Stato centrale dei filtri (unica fonte di verità)
let filtriAttivi = {
    minerali: [],     // valori spuntati nel dropdown Minerali
    localita: [],     // valori spuntati nel dropdown Località
    mercati: [],      // valori spuntati nel dropdown Mercati (lowercase)
    dataDa: null,     // Date | null
    dataA: null,      // Date | null
    prezzoMin: null,  // number | null
    prezzoMax: null,
    pesoMin: null,
    pesoMax: null
};

// Escape HTML per valori dinamici (anti-bug v0.2.5: niente markup rotto)
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Popola le liste checkbox di Minerali e Località dal database
function popolaFiltri() {
    const minerali = new Set();
    const localita = new Set();
    
    Object.values(dbPrezzi).forEach(dati => {
        minerali.add(dati.minerale);
        localita.add(dati.localita);
    });
    
    ricostruisciListaCheckbox('minerali', Array.from(minerali).sort());
    ricostruisciListaCheckbox('localita', Array.from(localita).sort());
}

// Ricostruisce una lista checkbox PRESERVANDO le selezioni attive
// (anti-bug v0.2.5: le spunte non spariscono quando si aggiungono campioni)
function ricostruisciListaCheckbox(nome, valori) {
    const lista = document.getElementById('pl-' + nome);
    if (!lista) return;
    
    // 1. Salva cosa era spuntato PRIMA di ricostruire
    const selezionati = new Set(
        Array.from(lista.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value)
    );
    
    // 2. Ricostruisci (v0.2.8: con un tetto al numero di voci renderizzate)
    disegnaListaCheckbox(nome, valori, selezionati, '');
    
    // 3. Sincronizza "Seleziona tutto"
    aggiornaSelectAll(nome);
}

// v0.2.8: disegna la lista dei checkbox di un popover.
// Le voci già spuntate vengono sempre renderizzate per prime, così una selezione
// non si perde mai anche quando la lista supera la soglia e viene accorciata.
function disegnaListaCheckbox(nome, valori, selezionati, termineRicerca) {
    const lista = document.getElementById('pl-' + nome);
    if (!lista) return;
    
    const t = String(termineRicerca || '').toLowerCase().trim();
    let visibili = valori.filter(v => !t || String(v).toLowerCase().includes(t));
    
    if (visibili.length === 0) {
        lista.innerHTML = '<span class="filter-empty">Nessun dato</span>';
        return;
    }
    
    const soglia = CONFIG.sogliaPopoverFiltri;
    let nascoste = 0;
    if (visibili.length > soglia) {
        const totaleCoinvolte = visibili.length;
        const spuntate = visibili.filter(v => selezionati.has(v));
        const restanti = visibili.filter(v => !selezionati.has(v));
        visibili = spuntate.concat(restanti).slice(0, soglia);
        nascoste = totaleCoinvolte - visibili.length;
    }
    
    lista.innerHTML = visibili.map(v => {
        const vSafe = escapeHtml(v);
        const checked = selezionati.has(v) ? ' checked' : '';
        return `<label class="filter-checkbox"><input type="checkbox" value="${vSafe}"${checked} onchange="applicaFiltri()"><span>${vSafe}</span></label>`;
    }).join('') + (nascoste > 0
        ? `<div class="filter-truncate">+ altre ${nascoste} voci — usa la ricerca per affinare</div>`
        : '');
}

// Apre/chiude un popover (chiude gli altri, stile Excel)
function toggleFilterDropdown(nome) {
    const popover = document.getElementById('fp-' + nome);
    if (!popover) return;
    const eraAperto = !popover.classList.contains('hidden');
    chiudiTuttiDropdown();
    if (!eraAperto) popover.classList.remove('hidden');
}

function chiudiTuttiDropdown() {
    document.querySelectorAll('.filter-popover').forEach(p => p.classList.add('hidden'));
}

// Click fuori da un dropdown → chiudi tutti i popover
document.addEventListener('click', (e) => {
    if (!e.target.closest('.filter-dropdown')) chiudiTuttiDropdown();
});

// "Seleziona tutto" dentro un popover (rispetta la ricerca interna: solo righe visibili)
function toggleTutti(nome, checked) {
    const lista = document.getElementById('pl-' + nome);
    if (!lista) return;
    lista.querySelectorAll('.filter-checkbox').forEach(lbl => {
        if (lbl.style.display !== 'none') {
            const cb = lbl.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = checked;
        }
    });
    applicaFiltri();
}

// Ricerca live dentro un popover
// v0.2.8: la ricerca rigenera la lista (necessario quando le voci sono troppe per
// essere renderizzate tutte) e preserva le selezioni già attive
function cercaNelPopover(nome, term) {
    const valori = new Set();
    Object.values(dbPrezzi).forEach(dati => {
        if (nome === 'minerali') valori.add(dati.minerale);
        if (nome === 'localita') valori.add(dati.localita);
    });
    const selezionati = new Set(
        Array.from(document.querySelectorAll('#pl-' + nome + ' input[type="checkbox"]:checked')).map(cb => cb.value)
    );
    disegnaListaCheckbox(nome, Array.from(valori).sort(), selezionati, term);
}

// Sincronizza la checkbox "Seleziona tutto" (checked / indeterminate)
function aggiornaSelectAll(nome) {
    const sa = document.getElementById('select-all-' + nome);
    const lista = document.getElementById('pl-' + nome);
    if (!sa || !lista) return;
    const cbs = Array.from(lista.querySelectorAll('input[type="checkbox"]'));
    const checkedCount = cbs.filter(cb => cb.checked).length;
    sa.checked = cbs.length > 0 && checkedCount === cbs.length;
    sa.indeterminate = checkedCount > 0 && checkedCount < cbs.length;
}

// Legge lo stato della UI → filtriAttivi (ID dedicati per gruppo: niente selettori fragili)
function aggiornaStatoFiltri() {
    filtriAttivi.minerali = Array.from(document.querySelectorAll('#pl-minerali input[type="checkbox"]:checked')).map(cb => cb.value);
    filtriAttivi.localita = Array.from(document.querySelectorAll('#pl-localita input[type="checkbox"]:checked')).map(cb => cb.value);
    filtriAttivi.mercati = Array.from(document.querySelectorAll('#pl-mercati input[type="checkbox"]:checked')).map(cb => cb.value);
    
    const da = document.getElementById('filter-data-da').value;
    const a = document.getElementById('filter-data-a').value;
    filtriAttivi.dataDa = da ? new Date(da) : null;
    filtriAttivi.dataA = a ? new Date(a) : null;
    
    const pmin = parseFloat(document.getElementById('filter-prezzo-min').value);
    const pmax = parseFloat(document.getElementById('filter-prezzo-max').value);
    filtriAttivi.prezzoMin = isNaN(pmin) ? null : pmin;
    filtriAttivi.prezzoMax = isNaN(pmax) ? null : pmax;
    
    const wmin = parseFloat(document.getElementById('filter-peso-min').value);
    const wmax = parseFloat(document.getElementById('filter-peso-max').value);
    filtriAttivi.pesoMin = isNaN(wmin) ? null : wmin;
    filtriAttivi.pesoMax = isNaN(wmax) ? null : wmax;
}

// Test a livello GRUPPO (minerale + località)
function gruppoSuperaFiltri(dati) {
    if (filtriAttivi.minerali.length > 0 && !filtriAttivi.minerali.includes(dati.minerale)) return false;
    if (filtriAttivi.localita.length > 0 && !filtriAttivi.localita.includes(dati.localita)) return false;
    return true;
}

// Test a livello CAMPIONE (mercato, data, prezzo, peso + gruppo)
function campioneSuperaFiltri(campione, dati) {
    if (dati && !gruppoSuperaFiltri(dati)) return false;
    
    if (filtriAttivi.mercati.length > 0) {
        const mercato = String(campione.mercato || '').toLowerCase();
        if (!filtriAttivi.mercati.includes(mercato)) return false;
    }
    
    if (filtriAttivi.dataDa || filtriAttivi.dataA) {
        const d = new Date(campione.data);
        if (isNaN(d.getTime())) return false;
        if (filtriAttivi.dataDa && d < filtriAttivi.dataDa) return false;
        if (filtriAttivi.dataA && d > filtriAttivi.dataA) return false;
    }
    
    if (filtriAttivi.prezzoMin !== null && campione.prezzo < filtriAttivi.prezzoMin) return false;
    if (filtriAttivi.prezzoMax !== null && campione.prezzo > filtriAttivi.prezzoMax) return false;
    if (filtriAttivi.pesoMin !== null && campione.peso < filtriAttivi.pesoMin) return false;
    if (filtriAttivi.pesoMax !== null && campione.peso > filtriAttivi.pesoMax) return false;
    
    return true;
}

// Ingresso unico: cambia un filtro → aggiorna stato, UI e griglia
function applicaFiltri() {
    aggiornaStatoFiltri();
    aggiornaSelectAll('minerali');
    aggiornaSelectAll('localita');
    aggiornaUIFiltri();
    filtraDatabase();
}

// Aggiorna badge, pulsanti attivi e contatori per gruppo
function aggiornaUIFiltri() {
    const gruppi = [
        ['minerali', filtriAttivi.minerali.length],
        ['localita', filtriAttivi.localita.length],
        ['mercati', filtriAttivi.mercati.length],
        ['date', (filtriAttivi.dataDa ? 1 : 0) + (filtriAttivi.dataA ? 1 : 0)],
        ['prezzo', (filtriAttivi.prezzoMin !== null ? 1 : 0) + (filtriAttivi.prezzoMax !== null ? 1 : 0)],
        ['peso', (filtriAttivi.pesoMin !== null ? 1 : 0) + (filtriAttivi.pesoMax !== null ? 1 : 0)]
    ];
    
    let totaleGruppi = 0;
    gruppi.forEach(([nome, count]) => {
        const btn = document.getElementById('fb-' + nome);
        const fc = document.getElementById('fc-' + nome);
        if (!btn || !fc) return;
        if (count > 0) {
            btn.classList.add('attivo');
            fc.textContent = count;
            fc.classList.remove('hidden');
            totaleGruppi++;
        } else {
            btn.classList.remove('attivo');
            fc.classList.add('hidden');
        }
    });
    
    const badge = document.getElementById('filter-badge');
    const btnClear = document.getElementById('btn-clear-filters');
    if (badge && btnClear) {
        if (totaleGruppi > 0) {
            badge.textContent = totaleGruppi === 1 ? '1 filtro attivo' : `${totaleGruppi} filtri attivi`;
            badge.classList.remove('hidden');
            btnClear.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
            btnClear.classList.add('hidden');
        }
    }
}

// Azzera tutti i filtri (checkbox + range)
function rimuoviTuttiFiltri() {
    document.querySelectorAll('#pl-minerali input[type="checkbox"], #pl-localita input[type="checkbox"], #pl-mercati input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    document.getElementById('filter-data-da').value = '';
    document.getElementById('filter-data-a').value = '';
    document.getElementById('filter-prezzo-min').value = '';
    document.getElementById('filter-prezzo-max').value = '';
    document.getElementById('filter-peso-min').value = '';
    document.getElementById('filter-peso-max').value = '';
    applicaFiltri();
}

// Scorciatoie periodo: ultimi N giorni
function impostaPeriodo(giorni) {
    const oggi = new Date();
    const da = new Date();
    da.setDate(oggi.getDate() - giorni);
    document.getElementById('filter-data-da').value = da.toISOString().split('T')[0];
    document.getElementById('filter-data-a').value = oggi.toISOString().split('T')[0];
    applicaFiltri();
}

// Contatore "Mostrando X di Y campioni"
function aggiornaContatoreRisultati(visibili, totali) {
    const rc = document.getElementById('results-count');
    const rt = document.getElementById('results-total');
    if (rc) rc.textContent = visibili;
    if (rt) rt.textContent = totali;
}

// v0.2.8: stato della paginazione del Database Prezzi
let paginaDatabase = 1;
let ultimaRicercaDatabase = [];
let paginaModal = 1;
let campioniModal = [];
let chiaveModal = '';

function filtraDatabase(azzeraPagina = true) {
    const searchTerm = document.getElementById('search-db').value.toLowerCase();
    const ordinamento = document.getElementById('ordina-db').value;
    
    // Totale campioni nel database (per il contatore)
    const totaleCampioni = Object.values(dbPrezzi).reduce((sum, dati) => sum + dati.campioni.length, 0);
    
    // PHASE 4: ricerca testuale + filtri gruppo + filtri campione
    let datiFilterati = Object.entries(dbPrezzi)
        .filter(([chiave, dati]) => {
            // v0.2.8: la ricerca trova anche i minerali secondari delle associazioni
            const matchSearch = !searchTerm || 
                dati.minerale.toLowerCase().includes(searchTerm) || 
                dati.localita.toLowerCase().includes(searchTerm) ||
                dati.campioni.some(c => (c.mineraliSecondari || [])
                    .some(m => String(m).toLowerCase().includes(searchTerm)));
            return matchSearch && gruppoSuperaFiltri(dati);
        })
        .map(([chiave, dati]) => {
            const campioniVisibili = dati.campioni.filter(c => campioneSuperaFiltri(c, dati));
            // Medie ricalcolate SOLO sui campioni visibili (stile Excel)
            const medieVisibili = calcolaMedie(campioniVisibili);
            return {
                chiave,
                dati,
                campioniVisibili,
                medieVisibili,
                mediaGenerale: calcolaMediaPonderata(medieVisibili, false),
                mediaPrezzoGrammo: calcolaMediaPonderata(medieVisibili, true)
            };
        })
        .filter(entry => entry.campioniVisibili.length > 0);
    
    // Aggiorna contatore risultati
    const campioniVisibiliTot = datiFilterati.reduce((sum, e) => sum + e.campioniVisibili.length, 0);
    aggiornaContatoreRisultati(campioniVisibiliTot, totaleCampioni);
    
    // Ordina (sui valori VISUALIZZATI)
    datiFilterati.sort((a, b) => {
        switch(ordinamento) {
            case 'alfabetico':
                return a.dati.minerale.localeCompare(b.dati.minerale);
            case 'campioni':
                return b.campioniVisibili.length - a.campioniVisibili.length;
            case 'prezzo-alto':
                return b.mediaGenerale - a.mediaGenerale;
            case 'prezzo-basso':
                return a.mediaGenerale - b.mediaGenerale;
            default:
                return 0;
        }
    });
    
    // v0.2.8: la griglia mostra una pagina alla volta (centinaia di gruppi restano fluidi)
    ultimaRicercaDatabase = datiFilterati;
    const perPagina = CONFIG.gruppoPerPage;
    const totalePagine = Math.max(1, Math.ceil(datiFilterati.length / perPagina));
    if (azzeraPagina) paginaDatabase = 1;
    if (paginaDatabase > totalePagine) paginaDatabase = totalePagine;
    if (paginaDatabase < 1) paginaDatabase = 1;
    
    disegnaPaginaDatabase();
}

// Disegna la pagina corrente dei gruppi + la barra di paginazione
function disegnaPaginaDatabase() {
    const container = document.getElementById('database-list');
    const datiFilterati = ultimaRicercaDatabase;
    
    // Mostra risultati
    if (datiFilterati.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nessun risultato trovato</p></div>';
        return;
    }
    
    const perPagina = CONFIG.gruppoPerPage;
    const inizio = (paginaDatabase - 1) * perPagina;
    const slice = datiFilterati.slice(inizio, inizio + perPagina);
    const totalePagine = Math.max(1, Math.ceil(datiFilterati.length / perPagina));
    
    let html = '<div class="database-lista">';
    
    slice.forEach(entry => {
        const { chiave, dati, campioniVisibili, mediaGenerale, mediaPrezzoGrammo } = entry;
        const isFiltrato = campioniVisibili.length < dati.campioni.length;
        
        html += `
            <div class="database-card">
                <div class="database-header">
                    <h3>${escapeHtml(dati.minerale.toUpperCase())}</h3>
                    <div class="database-localita">${escapeHtml(dati.localita)}</div>
                </div>
                <div class="database-stats">
                    <div class="stat">
                        <div class="stat-label">Campioni</div>
                        <div class="stat-value">${campioniVisibili.length}${isFiltrato ? `<span class="stat-sub">su ${dati.campioni.length}</span>` : ''}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">€ Medio</div>
                        <div class="stat-value">€${mediaGenerale.toFixed(2)}</div>
                    </div>
                    ${mediaPrezzoGrammo > 0 ? `
                    <div class="stat">
                        <div class="stat-label">€/g Medio</div>
                        <div class="stat-value">€${mediaPrezzoGrammo.toFixed(2)}/g</div>
                    </div>
                    ` : ''}
                </div>
                <button onclick="mostraDettagliMinerale('${chiave}')" class="btn-dettagli">
                    📊 Vedi Dettagli →
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    html += generaBarraPaginazione('db', paginaDatabase, totalePagine, datiFilterati.length, 'gruppi');
    container.innerHTML = html;
}

// Barra di paginazione condivisa da griglia database e modal dei dettagli
function generaBarraPaginazione(prefisso, pagina, totalePagine, totaleVoci, etichetta) {
    if (totalePagine <= 1) return '';
    
    return `
        <div class="paginazione" id="${prefisso}-paginazione">
            <button type="button" class="btn-pagina" ${pagina <= 1 ? 'disabled' : ''}
                onclick="vaiAPagina('${prefisso}', ${pagina - 1})">←</button>
            <span class="paginazione-info">
                Pagina <strong>${pagina}</strong> di <strong>${totalePagine}</strong>
                <span class="paginazione-totale">(${totaleVoci} ${etichetta})</span>
            </span>
            <button type="button" class="btn-pagina" ${pagina >= totalePagine ? 'disabled' : ''}
                onclick="vaiAPagina('${prefisso}', ${pagina + 1})">→</button>
        </div>
    `;
}

function vaiAPagina(prefisso, pagina) {
    if (prefisso === 'db') {
        paginaDatabase = pagina;
        disegnaPaginaDatabase();
    } else if (prefisso === 'modal') {
        paginaModal = pagina;
        disegnaListaCampioni();
    }
}

// v0.2.8: cambia il numero di gruppi per pagina
function cambiaGruppiPerPage(valore) {
    const v = parseInt(valore, 10);
    if (!isNaN(v) && v > 0) {
        CONFIG.gruppoPerPage = v;
        paginaDatabase = 1;
        disegnaPaginaDatabase();
    }
}

function mostraDettagliMinerale(chiave) {
    const dati = dbPrezzi[chiave];
    if (!dati) return;
    
    // PHASE 4: filtra i campioni mantenendo l'INDICE ORIGINALE per modifica/elimina
    // (anti-bug v0.2.5: i pulsanti devono puntare a dati.campioni[idx], non alla lista filtrata)
    const campioniIndicizzati = dati.campioni
        .map((campione, idx) => ({ campione, idx }))
        .filter(entry => campioneSuperaFiltri(entry.campione, dati));
    const campioniVisibili = campioniIndicizzati.map(entry => entry.campione);
    const isFiltrato = campioniVisibili.length < dati.campioni.length;
    
    // Calcola statistiche avanzate sui campioni VISIBILI (stile Excel)
    const stats = calcolaStatisticheAvanzate(campioniVisibili);
    const medieVisibili = calcolaMedie(campioniVisibili);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>${dati.minerale} - ${dati.localita}</h2>
            
            ${isFiltrato ? `<div class="modal-filter-notice">🔍 Vista filtrata: ${campioniVisibili.length} di ${dati.campioni.length} campioni — statistiche ricalcolate sui campioni visibili</div>` : ''}
            
            ${stats ? generaStatisticheGenerali(stats) : '<p class="stat-hint">Nessun campione corrisponde ai filtri attivi.</p>'}
            
            ${stats ? `
            <h3>📊 Distribuzione per mercato</h3>
            ${generaDistribuzioneMercati(stats.distribuzioneMercati, medieVisibili)}
            
            <h3>📈 Trend temporale</h3>
            ${generaTrendTemporale(stats.trendTemporale)}
            
            <h3>🏆 Campioni notevoli</h3>
            ${generaCampioniNotevoli(stats)}
            ` : ''}
            
            <h3>📦 ${isFiltrato ? `Campioni (${campioniVisibili.length} di ${dati.campioni.length})` : `Tutti i campioni (${dati.campioni.length})`}</h3>
            <div class="campioni-lista" id="campioni-lista"></div>
            <div id="campioni-paginazione"></div>
            
            <button onclick="this.parentElement.parentElement.remove()" class="btn-primary" style="margin-top:20px;">Chiudi</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // v0.2.8: la lista dei campioni viene paginata a parte (indici originali preservati)
    paginaModal = 1;
    campioniModal = campioniIndicizzati;
    chiaveModal = chiave;
    disegnaListaCampioni();
}

// Disegna la pagina corrente dei campioni nel modal, mantenendo l'INDICE ORIGINALE
// nei pulsanti Modifica/Elimina anche quando la lista è paginata o filtrata
function disegnaListaCampioni() {
    const lista = document.getElementById('campioni-lista');
    const barra = document.getElementById('campioni-paginazione');
    if (!lista) return;
    
    const perPagina = CONFIG.campioniPerPagina;
    const totalePagine = Math.max(1, Math.ceil(campioniModal.length / perPagina));
    if (paginaModal > totalePagine) paginaModal = totalePagine;
    if (paginaModal < 1) paginaModal = 1;
    
    const inizio = (paginaModal - 1) * perPagina;
    const slice = campioniModal.slice(inizio, inizio + perPagina);
    
    lista.innerHTML = slice.map(({ campione: c, idx }) => generaCardCampione(chiaveModal, c, idx)).join('');
    if (barra) {
        barra.innerHTML = generaBarraPaginazione('modal', paginaModal, totalePagine, campioniModal.length, 'campioni');
    }
}

function generaCardCampione(chiave, c, idx) {
    return `
        <div class="campione-card">
            <div class="campione-header">
                <span class="campione-data">📅 ${c.data}</span>
                <span class="badge">${c.mercato.toUpperCase()}</span>
            </div>
            
            <div class="campione-body">
                <div class="campione-row">
                    <strong>💰 Prezzo:</strong> €${c.prezzo.toFixed(2)}
                </div>
                <div class="campione-row">
                    <strong>⚖️ Peso:</strong> ${c.peso}g
                </div>
                <div class="campione-row">
                    <strong>📏 €/grammo:</strong> €${c.prezzogrammo.toFixed(2)}/g
                </div>
                ${c.mineraliSecondari && c.mineraliSecondari.length ? `<div class="campione-row"><strong>🔗 Associazione:</strong> ${escapeHtml(c.mineraliSecondari.join(', '))}</div>` : ''}
                ${c.dimensioni ? `<div class="campione-row"><strong>📐 Dimensioni:</strong> ${c.dimensioni}</div>` : ''}
                ${c.note ? `<div class="campione-note">📝 ${c.note}</div>` : ''}
                ${c.link ? `<div class="campione-row"><a href="${c.link}" target="_blank" class="link-asta">🔗 Vedi asta originale</a></div>` : ''}
            </div>
            
            <div class="campione-actions">
                <button onclick="modificaCampione('${chiave}', ${idx})" class="btn-edit">
                    ✏️ Modifica
                </button>
                <button onclick="eliminaCampione('${chiave}', ${idx})" class="btn-delete">
                    🗑️ Elimina
                </button>
            </div>
        </div>
    `;
}

function generaStatisticheGenerali(stats) {
    return `
        <div class="stats-avanzate">
            <h3>📊 Statistiche Generali</h3>
            <div class="stats-grid-avanzate">
                <div class="stat-box">
                    <div class="stat-icon">💰</div>
                    <div class="stat-info">
                        <div class="stat-label">Prezzo Medio</div>
                        <div class="stat-value-big">€${stats.prezzoMedia.toFixed(2)}</div>
                        <div class="stat-range">Min: €${stats.prezzoMin.toFixed(2)} | Max: €${stats.prezzoMax.toFixed(2)}</div>
                    </div>
                </div>
                
                <div class="stat-box">
                    <div class="stat-icon">📏</div>
                    <div class="stat-info">
                        <div class="stat-label">€/grammo Medio</div>
                        <div class="stat-value-big">${stats.prezzoGrammoMedia > 0 ? '€' + stats.prezzoGrammoMedia.toFixed(2) + '/g' : 'N/D'}</div>
                        ${stats.prezzoGrammoMedia > 0 ? `<div class="stat-range">Min: €${stats.prezzoGrammoMin.toFixed(2)}/g | Max: €${stats.prezzoGrammoMax.toFixed(2)}/g</div>` : ''}
                    </div>
                </div>
                
                <div class="stat-box">
                    <div class="stat-icon">⚖️</div>
                    <div class="stat-info">
                        <div class="stat-label">Peso Medio</div>
                        <div class="stat-value-big">${stats.pesoMedia.toFixed(1)}g</div>
                        <div class="stat-range">Min: ${stats.pesoMin}g | Max: ${stats.pesoMax}g</div>
                    </div>
                </div>
                
                <div class="stat-box">
                    <div class="stat-icon">📦</div>
                    <div class="stat-info">
                        <div class="stat-label">Campioni Totali</div>
                        <div class="stat-value-big">${stats.totale}</div>
                        <div class="stat-range">Peso totale: ${stats.pesoTotale.toFixed(1)}g</div>
                    </div>
                </div>
            </div>
            
            <div class="stat-dettagli">
                <p><strong>📊 Mediana prezzi:</strong> €${stats.prezzoMediana.toFixed(2)}</p>
                <p><strong>📈 Deviazione standard:</strong> €${stats.prezzoDevStd.toFixed(2)} <span class="stat-hint">(variabilità prezzi)</span></p>
            </div>
        </div>
    `;
}

function generaDistribuzioneMercati(distribuzione, medie) {
    let html = '<div class="mercati-distribuzione">';
    
    const mercatiOrdinati = Object.entries(distribuzione).sort((a, b) => b[1].count - a[1].count);
    
    mercatiOrdinati.forEach(([mercato, dati]) => {
        const mediaMercato = medie[mercato];
        html += `
            <div class="mercato-bar">
                <div class="mercato-label">
                    <strong>${mercato.toUpperCase()}</strong>
                    <span>${dati.count} campioni (${dati.percentuale.toFixed(1)}%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${dati.percentuale}%"></div>
                </div>
                ${mediaMercato ? `
                    <div class="mercato-stats">
                        Media: €${mediaMercato.mediaPrezzo.toFixed(2)} | 
                        €/g: ${mediaMercato.mediaPrezzoGrammo > 0 ? '€' + mediaMercato.mediaPrezzoGrammo.toFixed(2) + '/g' : 'N/D'}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function generaTrendTemporale(trend) {
    if (trend.trend === 'insufficiente') {
        return '<p class="stat-hint">📊 Dati insufficienti per analisi temporale (minimo 2 campioni)</p>';
    }
    
    const iconaTrend = trend.trend === 'crescita' ? '📈' : trend.trend === 'calo' ? '📉' : '➡️';
    const classeTrend = trend.trend === 'crescita' ? 'trend-up' : trend.trend === 'calo' ? 'trend-down' : 'trend-stable';
    
    return `
        <div class="trend-box ${classeTrend}">
            <div class="trend-header">
                <span class="trend-icon">${iconaTrend}</span>
                <span class="trend-label">Trend: <strong>${trend.trend.toUpperCase()}</strong></span>
                <span class="trend-variazione">${trend.variazione > 0 ? '+' : ''}${trend.variazione.toFixed(1)}%</span>
            </div>
            <div class="trend-dettagli">
                <p><strong>Primo campione:</strong> €${trend.primoCampione.prezzo.toFixed(2)} (${trend.primoCampione.data})</p>
                <p><strong>Ultimo campione:</strong> €${trend.ultimoCampione.prezzo.toFixed(2)} (${trend.ultimoCampione.data})</p>
            </div>
        </div>
    `;
}

function generaCampioniNotevoli(stats) {
    return `
        <div class="campioni-notevoli">
            <div class="notevole-card">
                <div class="notevole-icon">💎</div>
                <div class="notevole-info">
                    <div class="notevole-label">Più Costoso</div>
                    <div class="notevole-valore">€${stats.campionePiuCostoso.prezzo.toFixed(2)}</div>
                    <div class="notevole-dettagli">${stats.campionePiuCostoso.peso}g | ${stats.campionePiuCostoso.mercato} | ${stats.campionePiuCostoso.data}</div>
                </div>
            </div>
            
            <div class="notevole-card">
                <div class="notevole-icon">💸</div>
                <div class="notevole-info">
                    <div class="notevole-label">Più Economico</div>
                    <div class="notevole-valore">€${stats.campionePiuEconomico.prezzo.toFixed(2)}</div>
                    <div class="notevole-dettagli">${stats.campionePiuEconomico.peso}g | ${stats.campionePiuEconomico.mercato} | ${stats.campionePiuEconomico.data}</div>
                </div>
            </div>
            
            ${stats.campioneMiglioreAffare ? `
            <div class="notevole-card">
                <div class="notevole-icon">🏆</div>
                <div class="notevole-info">
                    <div class="notevole-label">Migliore Affare (€/g)</div>
                    <div class="notevole-valore">€${stats.campioneMiglioreAffare.prezzogrammo.toFixed(2)}/g</div>
                    <div class="notevole-dettagli">€${stats.campioneMiglioreAffare.prezzo.toFixed(2)} | ${stats.campioneMiglioreAffare.peso}g | ${stats.campioneMiglioreAffare.data}</div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

// ===========================
// MODIFICA CAMPIONE (con cambio minerale)
// ===========================
function modificaCampione(chiave, idx) {
 const dati = dbPrezzi[chiave];
 const campione = dati.campioni[idx];
 
 // 1. Chiedi minerale e località
 const nuovoMineraleRaw = prompt('💎 Minerale:', dati.minerale);
 if (nuovoMineraleRaw === null) return; // Annullato
 
 const nuovaLocalitaRaw = prompt('📍 Località:', dati.localita);
 if (nuovaLocalitaRaw === null) return;
 
 // 2. Chiedi prezzo e peso
 const nuovoPrezzo = prompt('💰 Prezzo (€):', campione.prezzo);
 if (nuovoPrezzo === null) return;
 
 const nuovoPeso = prompt('⚖️ Peso (g):', campione.peso);
 if (nuovoPeso === null) return;
 
 const nuoveNote = prompt('📝 Note:', campione.note || '');
 if (nuoveNote === null) return;
 
 const nuoviSecondari = prompt('🔗 Minerali secondari (separati da virgola):', (campione.mineraliSecondari || []).join(', '));
 if (nuoviSecondari === null) return;
 
 // Validazione valori numerici
 const prezzoNum = parseFloat(nuovoPrezzo);
 const pesoNum = parseFloat(nuovoPeso);
 
 if (isNaN(prezzoNum) || prezzoNum <= 0) {
  alert('❌ Prezzo non valido!');
  return;
 }
 
 if (isNaN(pesoNum) || pesoNum <= 0) {
  alert('❌ Peso non valido!');
  return;
 }
 
 // Normalizza minerale e località
 const nuovoMinerale = normalizzaMinerale(nuovoMineraleRaw);
 const nuovaLocalita = normalizzaLocalita(nuovaLocalitaRaw); // v0.2.5: canonizza "sconosciuta"
 const nuovaChiave = generaChiave(nuovoMinerale, nuovaLocalita);
 
 // Aggiorna i dati specifici del campione
 campione.prezzo = prezzoNum;
 campione.peso = pesoNum;
 campione.prezzogrammo = prezzoNum / pesoNum;
 campione.note = nuoveNote;
 campione.mineraliSecondari = parseMineraliSecondari(nuoviSecondari);
 
 // Controlla se minerale o località sono cambiati rispetto al gruppo attuale
 if (nuovaChiave !== chiave) {
  // Rimuovi il campione dal gruppo di origine
  dati.campioni.splice(idx, 1);
  
  if (dati.campioni.length === 0) {
   // Se non ci sono più campioni, elimina il vecchio gruppo
   delete dbPrezzi[chiave];
  } else {
   // Altrimenti ricalcola le medie del vecchio gruppo
   dati.medie = calcolaMedie(dati.campioni);
  }
  
  // Inserisci il campione nella destinazione corretta
  if (!dbPrezzi[nuovaChiave]) {
   dbPrezzi[nuovaChiave] = {
    minerale: nuovoMinerale,
    localita: nuovaLocalita,
    campioni: [],
    medie: {}
   };
  }
  
  dbPrezzi[nuovaChiave].campioni.push(campione);
  dbPrezzi[nuovaChiave].medie = calcolaMedie(dbPrezzi[nuovaChiave].campioni);
  
  chiave = nuovaChiave;
 } else {
  // Se è cambiato solo prezzo/peso/note nel gruppo corrente
  dati.medie = calcolaMedie(dati.campioni);
 }
 
 salvaDatabase();
 alert('✅ Campione aggiornato con successo!');
 
 // Ricarica la vista modal
 const modal = document.querySelector('.modal');
 if (modal) modal.remove();
 
 if (dbPrezzi[chiave]) {
  mostraDettagliMinerale(chiave);
 } else {
  mostraDatabase();
 }
}

// ===========================
// ELIMINA CAMPIONE
// ===========================
function eliminaCampione(chiave, idx) {
 const dati = dbPrezzi[chiave];
 const campione = dati.campioni[idx];
 
 // Conferma
 const conferma = confirm(
  `🗑️ ELIMINARE QUESTO CAMPIONE?\n\n` +
  `Minerale: ${dati.minerale}\n` +
  `Località: ${dati.localita}\n` +
  `Prezzo: €${campione.prezzo.toFixed(2)}\n` +
  `Peso: ${campione.peso}g\n\n` +
  `Questa azione è IRREVERSIBILE!`
 );
 
 if (!conferma) return;
 
 // Rimuovi campione
 dati.campioni.splice(idx, 1);
 
 // Se era l'ultimo, elimina minerale intero
 if (dati.campioni.length === 0) {
  delete dbPrezzi[chiave];
  salvaDatabase();
  alert('🗑️ Ultimo campione eliminato.\n\nMinerale rimosso dal database.');
  const modalUltimo = document.querySelector('.modal');
  if (modalUltimo) modalUltimo.remove();
  mostraDatabase();
  return;
 }
 
 // Altrimenti ricalcola medie
 dati.medie = calcolaMedie(dati.campioni);
 salvaDatabase();
 
 alert('✅ Campione eliminato!');
 
 // Ricarica modal
 const modalCorrente = document.querySelector('.modal');
 if (modalCorrente) modalCorrente.remove();
 mostraDettagliMinerale(chiave);
}

// ===========================
// STATISTICHE DASHBOARD
// ===========================

function aggiornaStatistiche() {
    const numMinerali = Object.keys(dbPrezzi).length;
    let numPrezzi = 0;
    let pesoTotale = 0;
    
    for (const dati of Object.values(dbPrezzi)) {
        numPrezzi += dati.campioni.length;
        pesoTotale += dati.campioni.reduce((sum, c) => sum + c.peso, 0);
    }
    
    document.getElementById('stat-minerali').textContent = numMinerali;
    document.getElementById('stat-prezzi').textContent = numPrezzi;
    document.getElementById('stat-peso-totale').textContent = pesoTotale.toFixed(1) + 'g';
    
    // Storage
    const storageSize = new Blob([JSON.stringify(dbPrezzi)]).size;
    const storageSizeKB = (storageSize / 1024).toFixed(2);
    const storageEl = document.getElementById('storage-size');
    if (storageEl) storageEl.textContent = storageSizeKB + ' KB';
}

// ===========================
// BACKUP
// ===========================

function esportaBackup() {
    const dataStr = JSON.stringify(dbPrezzi, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arena_flegrea_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function esportaDatabase() {
    esportaBackup();
}

function resetDatabase() {
    if (confirm('⚠ ATTENZIONE!\n\nEliminare TUTTI i dati?\n\nOperazione irreversibile!')) {
        if (confirm('Confermi di voler eliminare tutto?')) {
            dbPrezzi = {};
            localStorage.removeItem('arenaFlegreaPrezzi');
            mostraDatabase();
            aggiornaStatistiche();
            alert('✓ Database resettato');
        }
    }
}

// ===========================
// PULISCI BACKSLASH
// ===========================
function pulisciBackslash() {
 if (!confirm('🔧 Vuoi pulire i backslash dalle località?\n\n(Es: "Madagascar\\" → "Madagascar")')) {
  return;
 }
 
 let modificati = 0;
 const vecchieChiavi = Object.keys(dbPrezzi);
 
 vecchieChiavi.forEach(chiaveVecchia => {
  const dati = dbPrezzi[chiaveVecchia];
  
  // Sanitizza località
  const localitaPulita = dati.localita.replace(/\\/g, '');
  
  if (localitaPulita !== dati.localita) {
   dati.localita = localitaPulita;
   
   // Rigenera chiave corretta
   const chiaveNuova = generaChiave(dati.minerale, localitaPulita);
   
   if (chiaveNuova !== chiaveVecchia) {
    dbPrezzi[chiaveNuova] = dati;
    delete dbPrezzi[chiaveVecchia];
    modificati++;
   }
  }
 });
 
 if (modificati > 0) {
  salvaDatabase();
  alert(`✅ ${modificati} località pulite!\n\nRicarica la pagina.`);
  location.reload();
 } else {
  alert('✅ Nessun backslash trovato nel database!');
 }
}

// ===========================
// INIZIALIZZAZIONE
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌋 Arena Flegrea - Inizializzazione...');
    
    caricaDatabase();
    inizializzaQuickAdd();
    inizializzaValutatore();
    aggiornaStatistiche();
	
	console.log('🔍 Test: prima di aggiornaDatalist');
    aggiornaDatalist(); // ← AGGIUNGI QUESTA
    console.log('✓ Test: dopo aggiornaDatalist');
    
    // Import backup
    document.getElementById('import-backup')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const backup = JSON.parse(ev.target.result);
                if (confirm('Sovrascrivere database attuale?')) {
                    dbPrezzi = backup;
                    canonicalizzaDatabase(); // v0.2.8: allinea anche i backup importati
                    salvaDatabase();
                    mostraDatabase();
                    alert('✓ Backup ripristinato!');
                }
            } catch (err) {
                alert('Errore nel file di backup');
            }
        };
        reader.readAsText(file);
    });
    
    console.log('✓ Sistema pronto!');
});

window.mostraSezione = mostraSezione;
window.mostraDettagliMinerale = mostraDettagliMinerale;
window.esportaBackup = esportaBackup;
window.esportaDatabase = esportaDatabase;
window.resetDatabase = resetDatabase;
window.resetQuickAdd = resetQuickAdd;
window.modificaCampione = modificaCampione;
window.eliminaCampione = eliminaCampione;
window.pulisciBackslash = pulisciBackslash;
window.aggiornaDatalist = aggiornaDatalist;
window.filtraDatabase = filtraDatabase;

// PHASE 4: filtri Excel-like
window.mostraDatabase = mostraDatabase;
window.toggleFilterDropdown = toggleFilterDropdown;
window.toggleTutti = toggleTutti;
window.cercaNelPopover = cercaNelPopover;
window.applicaFiltri = applicaFiltri;
window.rimuoviTuttiFiltri = rimuoviTuttiFiltri;
window.impostaPeriodo = impostaPeriodo;

// V0.2.5: provenienza sconosciuta
window.toggleLocalitaSconosciuta = toggleLocalitaSconosciuta;

// v0.2.8: paginazione e migrazione
window.disegnaPaginaDatabase = disegnaPaginaDatabase;
window.disegnaListaCampioni = disegnaListaCampioni;
window.vaiAPagina = vaiAPagina;
window.cambiaGruppiPerPage = cambiaGruppiPerPage;
window.canonicalizzaDatabase = canonicalizzaDatabase;

// PHASE 5: scoring fotografico
window.leggiVotiScoring = leggiVotiScoring;
window.aggiornaPannelloScoring = aggiornaPannelloScoring;
window.resetScoring = resetScoring;
window.getFattoreLocalita = getFattoreLocalita;

/* ===========================
   v0.2.9 PULVISCOLO STELLARE (particelle calme con glow sul fondo)
   Canvas decorativo #cielo-flegrea, fisso dietro a tutto il contenuto.
   Due famiglie di particelle, entrambe con caduta obliqua verso sinistra:
   - asteroidi: detriti piccoli e lenti che pulsano, sempre presenti;
   - stelle cadenti: scie rapide e luminose che attraversano il cielo.
   Nessuna interazione, nessun dato: solo estetica. Nei browser senza
   canvas 2D (es. jsdom nei test) e con "movimento ridotto" attivo nel
   sistema l'effetto non parte e l'app funziona identica.
   =========================== */

// v0.2.10: 1 = notte piena (pulviscolo visibile), 0 = giorno pieno (pulviscolo spento)
let FATTORE_NOTTE = 1;

const STELLE_CONFIG = {
    idCanvas: 'cielo-flegrea',
    areaPerAsteroide: 78000,        // px² di viewport per ogni asteroide (calma: pochi)
    minAsteroidi: 6,
    maxAsteroidi: 24,
    angoloAsteroide: [8, 30],       // idem: i detriti di fondo cadono più dritti
    velocitaAsteroide: [10, 34],    // px/s (deriva quieta)
    raggioAsteroide: [0.7, 2.4]     // px
};

function avviaStelleCadenti() {
    const canvas = document.getElementById(STELLE_CONFIG.idCanvas);
    if (!canvas || typeof canvas.getContext !== 'function') return;
    if (typeof window.CanvasRenderingContext2D === 'undefined') return; // jsdom: nessun canvas 2D
    if (typeof window.requestAnimationFrame !== 'function') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (window.console && console.info) console.info('🌠 Cielo Flegrea disattivato: il sistema richiede movimento ridotto (prefers-reduced-motion). Per attivarlo: Impostazioni Windows > Accessibilità > Effetti visivi > Effetti animazione.');
        return;
    }
    try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const casualo = (min, max) => min + Math.random() * (max - min);
        const GRADI = Math.PI / 180;

        let larghezza = 0;
        let altezza = 0;
        let asteroidi = [];
        let ultimoTempo = 0;

        function numeroAsteroidi() {
            const area = Math.max(larghezza * altezza, 1);
            return Math.round(Math.max(STELLE_CONFIG.minAsteroidi,
                Math.min(STELLE_CONFIG.maxAsteroidi, area / STELLE_CONFIG.areaPerAsteroide)));
        }

        // Rinascita lungo il corridoio in alto a destra: cadendo in obliquo
        // verso sinistra la distribuzione resta uniforme su tutto il cielo.
        function rinasciAsteroide(a, primaVolta) {
            const angolo = casualo(STELLE_CONFIG.angoloAsteroide[0], STELLE_CONFIG.angoloAsteroide[1]) * GRADI;
            a.angolo = angolo;
            a.velocita = casualo(STELLE_CONFIG.velocitaAsteroide[0], STELLE_CONFIG.velocitaAsteroide[1]);
            a.r = casualo(STELLE_CONFIG.raggioAsteroide[0], STELLE_CONFIG.raggioAsteroide[1]);
            a.fase = casualo(0, Math.PI * 2);
            a.pulsazione = casualo(0.6, 2.4);
            a.alphaBase = casualo(0.25, 0.8);
            if (primaVolta) {
                a.x = casualo(-30, larghezza + altezza * 0.6);
                a.y = casualo(-20, altezza);
            } else {
                a.x = casualo(larghezza * 0.15, larghezza + altezza * 0.6);
                a.y = casualo(-altezza * 0.35, -15);
            }
        }


        function ridimensionaCielo() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            larghezza = window.innerWidth;
            // v0.2.11d: il cielo ora vive nell'header: l'altezza da coprire e'
            // quella del contenitore, non della finestra (fallback: finestra)
            const zona = canvas.parentElement;
            altezza = (zona && zona.clientHeight) ? zona.clientHeight
                                                  : window.innerHeight;
            canvas.width = Math.max(1, Math.round(larghezza * dpr));
            canvas.height = Math.max(1, Math.round(altezza * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            while (asteroidi.length < numeroAsteroidi()) {
                const a = {};
                rinasciAsteroide(a, true);
                asteroidi.push(a);
            }
            if (asteroidi.length > numeroAsteroidi()) {
                asteroidi.length = numeroAsteroidi();
            }
        }

        function aggiornaStelle(dt, adesso) {
            for (const a of asteroidi) {
                a.x += -Math.sin(a.angolo) * a.velocita * dt;
                a.y += Math.cos(a.angolo) * a.velocita * dt;
                if (a.y > altezza + 30 || a.x < -30) rinasciAsteroide(a, false);
            }
        }

        function disegnaStelle(adesso) {
            ctx.clearRect(0, 0, larghezza, altezza);

            // Asteroidi: detriti che pulsano con bagliore azzurro
            for (const a of asteroidi) {
                const scintillio = 0.65 + 0.35 * Math.sin(adesso / 1000 * a.pulsazione * Math.PI * 2 + a.fase);
                const alpha = a.alphaBase * scintillio * FATTORE_NOTTE;
                if (alpha < 0.01) continue;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
                ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
                ctx.shadowBlur = 5 + a.r * 4;
                ctx.fillStyle = 'rgba(186, 229, 253, ' + alpha.toFixed(3) + ')';
                ctx.fill();
                if (a.r > 1.4) { // nucleo più chiaro per i detriti grossi
                    ctx.beginPath();
                    ctx.arc(a.x, a.y, a.r * 0.5, 0, Math.PI * 2);
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.9).toFixed(3) + ')';
                    ctx.fill();
                }
            }

        }

        function cicloStelle(adesso) {
            if (!ultimoTempo) ultimoTempo = adesso;
            let dt = (adesso - ultimoTempo) / 1000;
            ultimoTempo = adesso;
            if (dt > 0.05) dt = 0.05; // dopo un cambio di scheda nessun salto brusco
            aggiornaStelle(dt, adesso);
            disegnaStelle(adesso);
            window.requestAnimationFrame(cicloStelle);
        }

        ridimensionaCielo();
        if (window.console && console.log) {
            console.log('🌠 Cielo Flegrea attivo: ' + asteroidi.length + ' granelli in deriva quieta');
        }
        window.addEventListener('resize', ridimensionaCielo);
        window.requestAnimationFrame(cicloStelle);
    } catch (errore) {
        // Solo estetica: se qualcosa va storto, l'app continua senza particelle.
        if (window.console && console.warn) console.warn('Stelle cadenti non attive:', errore);
    }
}

document.addEventListener('DOMContentLoaded', avviaStelleCadenti);

/* ===========================
   v0.2.10 CICLO NOTTE E GIORNO
   Un "disco orario": sole e luna si alternano sullo stesso percorso parabolico
   (sorgono a sinistra, culminano in alto, tramontano a destra). Ritmi: 20 s di
   traversata per corpo (un quarto della velocita' originale) e 5 s di pausa in
   notte piena tra il tramonto della luna e l'alba del sole (ciclo di 45 s).
   v0.2.11: il cielo dell'header segue il sole — FASI precise sulla traversata di
   20 s: alba (plateau) 3-6, passaggio ad azzurro 7-10, azzurro finché il sole
   non tocca l'orizzonte (~17 s), poi TRAMONTO GEOMETRICO legato all'affondamento
   del disco (16,6 -> 20 s, massimo alla scomparsa). BAGLIORI CIRCOLARI.
   DENSITA': i CERCHI di sole e luna sono sempre al 100% nel proprio turno (la
   geometria del golfo li copre quando affondano); solo alone, scia e bagliori
   si spengono sott'acqua, perche' sporgono oltre la linea.
   LUNA ROSSA: la luna e' tinta di rosso (gradienti in index.html) e nel suo
   turno schiarisce la notte al culmine, con alone e bagliore rosa che crescono
   con l'altezza.
   Cambiano SOLO i colori del fondo naturale — cielo (var --background),
   silhouette del Vesuvio, mare, terra costiera, linea d'orizzonte — mentre
   schede, sezioni interne e testi restano sui colori scuri originali.
   Prestazioni: POSIZIONI e COLORI sono aggiornati a ogni fotogramma (60 fps,
   scena sempre fluida); un cambio-detect salta le scritture invariate, cosi'
   le notti stabili non costano nulla.
   Nei browser senza requestAnimationFrame (jsdom nei test) e con
   "movimento ridotto" il ciclo non parte: resta la notte statica.
   =========================== */

const CICLO_CONFIG = {
    msSole: 20000,            // traversata del sole: 1/4 della velocita' originaria (era 5 s)
    msLuna: 20000,            // traversata della luna
    msPausa: 5000,            // pausa in notte piena tra luna e sole (luna -> pausa -> sole)
    // (storico) aggioramentoMs non e' piu' usato: dalla v0.2.11b anche i colori
    // corrono a ogni frame, con cambio-detect sulle scritture
    aggioramentoMs: 120,
    // parabola: sorgenza DIETRO il Monte Somma (x 490) -> culmine -> mare aperto (x 900).
    // yu0 = quota orizzonte in unita' utente; i corpi viaggiano SOTTO (alba/tramonto)
    // cosi' entrano e escono nascosti dietro montagna/mare: mai mozzati dal bordo.
    inizioX: 490, fineX: 900,
    yu0: 210,         // quota (unita' utente) della linea d'orizzonte
    quotaY: 88,       // culmine BASSO, sopra la cupola del Vesuvio (unita' utente)
    immersione: 26    // capi sotto l'orizzonte (nascosti dietro monte/terra/mare)
};

function avviaCicloNotteGiorno() {
    if (typeof window.requestAnimationFrame !== 'function') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
        const sole = document.getElementById('corpo-sole');
        const luna = document.getElementById('corpo-luna');
        const scia = document.querySelector('.scia-luna');
        const aloneLuna = luna ? luna.querySelector('.alone-luna') : null;
        const aloneSole = sole ? sole.querySelector('.alone-sole') : null;
        const baglioreSole = document.getElementById('bagliore-sole');
        const baglioreLuna = document.getElementById('bagliore-luna');
        const stopVesuvioA = document.getElementById('stop-vesuvio-a');
        const stopVesuvioB = document.getElementById('stop-vesuvio-b');
        const stopMareA = document.getElementById('stop-mare-a');
        const stopMareB = document.getElementById('stop-mare-b');
        const stopTerraA = document.getElementById('stop-terra-a');
        const stopTerraB = document.getElementById('stop-terra-b');
        const orizzonte = document.getElementById('linea-orizzonte');
        const luci = document.getElementById('luci-costiera');
        if (!sole || !luna || !stopVesuvioA) return;

        const limita = (v, min, max) => Math.max(min, Math.min(max, v));
        const mescola = (a, b, t) => a + (b - a) * t;
        const canale = (esad) => [
            parseInt(esad.slice(1, 3), 16),
            parseInt(esad.slice(3, 5), 16),
            parseInt(esad.slice(5, 7), 16)
        ];
        const sfuma = (notte, giorno, t) => {
            const cn = canale(notte), cg = canale(giorno);
            return 'rgb(' + Math.round(mescola(cn[0], cg[0], t)) + ','
                + Math.round(mescola(cn[1], cg[1], t)) + ','
                + Math.round(mescola(cn[2], cg[2], t)) + ')';
        };
        // v0.2.11: doppia miscela — prima notte->giorno, poi la tinta calda sopra
        const tingi = (notte, giornoHex, tGiorno, caldoHex, tCaldo) => {
            const cn = canale(notte), cg = canale(giornoHex);
            let r = Math.round(mescola(cn[0], cg[0], tGiorno));
            let g = Math.round(mescola(cn[1], cg[1], tGiorno));
            let b = Math.round(mescola(cn[2], cg[2], tGiorno));
            if (caldoHex && tCaldo > 0) {
                const cc = canale(caldoHex);
                r = Math.round(mescola(r, cc[0], tCaldo));
                g = Math.round(mescola(g, cc[1], tCaldo));
                b = Math.round(mescola(b, cc[2], tCaldo));
            }
            return 'rgb(' + r + ',' + g + ',' + b + ')';
        };

        // palette: notte (attuale) -> giorno (piu' chiara ma sempre scura abbastanza
        // da lasciare leggibili testo e schede, che NON vengono toccati)
        const PAL = {
            cieloNotte: '#060b16',  cieloGiorno: '#234a6d',
            vesAnotte: '#16305a',   vesAgiorno: '#153852',
            vesBnotte: '#0a1630',   vesBgiorno: '#0c2038',
            terraAnotte: '#16305a', terraAgiorno: '#1d3c57',
            terraBnotte: '#0a1630', terraBgiorno: '#12283e',
            orzNotte: '#38bdf8',    orzGiorno: '#bae6fd',
            // v0.2.11b: cielo della scena (header) a gradiente verticale. Notte =
            // look composto identico a prima (zinc del vecchio statico PRE-MISCELATO
            // col velo blu del restyling, ormai rimosso dal CSS); giorno = azzurro
            // che culmina allo zenit; tinte calde da sole basso
            cieloAltoNotte: '#101623',  cieloAltoGiorno: '#234a6d',
            cieloMedioNotte: '#191c25', cieloMedioGiorno: '#2c5a85',
            cieloBassoNotte: '#24242a', cieloBassoGiorno: '#356a99',
            caldoBasso: '#f59e0b',      // arancio dorato all'orizzonte
            caldoMedio: '#fb7185',      // rosa che sale dal mare
            // v0.2.11 LUNA ROSSA: notte al culmine della luna — meno buio, blu
            // lunario con una punta violacea; il fondo pagina si schiarisce poco
            lunaAlto: '#1a2438',  lunaMedio: '#212839',
            lunaBasso: '#2e2d3c', lunaFondo: '#0d1626'
        };

        // cambio-detect: mappa chiave -> ultimo valore scritto; se il valore non
        // cambia (notte stabile, zenit, pausa) nessuna scrittura tocca il DOM
        const ultimeTinte = new Map();
        const scriviSeCambia = (chiave, el, attr, val) => {
            if (ultimeTinte.get(chiave) === val) return;
            ultimeTinte.set(chiave, val);
            el.setAttribute(attr, val);
        };
        const varSeCambia = (nome, val) => {
            if (ultimeTinte.get(nome) === val) return;
            ultimeTinte.set(nome, val);
            document.documentElement.style.setProperty(nome, val);
        };

        // palette e luci: aggiornata a ogni frame, ma scrive solo cio' che cambia
        function aggiornaColori(giorno, caldo, riflesso) {
            scriviSeCambia('vesA', stopVesuvioA, 'stop-color', sfuma(PAL.vesAnotte, PAL.vesAgiorno, giorno));
            scriviSeCambia('vesB', stopVesuvioB, 'stop-color', sfuma(PAL.vesBnotte, PAL.vesBgiorno, giorno));
            scriviSeCambia('marA', stopMareA, 'stop-color', sfuma('#38bdf8', '#7dd3fc', giorno));
            scriviSeCambia('marAo', stopMareA, 'stop-opacity', mescola(0.14, 0.18, giorno).toFixed(3));
            scriviSeCambia('marBo', stopMareB, 'stop-opacity', mescola(0.03, 0.05, giorno).toFixed(3));
            scriviSeCambia('terA', stopTerraA, 'stop-color', sfuma(PAL.terraAnotte, PAL.terraAgiorno, giorno));
            scriviSeCambia('terB', stopTerraB, 'stop-color', sfuma(PAL.terraBnotte, PAL.terraBgiorno, giorno));
            scriviSeCambia('orz', orizzonte, 'stroke', sfuma(PAL.orzNotte, PAL.orzGiorno, giorno));
            scriviSeCambia('orzo', orizzonte, 'stroke-opacity', mescola(0.28, 0.40, giorno).toFixed(3));
            if (luci) scriviSeCambia('luci', luci, 'opacity', mescola(1, 0.15, giorno).toFixed(3));

            varSeCambia('--background', riflesso > 0
                ? sfuma(PAL.cieloNotte, PAL.lunaFondo, riflesso)
                : sfuma(PAL.cieloNotte, PAL.cieloGiorno, giorno));
            // v0.2.11: il cielo della scena entra nel ciclo — notte = look identico
            // a prima, sole basso = banda calda all'orizzonte, sole in quota = azzurro.
            // LUNA ROSSA: con la luna alta la notte perde buio (blu lunario, punta
            // violacea) invece di restare intoccata
            varSeCambia('--cielo-alto', riflesso > 0
                ? tingi(PAL.cieloAltoNotte, PAL.lunaAlto, riflesso, null, 0)
                : tingi(PAL.cieloAltoNotte, PAL.cieloAltoGiorno, giorno, null, 0));
            varSeCambia('--cielo-medio', riflesso > 0
                ? tingi(PAL.cieloMedioNotte, PAL.lunaMedio, riflesso, PAL.caldoMedio, caldo * 0.55)
                : tingi(PAL.cieloMedioNotte, PAL.cieloMedioGiorno, giorno, PAL.caldoMedio, caldo * 0.55));
            varSeCambia('--cielo-basso', riflesso > 0
                ? tingi(PAL.cieloBassoNotte, PAL.lunaBasso, riflesso, PAL.caldoBasso, caldo)
                : tingi(PAL.cieloBassoNotte, PAL.cieloBassoGiorno, giorno, PAL.caldoBasso, caldo));
            FATTORE_NOTTE = 1 - giorno;
        }

        function aggiornaCiclo(adesso) {
            // turni in sequenza: SOLE -> LUNA -> PAUSA (notte piena tra luna e sole)
            const durata = CICLO_CONFIG.msSole + CICLO_CONFIG.msLuna + CICLO_CONFIG.msPausa;
            const t = adesso % durata;
            let faseSole = false, inPausa = false, prog;
            if (t < CICLO_CONFIG.msSole) {
                faseSole = true;
                prog = t / CICLO_CONFIG.msSole;             // 0 -> 1 sulla traversata
            } else if (t < CICLO_CONFIG.msSole + CICLO_CONFIG.msLuna) {
                prog = (t - CICLO_CONFIG.msSole) / CICLO_CONFIG.msLuna;
            } else {
                inPausa = true;
                prog = 0;
            }
            // parabola: sorge dietro il Somma, culmina, tuffa in mare. u = sin(prog*pi):
            // curva u^1.15: resta bassa rasente l'orizzonte e sale solo al culmine
            const u = Math.sin(prog * Math.PI);             // 0 -> 1 -> 0
            const x = mescola(CICLO_CONFIG.inizioX, CICLO_CONFIG.fineX, prog);
            const y = CICLO_CONFIG.yu0 + CICLO_CONFIG.immersione
                - Math.pow(u, 1.15) * CICLO_CONFIG.quotaY;
            // alt = altitudine del centro sopra l'orizzonte. I CERCHI non hanno
            // dissolvenza (sempre densi al 100%: la cresta della costiera ~y213
            // e il Somma li coprono da soli); la vista serve solo ad alone, scia
            // e bagliori, che sporgono oltre la linea e vanno spenti sott'acqua
            // PRIMA del limite (a -16: dentro il layer, mai mozzati)
            const alt = CICLO_CONFIG.yu0 - y;
            const vista = limita((alt + 16) / 18, 0, 1);

            const curva = Math.sin(prog * Math.PI); // 0 ai capi, 1 al culmine
            // azzurro massimo ESATTAMENTE allo zenit del disco (curva=1), non prima:
            // curva^1.6 resta bassa a lungo e raggiunge l'intensita' piena solo in cima
            // (in discesa vedi il giorno geometrico: pieno fino a ~17,6 s).
            // Il giorno esiste SOLO nel turno del sole: ai passaggi di consegne
            // l'intensita' e' 0 da entrambi i lati (prima la curva della luna lasciava
            // 0.5 al confine -> flash di cambio colore a fine ciclo)
            // il giorno NON scura mentre il disco e' ancora ben visibile (Fabio:
            // "scurisce quando il cerchio del sole e' ancora presente: fai durare
            // l'azzurro un secondo in piu'"): in discesa resta pieno fino a
            // ~17,6 s (centro che sfiora la linea, alt=2: un secondo dopo il tocco
            // del lembo), poi cede SOLO con l'ultimo tratto di affondamento e tocca
            // lo zero esattamente alla scomparsa del disco (alt=-26, t=20 s)
            const giorno = faseSole
                ? (prog <= 0.5 ? Math.pow(curva, 1.6)
                               : limita((alt + 26) / 28, 0, 1))
                : 0;

            // v0.2.11c ALBA E TRAMONTO (Fabio: "riduci il ciclo alba da 3 a 8,
            // ~10 s switch all'azzurro"): la banda calda vive in una FINESTRA della
            // traversata — sboccia tra il 2.o e il 3.o secondo, plateau pieno dal
            // 3.o all'8.o, svanisce entro il 9.o (un secondo prima dello zenit):
            // azzurro pieno dato dai ~10 secondi. Simmetrica: il tramonto riacende
            // nella stessa finestra della discesa
            // v0.2.11e FASI (Fabio): alba 3-6 s, passaggio ad azzurro 7-10 s,
            // azzurro pieno FINO A 17 s, tramonto 17-20 s (pieno al tuffo).
            // Niente dipendenza dall'altitudine: i dischi sono densi e la geometria
            // del golfo copre; il caldo vive solo sulla TEMPOLINEA
            const dalCulmine = Math.abs(prog - 0.5);           // 0 allo zenit, 0.5 ai capi
            // ingresso solo sulla salita (accende: 2 s -> 3 s); in discesa il
            // tramonto e' gestito dalla tenuta
            const ingresso = prog <= 0.5
                ? limita((0.40 - dalCulmine) / 0.05, 0, 1)
                : 1;
            // tenuta asimmetrica: prima dello zenit il caldo scende 7->10 s;
            // dopo lo zenit il TRAMONTO E' GEOMETRICO (Fabio: "nella realta' e'
            // attivo quando il sole e' sull'orizzonte e termina quando e' del
            // tutto sparito"): si accende quando il LEMBO INFERIORE tocca la
            // linea (alt = +14: ~16,6 s) e cresce con l'affondamento finché il
            // centro raggiunge l'immersione completa (alt = -26: t = 20 s),
            // dove brucia al massimo. Susegue la curva reale del disco
            const tenuta = prog <= 0.5
                ? limita(dalCulmine / 0.15, 0, 1)
                : limita((14 - alt) / 40, 0, 1);
            // CREPUSCOLO: al passaggio di consegne il tramonto pieno muore in 1,5 s
            // nel turno della luna (che sorge nel bagliore): nessun flash al confine
            const caldo = faseSole ? ingresso * tenuta
                : (!inPausa && t - CICLO_CONFIG.msSole < 1500
                    ? 1 - (t - CICLO_CONFIG.msSole) / 1500
                    : 0);
            // LUNA ROSSA: nel turno della luna la stessa curva schiarisce la notte
            // al culmine ("riduci il buio") mentre l'alone rosa si allarga
            const riflessoLuna = faseSole ? 0 : curva;

            sole.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
            // DENSITA' 100%: il cerchio non sfuma mai nel proprio turno (esce solo
            // per geometria, dietro monte/mare); l'ALONE si spegne sott'acqua
            scriviSeCambia('so', sole, 'opacity', faseSole ? '1' : '0');
            if (aloneSole) scriviSeCambia('aso', aloneSole, 'opacity', vista.toFixed(3));
            luna.setAttribute('transform', 'translate(' + (x - 676).toFixed(1) + ',' + (y - 148).toFixed(1) + ')');
            scriviSeCambia('lu', luna, 'opacity', faseSole ? '0' : '1');
            if (scia) {
                scia.setAttribute('transform', 'translate(' + (x - 676).toFixed(1) + ',0)');
                scia.setAttribute('opacity', (faseSole ? 0 : vista * 0.55).toFixed(3));
            }
            // LUNA ROSSA: l'alone rosa cresce con l'altezza (raggio 46->60,
            // presenza 0.6->1): bassa e' discreto, al culmine abbaglia la notte
            if (aloneLuna && !faseSole) {
                scriviSeCambia('alr', aloneLuna, 'r', mescola(46, 60, curva).toFixed(1));
                scriviSeCambia('alo', aloneLuna, 'opacity',
                    (mescola(0.6, 1, curva) * vista).toFixed(3));
            }
            // BAGLIORI CIRCOLARI: gradienti radiali che seguono i dischi (il sole
            // accende il cielo della sua finestra calda, la luna rossa sparge rosa
            // quanto piu' e' alta). Visibile ~63 px: sempre dentro la regione
            if (baglioreSole) {
                if (faseSole) {
                    // nel crepuscolo il bagliore resta FERMO al punto del tuffo
                    scriviSeCambia('bsx', baglioreSole, 'cx', x.toFixed(1));
                    scriviSeCambia('bsy', baglioreSole, 'cy', y.toFixed(1));
                }
                scriviSeCambia('bso', baglioreSole, 'opacity', (caldo * 0.9).toFixed(3));
            }
            if (baglioreLuna) {
                scriviSeCambia('blx', baglioreLuna, 'cx', x.toFixed(1));
                scriviSeCambia('bly', baglioreLuna, 'cy', y.toFixed(1));
                scriviSeCambia('blo', baglioreLuna, 'opacity', (faseSole ? 0 : riflessoLuna * 0.75).toFixed(3));
            }
            // (nota: luna e scia usano lo stesso x,y del sole: gli offset -676/-148
            // compensano la posizione dei gruppi in markup, vedi index.html)

            // v0.2.11b: colori a OGNI frame come le posizioni (60 fps): il
            // cambio-detect dentro aggiornaColori rende il costo quasi nullo
            aggiornaColori(giorno, caldo, riflessoLuna);
        }

        function cicloCorpo(adesso) {
            aggiornaCiclo(adesso); // posizioni a ogni frame: disco liscio, zero scatti
            window.requestAnimationFrame(cicloCorpo);
        }

        aggiornaCiclo(0);
        window.requestAnimationFrame(cicloCorpo);
        if (window.console && console.log) {
            console.log('☀️ Ciclo notte-giorno attivo: sole ' + CICLO_CONFIG.msSole
                + ' ms, luna ' + CICLO_CONFIG.msLuna + ' ms, pausa ' + CICLO_CONFIG.msPausa + ' ms');
        }
    } catch (errore) {
        if (window.console && console.warn) console.warn('Ciclo notte-giorno non attivo:', errore);
    }
}

document.addEventListener('DOMContentLoaded', avviaCicloNotteGiorno);
