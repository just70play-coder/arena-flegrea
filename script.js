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
    
    localitaMinerali: {
        'diaspro rosso': {
            'Madagascar': 1.2,
            'Egitto': 1.3,
            'Australia': 1.15,
            'Brasile': 1.0
        },
        'sanidino': {
            'Monte Nuovo': 1.4,
            'Solfatara': 1.5,
            'Pisciarelli': 1.6,
            'Vesuvio': 1.2
        },
        'quarzo': {
            'Brasile': 1.15,
            'Madagascar': 1.1,
            'Alpi': 1.25
        }
    },
    
    fattoriLocalita: {
        'Monte Nuovo': 1.4,
        'Solfatara': 1.5,
        'Madagascar': 1.1,
        'Brasile': 1.0,
        'altra località': 0.85
    }
};

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
}

function salvaDatabase() {
    try {
        localStorage.setItem('arenaFlegreaPrezzi', JSON.stringify(dbPrezzi));
        aggiornaStatistiche();
    } catch (e) {
        alert('Errore salvataggio database');
    }
}

// ===========================
// UTILITY
// ===========================

function normalizzaMinerale(input) {
 const inputLower = input.toLowerCase().trim()
  .replace(/[\/\\'"]/g, '') // Rimuove caratteri speciali
  .replace(/\s+/g, ' ');    // Normalizza spazi
 
 // Cerca corrispondenza esatta o parziale
 for (const [standard, aliases] of Object.entries(ALIAS_MINERALI)) {
  if (inputLower === standard) return standard;
  
  for (const alias of aliases) {
   if (inputLower === alias || inputLower.includes(alias)) {
    return standard;
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

function getFattoreLocalita(minerale, localita) {
    const mineraleNorm = normalizzaMinerale(minerale);
    const localitaMineraleDB = CONFIG.localitaMinerali[mineraleNorm];
    
    if (localitaMineraleDB && localitaMineraleDB[localita]) {
        return localitaMineraleDB[localita];
    }
    
    return CONFIG.fattoriLocalita[localita] || CONFIG.fattoriLocalita['altra località'];
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
        const localita = sanitizzaLocalita(document.getElementById('qa-localita').value);
        const peso = parseFloat(pesoInput.value);
        const prezzo = parseFloat(prezzoInput.value);
        const mercato = document.getElementById('qa-mercato').value;
        
        if (!minerale || !localita || peso <= 0 || prezzo <= 0) {
            alert('Compila tutti i campi obbligatori!');
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
    });
}

function resetQuickAdd() {
    document.getElementById('form-quick-add').reset();
    document.getElementById('qa-eurogrammo').textContent = '0.00';
    document.getElementById('qa-data').valueAsDate = new Date();
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
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const minerale = document.getElementById('val-minerale').value.trim();
        const localita = document.getElementById('val-localita').value.trim();
        const peso = parseFloat(pesoInput.value);
        const prezzo = parseFloat(prezzoInput.value);
        
        if (!minerale || !localita || peso <= 0 || prezzo <= 0) {
            alert('Compila tutti i campi!');
            return;
        }
        
        const mineraleNorm = normalizzaMinerale(minerale);
        const chiave = generaChiave(mineraleNorm, localita);
        const datiDB = dbPrezzi[chiave];
        
        if (!datiDB || Object.keys(datiDB.medie).length === 0) {
            alert(`⚠ Nessun dato per ${mineraleNorm} - ${localita}\n\nAggiungi prima dei prezzi nel Quick Add!`);
            return;
        }
        
        const valoreStimato = calcolaValoreStimato(mineraleNorm, localita, peso, datiDB);
        const percentuale = (prezzo / valoreStimato) * 100;
        const raccomandazione = generaRaccomandazione(percentuale);
        
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
    });
}

function calcolaValoreStimato(minerale, localita, peso, datiDB) {
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
    const fattoreQualita = 0.5; // default 5/10
    const fattoreIntegrita = 0.95;
    
    return mediaPonderata * fattoreLocalita * fattoreQualita * fattoreIntegrita;
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
        return;
    }
    
    let html = '<div class="database-lista">';
    
    for (const [chiave, dati] of Object.entries(dbPrezzi)) {
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
                        <div class="stat-label">Campioni</div>
                        <div class="stat-value">${dati.campioni.length}</div>
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
                    Vedi Dettagli →
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
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>${dati.minerale} - ${dati.localita}</h2>
            
            <h3>Medie per mercato</h3>
            ${generaTabellaStorico(dati.medie)}
            
            <h3>📦 Campioni registrati (${dati.campioni.length})</h3>
<div class="campioni-lista">
 ${dati.campioni.map((c, idx) => `
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
 `).join('')}
</div>
            
            <button onclick="this.parentElement.parentElement.remove()" class="btn-primary" style="margin-top:20px;">Chiudi</button>
        </div>
    `;
    
    document.body.appendChild(modal);
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
 const nuovaLocalita = sanitizzaLocalita(nuovaLocalitaRaw);
 const nuovaChiave = generaChiave(nuovoMinerale, nuovaLocalita);
 
 // Aggiorna i dati specifici del campione
 campione.prezzo = prezzoNum;
 campione.peso = pesoNum;
 campione.prezzogrammo = prezzoNum / pesoNum;
 campione.note = nuoveNote;
 
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
  document.querySelector('.modal').remove();
  mostraDatabase();
  return;
 }
 
 // Altrimenti ricalcola medie
 dati.medie = calcolaMedie(dati.campioni);
 salvaDatabase();
 
 alert('✅ Campione eliminato!');
 
 // Ricarica modal
 document.querySelector('.modal').remove();
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