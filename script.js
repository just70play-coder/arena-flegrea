// ===========================
// CONFIGURAZIONE GLOBALE
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
    
    criteriQualita: {
        cristallinita: 0.25,
        estetica: 0.20,
        rarita: 0.20,
        dimensioni: 0.15,
        integrita: 0.10,
        trasparenza: 0.10
    },
    
    // Location factors specifici per minerale
    localitaMinerali: {
        'diaspro': {
            'Madagascar': 1.2,
            'Egitto': 1.3,
            'Australia': 1.15,
            'Brasile': 1.0,
            'USA': 1.1,
            'India': 0.95,
            'Russia': 1.05,
            'Sudafrica': 1.1
        },
        'sanidino': {
            'Monte Nuovo': 1.4,
            'Solfatara': 1.5,
            'Pisciarelli': 1.6,
            'Astroni': 1.3,
            'Campi Flegrei': 1.3,
            'Vesuvio': 1.2
        },
        'leucite': {
            'Monte Somma': 1.5,
            'Vesuvio': 1.4,
            'Campi Flegrei': 1.3,
            'Alban Hills': 1.2
        },
        'hauyne': {
            'Laacher See': 1.6,
            'Eifel': 1.5,
            'Campi Flegrei': 1.4,
            'Vesuvio': 1.3
        },
        'quarzo': {
            'Brasile': 1.15,
            'Madagascar': 1.1,
            'Alpi': 1.25,
            'Arkansas': 1.2,
            'Himalaya': 1.3,
            'Messico': 1.0
        },
        'ametista': {
            'Brasile': 1.0,
            'Uruguay': 1.2,
            'Zambia': 1.15,
            'Russia': 1.1,
            'Messico': 0.95
        },
        'citrino': {
            'Brasile': 1.1,
            'Madagascar': 1.15,
            'Congo': 1.2,
            'Zambia': 1.05
        }
    },
    
    // Fattori località generici (fallback)
    fattoriLocalita: {
        'Monte Nuovo': 1.4,
        'Solfatara': 1.5,
        'Pisciarelli': 1.6,
        'Astroni': 1.3,
        'Campi Flegrei': 1.3,
        'Vesuvio': 1.2,
        'Madagascar': 1.1,
        'Brasile': 1.0,
        'altra località': 0.85
    },
    
    rangeIntegrita: {
        'Perfetta (100%)': 1.0,
        'Eccellente (90-99%)': 0.95,
        'Ottima (80-89%)': 0.85,
        'Buona (70-79%)': 0.75,
        'Discreta (60-69%)': 0.65,
        'Danneggiata (<60%)': 0.55
    }
};

// ===========================
// DIZIONARIO ALIAS MINERALI
// ===========================

const ALIAS_MINERALI = {
    'diaspro': ['jasper', 'jaspis', 'diaspro rosso', 'red jasper', 'ocean jasper', 'diaspro oceanico', 'picture jasper'],
    'quarzo': ['quartz', 'cristallo di rocca', 'rock crystal', 'quarzo ialino'],
    'ametista': ['amethyst', 'ametist'],
    'citrino': ['citrine', 'citrin'],
    'quarzo rosa': ['rose quartz', 'pink quartz'],
    'quarzo fumé': ['smoky quartz', 'smokey quartz', 'morion'],
    'sanidino': ['sanidine'],
    'leucite': ['leucita', 'leucita'],
    'hauyne': ['hauyna', 'haüyne', 'hauynite'],
    'pirite': ['pyrite', 'pirita'],
    'calcite': ['calcita', 'calcite'],
    'fluorite': ['fluorita', 'fluorite'],
    'aragonite': ['aragonita', 'aragonite'],
    'sodalite': ['sodalita', 'sodalite'],
    'labradorite': ['labradorita', 'spectrolite'],
    'opale': ['opal', 'opale di fuoco', 'fire opal'],
    'tormalina': ['tourmaline', 'elbaite', 'schorl']
};

// ===========================
// DATABASE LOCALE
// ===========================

let dbPrezzi = {};

// Carica database da localStorage
function caricaDatabase() {
    const saved = localStorage.getItem('arenaFlegreaPrezzi');
    if (saved) {
        try {
            dbPrezzi = JSON.parse(saved);
            console.log('Database caricato:', Object.keys(dbPrezzi).length, 'minerali');
        } catch (e) {
            console.error('Errore caricamento database:', e);
            dbPrezzi = {};
        }
    }
}

// Salva database in localStorage
function salvaDatabase() {
    try {
        localStorage.setItem('arenaFlegreaPrezzi', JSON.stringify(dbPrezzi));
        console.log('Database salvato');
    } catch (e) {
        console.error('Errore salvataggio database:', e);
        alert('Errore nel salvataggio dei dati. Memoria piena?');
    }
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

// Normalizza nome minerale
function normalizzaMinerale(input) {
    const inputLower = input.toLowerCase().trim();
    
    // Cerca negli alias
    for (const [standard, aliases] of Object.entries(ALIAS_MINERALI)) {
        if (inputLower === standard || aliases.includes(inputLower)) {
            return standard;
        }
    }
    
    // Se non trovato, ritorna l'input originale capitalizzato
    return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
}

// Ottiene fattore località (mineral-specific)
function getFattoreLocalita(minerale, localita) {
    const mineraleNorm = normalizzaMinerale(minerale);
    const localitaMineraleDB = CONFIG.localitaMinerali[mineraleNorm];
    
    if (localitaMineraleDB && localitaMineraleDB[localita]) {
        return localitaMineraleDB[localita];
    }
    
    // Fallback su fattori generici
    return CONFIG.fattoriLocalita[localita] || CONFIG.fattoriLocalita['altra località'];
}

// Genera chiave univoca per database
function generaChiave(minerale, localita) {
    return `${normalizzaMinerale(minerale)}_${localita}`.toLowerCase().replace(/\s+/g, '_');
}

// Calcola medie per mercato
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

// Calcola media ponderata mercati
function calcolaMediaPonderata(medie, usaPesoGrammo = false) {
    let somma = 0;
    let pesoTotale = 0;
    
    for (const [mercato, dati] of Object.entries(medie)) {
        if (CONFIG.pesiMercato[mercato]) {
            let valore = usaPesoGrammo ? dati.mediaPrezzoGrammo : dati.mediaPrezzo;
            
            // Applica correzione Etsy
            if (mercato === 'etsy') {
                valore *= CONFIG.fattoreCorrezioneEtsy;
            }
            
            somma += valore * CONFIG.pesiMercato[mercato];
            pesoTotale += CONFIG.pesiMercato[mercato];
        }
    }
    
    return pesoTotale > 0 ? somma / pesoTotale : 0;
}

// Calcola score qualità
function calcolaScoreQualita(valori) {
    let score = 0;
    
    for (const [criterio, peso] of Object.entries(CONFIG.criteriQualita)) {
        const valore = valori[criterio] || 5; // default 5/10
        score += (valore / 10) * peso;
    }
    
    return score * 10; // ritorna 0-10
}

// ===========================
// QUICK ADD - GESTIONE FORM
// ===========================

function inizializzaQuickAdd() {
    const form = document.getElementById('quickAddForm');
    const pesoInput = document.getElementById('qa-peso');
    const prezzoInput = document.getElementById('qa-prezzo');
    const euroGrammoSpan = document.getElementById('qa-eurogrammo');
    
    // Calcolo live €/grammo
    function aggiornaEuroGrammo() {
        const peso = parseFloat(pesoInput.value);
        const prezzo = parseFloat(prezzoInput.value);
        
        if (peso > 0 && prezzo > 0) {
            const euroGrammo = prezzo / peso;
            euroGrammoSpan.textContent = euroGrammo.toFixed(2);
        } else {
            euroGrammoSpan.textContent = '0.00';
        }
    }
    
    pesoInput.addEventListener('input', aggiornaEuroGrammo);
    prezzoInput.addEventListener('input', aggiornaEuroGrammo);
    
    // Submit form
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        aggiungiPrezzoQuick();
    });
}

function aggiungiPrezzoQuick() {
    const minerale = document.getElementById('qa-minerale').value.trim();
    const localita = document.getElementById('qa-localita').value.trim();
    const peso = parseFloat(document.getElementById('qa-peso').value);
    const prezzo = parseFloat(document.getElementById('qa-prezzo').value);
    const mercato = document.getElementById('qa-mercato').value;
    const dimensioni = document.getElementById('qa-dimensioni').value.trim();
    const link = document.getElementById('qa-link').value.trim();
    const note = document.getElementById('qa-note').value.trim();
    
    // Validazione
    if (!minerale || !localita || peso <= 0 || prezzo <= 0) {
        alert('Compila tutti i campi obbligatori (minerale, località, peso, prezzo)');
        return;
    }
    
    const mineraleNorm = normalizzaMinerale(minerale);
    const chiave = generaChiave(mineraleNorm, localita);
    const prezzogrammo = prezzo / peso;
    
    // Crea/aggiorna entry database
    if (!dbPrezzi[chiave]) {
        dbPrezzi[chiave] = {
            minerale: mineraleNorm,
            localita: localita,
            tipologiaPrezzo: 'peso', // default peso, può essere cambiato dopo
            campioni: [],
            medie: {}
        };
    }
    
    // Aggiungi campione
    const campione = {
        prezzo: prezzo,
        peso: peso,
        prezzogrammo: prezzogrammo,
        dimensioni: dimensioni,
        mercato: mercato,
        data: new Date().toISOString().split('T')[0],
        link: link,
        note: note
    };
    
    dbPrezzi[chiave].campioni.push(campione);
    
    // Ricalcola medie
    dbPrezzi[chiave].medie = calcolaMedie(dbPrezzi[chiave].campioni);
    
    // Salva
    salvaDatabase();
    
    // Feedback
    alert(`✓ Prezzo aggiunto!\n${mineraleNorm} - ${localita}\n€${prezzo.toFixed(2)} / ${peso}g = €${prezzogrammo.toFixed(2)}/g`);
    
    // Reset form
    document.getElementById('quickAddForm').reset();
    document.getElementById('qa-eurogrammo').textContent = '0.00';
    
    // Aggiorna visualizzazione database
    mostraDatabase();
}

// ===========================
// VALUTATORE QUICK MODE
// ===========================

function inizializzaValutatore() {
    const form = document.getElementById('valutatoreForm');
    const pesoInput = document.getElementById('val-peso');
    const prezzoInput = document.getElementById('val-prezzo');
    const euroGrammoSpan = document.getElementById('val-eurogrammo');
    
    // Calcolo live €/grammo
    function aggiornaEuroGrammo() {
        const peso = parseFloat(pesoInput.value);
        const prezzo = parseFloat(prezzoInput.value);
        
        if (peso > 0 && prezzo > 0) {
            const euroGrammo = prezzo / peso;
            euroGrammoSpan.textContent = euroGrammo.toFixed(2);
        } else {
            euroGrammoSpan.textContent = '0.00';
        }
    }
    
    pesoInput.addEventListener('input', aggiornaEuroGrammo);
    prezzoInput.addEventListener('input', aggiornaEuroGrammo);
    
    // Submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        eseguiValutazione();
    });
}

function eseguiValutazione() {
    const minerale = document.getElementById('val-minerale').value.trim();
    const localita = document.getElementById('val-localita').value.trim();
    const peso = parseFloat(document.getElementById('val-peso').value);
    const prezzo = parseFloat(document.getElementById('val-prezzo').value);
    
    // Validazione
    if (!minerale || !localita || peso <= 0 || prezzo <= 0) {
        alert('Compila tutti i campi (minerale, località, peso, prezzo)');
        return;
    }
    
    const mineraleNorm = normalizzaMinerale(minerale);
    const chiave = generaChiave(mineraleNorm, localita);
    
    // Verifica se esiste database per questo minerale/località
    const datiDB = dbPrezzi[chiave];
    
    if (!datiDB || Object.keys(datiDB.medie).length === 0) {
        alert(`⚠ Nessun dato storico per ${mineraleNorm} - ${localita}\n\nAggiungi prima dei prezzi nel Quick Add per creare un database di riferimento.`);
        return;
    }
    
    // Calcola valore stimato
    const valoreStimato = calcolaValoreStimato(mineraleNorm, localita, peso, datiDB);
    
    // Calcola raccomandazione
    const percentuale = (prezzo / valoreStimato) * 100;
    const raccomandazione = generaRaccomandazione(percentuale);
    
    // Mostra risultati
    mostraRisultatiValutazione({
        minerale: mineraleNorm,
        localita: localita,
        peso: peso,
        prezzo: prezzo,
        prezzogrammo: prezzo / peso,
        valoreStimato: valoreStimato,
        percentuale: percentuale,
        raccomandazione: raccomandazione,
        datiDB: datiDB
    });
}

function calcolaValoreStimato(minerale, localita, peso, datiDB) {
    const medie = datiDB.medie;
    
    // Determina se usare prezzo/grammo o prezzo totale
    let mediaPonderata;
    const hasPrezzoGrammo = Object.values(medie).some(m => m.mediaPrezzoGrammo > 0);
    
    if (hasPrezzoGrammo) {
        // Calcola media ponderata €/g e moltiplica per peso
        const mediaPrezzoGrammo = calcolaMediaPonderata(medie, true);
        mediaPonderata = mediaPrezzoGrammo * peso;
    } else {
        // Usa prezzo totale
        mediaPonderata = calcolaMediaPonderata(medie, false);
    }
    
    // Applica fattori
    const fattoreLocalita = getFattoreLocalita(minerale, localita);
    const scoreQualita = 5; // default, utente può modificare in futuro
    const fattoreQualita = scoreQualita / 10;
    const fattoreIntegrita = 0.95; // default "Eccellente"
    
    const valore = mediaPonderata * fattoreLocalita * fattoreQualita * fattoreIntegrita;
    
    return valore;
}

function generaRaccomandazione(percentuale) {
    if (percentuale <= 60) {
        return {
            testo: 'ACQUISTO ECCELLENTE',
            classe: 'eccellente',
            emoji: '🌟'
        };
    } else if (percentuale <= 80) {
        return {
            testo: 'BUON ACQUISTO',
            classe: 'buono',
            emoji: '✓'
        };
    } else if (percentuale <= 100) {
        return {
            testo: 'PREZZO CORRETTO',
            classe: 'corretto',
            emoji: '='
        };
    } else if (percentuale <= 120) {
        return {
            testo: 'SOPRAVVALUTATO',
            classe: 'sopravvalutato',
            emoji: '⚠'
        };
    } else {
        return {
            testo: 'SCONSIGLIATO',
            classe: 'sconsigliato',
            emoji: '✗'
        };
    }
}

function mostraRisultatiValutazione(risultati) {
    const container = document.getElementById('risultatiValutazione');
    
    const html = `
        <div class="risultato-card raccomandazione-${risultati.raccomandazione.classe}">
            <h3>${risultati.raccomandazione.emoji} ${risultati.raccomandazione.testo}</h3>
            
            <div class="risultato-principale">
                <div class="valore-riga">
                    <span>Prezzo proposto:</span>
                    <strong>€${risultati.prezzo.toFixed(2)}</strong>
                </div>
                <div class="valore-riga">
                    <span>Valore stimato:</span>
                    <strong>€${risultati.valoreStimato.toFixed(2)}</strong>
                </div>
                <div class="valore-riga percentuale">
                    <span>Rapporto:</span>
                    <strong>${risultati.percentuale.toFixed(1)}%</strong>
                </div>
            </div>
            
            <div class="dettagli-valutazione">
                <h4>Dettagli</h4>
                <p><strong>Minerale:</strong> ${risultati.minerale}</p>
                <p><strong>Località:</strong> ${risultati.localita}</p>
                <p><strong>Peso:</strong> ${risultati.peso}g</p>
                <p><strong>€/grammo proposto:</strong> €${risultati.prezzogrammo.toFixed(2)}/g</p>
                
                <h4>Database storico (${risultati.datiDB.campioni.length} campioni)</h4>
                ${generaTabellaStorico(risultati.datiDB.medie)}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    container.style.display = 'block';
}

function generaTabellaStorico(medie) {
    let html = '<table class="tabella-storico"><thead><tr><th>Mercato</th><th>€ medio</th><th>€/g medio</th><th>n</th></tr></thead><tbody>';
    
    for (const [mercato, dati] of Object.entries(medie)) {
        html += `
            <tr>
                <td>${mercato.charAt(0).toUpperCase() + mercato.slice(1)}</td>
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
// VISUALIZZAZIONE DATABASE
// ===========================

function mostraDatabase() {
    const container = document.getElementById('databaseView');
    
    if (Object.keys(dbPrezzi).length === 0) {
        container.innerHTML = '<p class="empty-state">Nessun dato nel database. Aggiungi prezzi con Quick Add!</p>';
        return;
    }
    
    let html = '<div class="database-lista">';
    
    for (const [chiave, dati] of Object.entries(dbPrezzi)) {
        const numCampioni = dati.campioni.length;
        const numMercati = Object.keys(dati.medie).length;
        
        // Calcola media generale
        const mediaGenerale = calcolaMediaPonderata(dati.medie, false);
        const mediaPrezzoGrammo = calcolaMediaPonderata(dati.medie, true);
        
        html += `
            <div class="database-card">
                <div class="database-header">
                    <h3>${dati.minerale}</h3>
                    <span class="badge">${dati.localita}</span>
                </div>
                <div class="database-stats">
                    <div class="stat">
                        <span class="stat-label">Campioni</span>
                        <span class="stat-value">${numCampioni}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Mercati</span>
                        <span class="stat-value">${numMercati}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">€ medio</span>
                        <span class="stat-value">€${mediaGenerale.toFixed(2)}</span>
                    </div>
                    ${mediaPrezzoGrammo > 0 ? `
                    <div class="stat">
                        <span class="stat-label">€/g medio</span>
                        <span class="stat-value">€${mediaPrezzoGrammo.toFixed(2)}/g</span>
                    </div>
                    ` : ''}
                </div>
                <button onclick="mostraDettagliMinerale('${chiave}')" class="btn-dettagli">
                    Dettagli →
                </button>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function mostraDettagliMinerale(chiave) {
    const dati = dbPrezzi[chiave];
    if (!dati) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>${dati.minerale} - ${dati.localita}</h2>
            
            <h3>Medie per mercato</h3>
            ${generaTabellaStorico(dati.medie)}
            
            <h3>Tutti i campioni (${dati.campioni.length})</h3>
            <table class="tabella-storico">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Mercato</th>
                        <th>Prezzo</th>
                        <th>Peso</th>
                        <th>€/g</th>
                        <th>Note</th>
                    </tr>
                </thead>
                <tbody>
                    ${dati.campioni.map(c => `
                        <tr>
                            <td>${c.data}</td>
                            <td>${c.mercato}</td>
                            <td>€${c.prezzo.toFixed(2)}</td>
                            <td>${c.peso}g</td>
                            <td>€${c.prezzogrammo.toFixed(2)}/g</td>
                            <td>${c.note || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <button onclick="this.parentElement.parentElement.remove()" class="btn-primary">Chiudi</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===========================
// IMPORT CSV GOOGLE SHEET
// ===========================

function inizializzaImport() {
    const form = document.getElementById('importForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        importaCSV();
    });
}

function importaCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Seleziona un file CSV');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const csv = e.target.result;
        parseCSV(csv);
    };
    reader.readAsText(file);
}

function parseCSV(csv) {
    const righe = csv.split('\n');
    const header = righe[0].split(',').map(h => h.trim());
    
    // Trova indici colonne (formato Google Sheet)
    const indici = {
        minerale: header.indexOf('Minerale'),
        localita: header.indexOf('Provenienza'),
        peso: header.indexOf('Peso (g)'),
        prezzo: header.indexOf('Costo (€)'),
        dimensioni: header.indexOf('Misure (mm)'),
        data: header.indexOf('Data di acquisizione'),
        venditore: header.indexOf('Venditore'),
        link: header.indexOf('Link Cartella'),
        note: header.indexOf('Note')
    };
    
    let importati = 0;
    let saltati = 0;
    
    for (let i = 1; i < righe.length; i++) {
        const riga = righe[i].split(',');
        
        if (riga.length < 5) continue; // riga vuota
        
        const minerale = riga[indici.minerale]?.trim();
        const localita = riga[indici.localita]?.trim();
        const peso = parseFloat(riga[indici.peso]);
        const prezzo = parseFloat(riga[indici.prezzo]);
        
        // Validazione
        if (!minerale || !localita || !peso || peso <= 0 || !prezzo || prezzo <= 0) {
            saltati++;
            continue;
        }
        
        const mineraleNorm = normalizzaMinerale(minerale);
        const chiave = generaChiave(mineraleNorm, localita);
        const prezzogrammo = prezzo / peso;
        
        // Determina mercato dal venditore
        const venditore = riga[indici.venditore]?.toLowerCase() || '';
        let mercato = 'dealer'; // default
        if (venditore.includes('catawiki')) mercato = 'catawiki';
        else if (venditore.includes('ebay')) mercato = 'ebay';
        else if (venditore.includes('etsy')) mercato = 'etsy';
        
        // Crea/aggiorna entry
        if (!dbPrezzi[chiave]) {
            dbPrezzi[chiave] = {
                minerale: mineraleNorm,
                localita: localita,
                tipologiaPrezzo: 'peso',
                campioni: [],
                medie: {}
            };
        }
        
        // Aggiungi campione
        const campione = {
            prezzo: prezzo,
            peso: peso,
            prezzogrammo: prezzogrammo,
            dimensioni: riga[indici.dimensioni]?.trim() || '',
            mercato: mercato,
            data: riga[indici.data]?.trim() || new Date().toISOString().split('T')[0],
            link: riga[indici.link]?.trim() || '',
            note: riga[indici.note]?.trim() || ''
        };
        
        dbPrezzi[chiave].campioni.push(campione);
        importati++;
    }
    
    // Ricalcola medie per tutti
    for (const chiave of Object.keys(dbPrezzi)) {
        dbPrezzi[chiave].medie = calcolaMedie(dbPrezzi[chiave].campioni);
    }
    
    salvaDatabase();
    mostraDatabase();
    
    alert(`✓ Import completato!\n\n${importati} campioni importati\n${saltati} righe saltate`);
    document.getElementById('importForm').reset();
}

// ===========================
// GESTIONE BACKUP
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

function importaBackup() {
    const fileInput = document.getElementById('backupFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Seleziona un file di backup');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            
            if (confirm('Vuoi sovrascrivere il database attuale con il backup?')) {
                dbPrezzi = backup;
                salvaDatabase();
                mostraDatabase();
                alert('✓ Backup ripristinato con successo!');
            }
        } catch (error) {
            alert('Errore nel file di backup: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function resetDatabase() {
    if (confirm('⚠ ATTENZIONE: Vuoi eliminare TUTTI i dati?\n\nQuesta operazione è irreversibile!\n\nTi consiglio di esportare un backup prima.')) {
        if (confirm('Sei assolutamente sicuro? Tutti i prezzi salvati verranno persi.')) {
            dbPrezzi = {};
            localStorage.removeItem('arenaFlegreaPrezzi');
            mostraDatabase();
            alert('Database resettato.');
        }
    }
}

// ===========================
// NAVIGAZIONE TAB
// ===========================

function mostraTab(tabName) {
    // Nascondi tutte le tab
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Rimuovi active da bottoni
    const bottoni = document.querySelectorAll('.tab-button');
    bottoni.forEach(btn => btn.classList.remove('active'));
    
    // Mostra tab selezionata
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Aggiorna database view se necessario
    if (tabName === 'database') {
        mostraDatabase();
    }
}

// ===========================
// INIZIALIZZAZIONE APP
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌋 Arena Flegrea - Inizializzazione...');
    
    // Carica database
    caricaDatabase();
    
    // Inizializza componenti
    inizializzaQuickAdd();
    inizializzaValutatore();
    inizializzaImport();
    
    // Mostra database
    mostraDatabase();
    
    console.log('✓ Sistema pronto');
});

// Esporta funzioni globali per onclick HTML
window.mostraTab = mostraTab;
window.mostraDettagliMinerale = mostraDettagliMinerale;
window.esportaBackup = esportaBackup;
window.importaBackup = importaBackup;
window.resetDatabase = resetDatabase;
