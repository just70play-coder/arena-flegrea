// ========================================
// ARENA FLEGREA - SISTEMA IBRIDO
// ========================================

let aste = [];
let dbPrezzi = {};
let conteggioValutazioni = 0;

// CONFIGURAZIONE
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
    
    // ===== NUOVO: Database Località per Minerale =====
    localitaMinerali: {
        'diaspro': {
            'Madagascar': 1.2,           // Famoso per diaspro rosso
            'Australia': 1.15,           // Mookaite, altre varietà
            'India': 1.1,
            'Brasile': 1.0,
            'USA': 1.05,
            'Egitto': 1.3,               // Diaspro egiziano pregiato
            'Russia': 1.0,
            'Sudafrica': 1.1
        },
        'sanidino': {
            'Monte Nuovo': 1.3,
            'Solfatara': 1.4,
            'Astroni': 1.2,
            'Pisciarelli': 1.5,
            'Eifel (Germania)': 1.2,    // Altra località famosa
            'Vesuvio': 1.1
        },
        'leucite': {
            'Vesuvio': 1.3,
            'Monte Somma': 1.35,
            'Alban Hills': 1.2,
            'Uganda': 0.9,
            'Wyoming (USA)': 0.85
        },
        'hauyne': {
            'Monte Somma': 1.5,
            'Eifel (Germania)': 1.4,
            'Alban Hills': 1.3,
            'Vesuvio': 1.35
        },
        'quarzo': {
            'Arkansas (USA)': 1.2,
            'Brasile': 1.15,
            'Madagascar': 1.1,
            'Alpi': 1.0,
            'Himalaya': 1.25
        }
        // Aggiungi altri minerali...
    },
    
    // Fattore località GENERICO (fallback se minerale non ha località specifica)
    fattoriLocalita: {
        'Monte Nuovo': 1.3,
        'Solfatara': 1.4,
        'Astroni': 1.2,
        'Pisciarelli': 1.5,
        'Monte Somma': 1.15,
        'Vesuvio': 1.1,
        'Campi Flegrei (generico)': 1.0,
        'Madagascar': 1.0,              // Default neutro
        'Brasile': 1.0,
        'India': 0.95,
        'Cina': 0.85,
        'Marocco': 1.0,
        'USA': 0.95,
        'Altra località': 0.9           // Località sconosciute
    },
    
    rangeIntegrita: {
        'Perfetta (100%)': 1.0,
        'Eccellente (90-99%)': 0.95,
        'Molto buona (80-89%)': 0.88,
        'Buona (70-79%)': 0.80,
        'Discreta (60-69%)': 0.70,
        'Sufficiente (50-59%)': 0.62,
        'Parziale (40-49%)': 0.55
    }
};

// ========================================
// INIZIALIZZAZIONE
// ========================================

window.addEventListener('load', function() {
    caricaTuttiDati();
    aggiornaDashboard();
    mostraDatabasePrezzi();
    mostraAste();
    inizializzaValutatore();
    aggiornaStatisticheStorage();
    
    const d = new Date().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
    });
    document.getElementById('ultimo-aggiornamento').textContent = d;
    
    // Data odierna in Quick Add
    const oggi = new Date().toISOString().split('T')[0];
    document.getElementById('qa-catawiki-data').value = oggi;
    document.getElementById('qa-ebay-data').value = oggi;
    document.getElementById('qa-etsy-data').value = oggi;
    document.getElementById('qa-heritage-data').value = oggi;
    document.getElementById('qa-dealer-data').value = oggi;
    
    // Range sliders live
    document.querySelectorAll('#form-valutatore input[type="range"]').forEach(r => {
        r.addEventListener('input', () => {
            if (r.nextElementSibling && r.nextElementSibling.tagName === 'OUTPUT') {
                r.nextElementSibling.textContent = r.value;
            }
        });
    });
});

// ========================================
// NAVIGAZIONE
// ========================================

function mostraSezione(id) {
    document.querySelectorAll('.sezione').forEach(s => s.classList.remove('attiva'));
    document.getElementById(id).classList.add('attiva');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event?.target?.classList.add('active') || document.querySelector(`[onclick="mostraSezione('${id}')"]`)?.classList.add('active');
}

// ========================================
// QUICK ADD - TABS
// ========================================

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const m = this.dataset.mercato;
        document.querySelectorAll('.mercato-form').forEach(f => f.classList.remove('active'));
        document.getElementById('form-' + m).classList.add('active');
    });
});

// Località custom
document.getElementById('qa-localita').addEventListener('change', function() {
    const custom = document.getElementById('qa-localita-custom');
    custom.style.display = (this.value === 'Altra') ? 'block' : 'none';
    if (this.value !== 'Altra') custom.value = '';
});

// ========================================
// QUICK ADD - SALVATAGGIO
// ========================================

document.getElementById('form-quick-add').addEventListener('submit', function(e) {
    e.preventDefault();
    
    let minerale = document.getElementById('qa-minerale').value.trim();
    if (!minerale) return;
    
    let localita = document.getElementById('qa-localita').value;
    if (localita === 'Altra') {
        localita = document.getElementById('qa-localita-custom').value.trim() || 'Altra località';
    }
    
    const keyMinerale = minerale.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const keyLocalita = localita.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
    const chiave = keyMinerale + '_' + keyLocalita;
    
    if (!dbPrezzi[chiave]) {
        dbPrezzi[chiave] = {
            minerale: minerale,
            localita: localita,
            campioni: [],
            medie: {},
            ultimoAggiornamento: null
        };
    }
    
    const nuovo = {
        data: new Date().toISOString(),
        prezzi: {}
    };
    
    const mercati = [
        ['catawiki', 'qa-catawiki-prezzo', 'qa-catawiki-link', 'qa-catawiki-note', 'qa-catawiki-data'],
        ['ebay', 'qa-ebay-prezzo', 'qa-ebay-link', 'qa-ebay-note', 'qa-ebay-data'],
        ['etsy', 'qa-etsy-prezzo', 'qa-etsy-link', 'qa-etsy-note', 'qa-etsy-data'],
        ['heritage', 'qa-heritage-prezzo', 'qa-heritage-link', 'qa-heritage-note', 'qa-heritage-data'],
        ['dealer', 'qa-dealer-prezzo', 'qa-dealer-link', 'qa-dealer-note', 'qa-dealer-data']
    ];
    
    mercati.forEach(([m, pId, lId, nId, dId]) => {
        const v = parseFloat(document.getElementById(pId)?.value);
        if (!isNaN(v) && v > 0) {
            nuovo.prezzi[m] = {
                prezzo: v,
                link: document.getElementById(lId)?.value || null,
                note: document.getElementById(nId)?.value || null,
                data: document.getElementById(dId)?.value || null
            };
        }
    });
    
    if (Object.keys(nuovo.prezzi).length > 0) {
        dbPrezzi[chiave].campioni.push(nuovo);
        dbPrezzi[chiave].medie = calcolaMedie(dbPrezzi[chiave].campioni);
        dbPrezzi[chiave].ultimoAggiornamento = new Date().toISOString();
        
        salvaDBPrezzi();
        mostraDatabasePrezzi();
        aggiornaDashboard();
        aggiornaStatisticheStorage();
        
        mostraNotifica('✅ Prezzo salvato nel Database!', 'success');
        
        // Reset solo prezzi, tiene minerale+località
        ['catawiki','ebay','etsy','heritage','dealer'].forEach(m => {
            document.getElementById(`qa-${m}-prezzo`).value = '';
            const l = document.getElementById(`qa-${m}-link`); if (l) l.value = '';
            const n = document.getElementById(`qa-${m}-note`); if (n) n.value = '';
        });
    } else {
        mostraNotifica('⚠️ Inserisci almeno un prezzo', 'error');
    }
});

// ========================================
// CALCOLO MEDIE
// ========================================

function calcolaMedie(campioni) {
    const medie = {};
    ['catawiki','ebay','etsy','heritage','dealer'].forEach(m => {
        const arr = campioni.map(c => c.prezzi[m]?.prezzo).filter(x => x > 0);
        if (arr.length > 0) {
            const sum = arr.reduce((a,b)=>a+b,0);
            medie[m] = {
                media: sum/arr.length,
                min: Math.min(...arr),
                max: Math.max(...arr),
                n: arr.length
            };
        }
    });
    return medie;
}

// ========================================
// DATABASE PREZZI
// ========================================

function mostraDatabasePrezzi() {
    const el = document.getElementById('database-list');
    const vuoto = document.getElementById('no-database');
    const q = (document.getElementById('db-search')?.value || '').toLowerCase();
    
    const keys = Object.keys(dbPrezzi).sort();
    
    const filtrati = keys.filter(k => {
        const d = dbPrezzi[k];
        return !q || d.minerale.toLowerCase().includes(q) || d.localita.toLowerCase().includes(q);
    });
    
    if (filtrati.length === 0) {
        el.innerHTML = '';
        vuoto.style.display = 'block';
        return;
    }
    
    vuoto.style.display = 'none';
    
    el.innerHTML = filtrati.map(k => {
        const d = dbPrezzi[k];
        const m = d.medie || {};
        const upd = d.ultimoAggiornamento ? new Date(d.ultimoAggiornamento).toLocaleDateString('it-IT') : '—';
        
        let medHtml = '';
        Object.entries(m).forEach(([merc, s]) => {
            medHtml += `
                <div class="media-item">
                    <div class="mercato">${merc}</div>
                    <div class="prezzo">€${s.media.toFixed(2)}</div>
                    <small>${s.n} · ${s.min.toFixed(0)}–${s.max.toFixed(0)}</small>
                </div>
            `;
        });
        
        return `
            <div class="db-card" data-key="${k}">
                <div class="db-card-header">
                    <div class="db-title">
                        <h4>${d.minerale} – ${d.localita}</h4>
                        <small>Ultimo aggiornamento: ${upd} • ${d.campioni.length} rilevazioni</small>
                    </div>
                    <div class="db-actions">
                        <button class="btn-icon" title="Usa nel Valutatore" onclick="usaPrezziDatabase('${k}')">🎯</button>
                        <button class="btn-icon" title="Elimina" onclick="eliminaVoceDB('${k}')">🗑️</button>
                    </div>
                </div>
                <div class="medie-grid">${medHtml}</div>
                <button class="btn-usa-db" onclick="usaPrezziDatabase('${k}')">🎯 Usa nel Valutatore</button>
            </div>
        `;
    }).join('');
}

document.getElementById('db-search')?.addEventListener('input', mostraDatabasePrezzi);

function usaPrezziDatabase(k) {
    const d = dbPrezzi[k];
    const m = d.medie || {};
    
    mostraSezione('valutatore');
    
    setTimeout(() => {
        document.getElementById('val-catawiki').value = m.catawiki ? m.catawiki.media.toFixed(2) : '';
        document.getElementById('val-ebay').value = m.ebay ? m.ebay.media.toFixed(2) : '';
        document.getElementById('val-etsy').value = m.etsy ? m.etsy.media.toFixed(2) : '';
        document.getElementById('val-heritage').value = m.heritage ? m.heritage.media.toFixed(2) : '';
        document.getElementById('val-dealer').value = m.dealer ? m.dealer.media.toFixed(2) : '';
        
        mostraNotifica(`✅ ${d.minerale} caricato nel valutatore`, 'success');
    }, 60);
}

function eliminaVoceDB(k) {
    if (confirm('Eliminare TUTTI i prezzi di questa voce dal database?')) {
        delete dbPrezzi[k];
        salvaDBPrezzi();
        mostraDatabasePrezzi();
        aggiornaDashboard();
        aggiornaStatisticheStorage();
        mostraNotifica('🗑️ Voce eliminata', 'info');
    }
}

// ========================================
// ESPORTA/IMPORTA DB
// ========================================

function esportaDatabase() {
    const blob = new Blob([JSON.stringify(dbPrezzi, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arena-flegrea-database-prezzi_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    mostraNotifica('📥 Database esportato', 'success');
}

document.getElementById('import-file').addEventListener('change', function(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
        try {
            const obj = JSON.parse(ev.target.result);
            if (obj && typeof obj === 'object') {
                dbPrezzi = obj;
                salvaDBPrezzi();
                mostraDatabasePrezzi();
                aggiornaDashboard();
                aggiornaStatisticheStorage();
                mostraNotifica('📤 Database importato con successo!', 'success');
            } else throw new Error();
        } catch (err) {
            alert('File JSON non valido');
        }
        e.target.value = '';
    };
    r.readAsText(f);
});

// ========================================
// VALUTATORE
// ========================================

function inizializzaValutatore() {
    const sl = document.getElementById('val-localita');
    if (sl && sl.options.length <= 0) {
        Object.keys(CONFIG.fattoriLocalita).forEach(loc => {
            const o = document.createElement('option');
            o.value = loc;
            o.textContent = loc + ' (×' + CONFIG.fattoriLocalita[loc] + ')';
            sl.appendChild(o);
        });
    }
    const si = document.getElementById('val-integrita');
    if (si && si.options.length <= 0) {
        Object.keys(CONFIG.rangeIntegrita).forEach(intg => {
            const o = document.createElement('option');
            o.value = intg;
            o.textContent = intg + ' (×' + CONFIG.rangeIntegrita[intg] + ')';
            si.appendChild(o);
        });
    }
}

function caricaDaDatabase() {
    mostraSezione('database-prezzi');
    mostraNotifica('📂 Seleziona una voce → "Usa nel Valutatore"', 'info');
}

function resetValutatore() {
    document.getElementById('form-valutatore').reset();
    document.querySelectorAll('#form-valutatore output').forEach(o => o.textContent = '5');
    document.getElementById('risultato-valutazione').innerHTML = '';
}

document.getElementById('form-valutatore').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const dati = {
        mercati: {
            catawiki: parseFloat(document.getElementById('val-catawiki').value)||0,
            ebay: parseFloat(document.getElementById('val-ebay').value)||0,
            etsy: parseFloat(document.getElementById('val-etsy').value)||0,
            heritage: parseFloat(document.getElementById('val-heritage').value)||0,
            dealer: parseFloat(document.getElementById('val-dealer').value)||0
        },
        qualita: {
            cristallinita: +document.getElementById('val-cristallinita').value,
            estetica: +document.getElementById('val-estetica').value,
            rarita: +document.getElementById('val-rarita').value,
            dimensioni: +document.getElementById('val-dimensioni').value,
            integrita: +document.getElementById('val-integrita-score').value,
            trasparenza: +document.getElementById('val-trasparenza').value
        },
        localita: document.getElementById('val-localita').value,
        integrita: document.getElementById('val-integrita').value
    };
    
    const r = calcolaValoreStimato(dati);
    const pr = parseFloat(document.getElementById('val-prezzo-richiesto').value)||0;
    const cns = generaConsiglio(pr, r.valoreStimato);
    
    mostraRisultato(r, pr, cns);
    
    conteggioValutazioni++;
    localStorage.setItem('arena-flegrea-val-count', conteggioValutazioni.toString());
    aggiornaDashboard();
});

function calcolaValoreStimato(d) {
    let vm = 0;
    if (d.mercati.catawiki>0) vm += d.mercati.catawiki * CONFIG.pesiMercato.catawiki;
    if (d.mercati.ebay>0) vm += d.mercati.ebay * CONFIG.pesiMercato.ebay;
    if (d.mercati.etsy>0) vm += (d.mercati.etsy * CONFIG.fattoreCorrezioneEtsy) * CONFIG.pesiMercato.etsy;
    if (d.mercati.heritage>0) vm += d.mercati.heritage * CONFIG.pesiMercato.heritage;
    if (d.mercati.dealer>0) vm += d.mercati.dealer * CONFIG.pesiMercato.dealer;
    
    const attivi = Object.keys(CONFIG.pesiMercato).filter(k=>d.mercati[k]>0).reduce((s,k)=>s+CONFIG.pesiMercato[k],0);
    if (attivi>0) vm = vm/attivi;
    
    let sq = 0;
    sq += (d.qualita.cristallinita||5)*CONFIG.criteriQualita.cristallinita;
    sq += (d.qualita.estetica||5)*CONFIG.criteriQualita.estetica;
    sq += (d.qualita.rarita||5)*CONFIG.criteriQualita.rarita;
    sq += (d.qualita.dimensioni||5)*CONFIG.criteriQualita.dimensioni;
    sq += (d.qualita.integrita||5)*CONFIG.criteriQualita.integrita;
    sq += (d.qualita.trasparenza||5)*CONFIG.criteriQualita.trasparenza;
    
    const fl = CONFIG.fattoriLocalita[d.localita] || 0.85;
    const fi = CONFIG.rangeIntegrita[d.integrita] || 0.62;
    
    const vs = vm * (sq/10) * fl * fi;
    
    return {valoreStimato:vs, valoreMercati:vm, scoreQualita:sq, fattoreLocalita:fl, fattoreIntegrita:fi};
}

function generaConsiglio(pr, vs) {
    if (vs <= 0) return {azione:'INSERISCI DATI', colore:'#9e9e9e', icona:'ℹ️', testo:'Mancano prezzi di mercato', pct:0};
    const pct = (pr/vs)*100;
    if (pct <= 60) return {azione:'ACQUISTO ECCELLENTE', colore:'#00c853', icona:'🎯', testo:'Affare molto interessante', pct};
    if (pct <= 80) return {azione:'BUON ACQUISTO', colore:'#64dd17', icona:'✅', testo:'Opportunità vantaggiosa', pct};
    if (pct <= 100) return {azione:'PREZZO CORRETTO', colore:'#ffd600', icona:'👍', testo:'In linea con valore stimato', pct};
    if (pct <= 120) return {azione:'SOPRAVVALUTATO', colore:'#ff6f00', icona:'⚠️', testo:'Prezzo sopra valore stimato', pct};
    return {azione:'SCONSIGLIATO', colore:'#d50000', icona:'❌', testo:'Eccessivamente caro rispetto al mercato', pct};
}

function mostraRisultato(r, pr, c) {
    const box = document.getElementById('risultato-valutazione');
    const diff = (pr - r.valoreStimato);
    
    box.innerHTML = `
        <div class="risultato-box">
            <div class="valore-principale">
                <h3>💎 VALORE STIMATO</h3>
                <div class="prezzo-grande">€${r.valoreStimato.toFixed(2)}</div>
            </div>
            
            <div class="consiglio-box" style="background:${c.colore}15; border-left:5px solid ${c.colore}">
                <div class="consiglio-icona">${c.icona}</div>
                <div class="consiglio-testo">
                    <h3 style="color:${c.colore}">${c.azione}</h3>
                    <p>${c.testo}</p>
                    <p style="font-weight:700; margin-top:.4rem">Prezzo richiesto = <strong>${c.pct.toFixed(0)}%</strong> del valore stimato</p>
                </div>
            </div>
            
            <div class="confronto-prezzi">
                <div class="prezzo-item">
                    <span>Prezzo Richiesto</span>
                    <strong style="color:#c62828">€${pr.toFixed(2)}</strong>
                </div>
                <div class="prezzo-item">
                    <span>Valore Stimato</span>
                    <strong style="color:#2e7d32">€${r.valoreStimato.toFixed(2)}</strong>
                </div>
                <div class="prezzo-item">
                    <span>Differenza</span>
                    <strong style="color:${diff>=0?'#c62828':'#2e7d32'}">${diff>=0?'+':''}€${diff.toFixed(2)}</strong>
                </div>
                <div class="prezzo-item">
                    <span>Score Qualità</span>
                    <strong>${r.scoreQualita.toFixed(2)}/10</strong>
                </div>
            </div>
            
            <div class="breakdown">
                <h4>📊 Breakdown Calcolo</h4>
                <div class="breakdown-item">
                    <span>Media Ponderata Mercati</span>
                    <strong>€${r.valoreMercati.toFixed(2)}</strong>
                </div>
                <div class="breakdown-item">
                    <span>× Score Qualità / 10</span>
                    <strong>× ${(r.scoreQualita/10).toFixed(3)}</strong>
                </div>
                <div class="breakdown-item">
                    <span>× Fattore Località</span>
                    <strong>× ${r.fattoreLocalita}</strong>
                </div>
                <div class="breakdown-item">
                    <span>× Fattore Integrità</span>
                    <strong>× ${r.fattoreIntegrita}</strong>
                </div>
                <div class="formula-finale">
                    <strong>Formula:</strong> €${r.valoreMercati.toFixed(2)} × ${(r.scoreQualita/10).toFixed(2)} × ${r.fattoreLocalita} × ${r.fattoreIntegrita} = <strong style="color:#667eea">€${r.valoreStimato.toFixed(2)}</strong>
                </div>
            </div>
            
            <div class="azioni-risultato">
                <button class="btn-copia" onclick="copiaRisultatoValutazione()">📋 Copia Risultato</button>
                <button class="btn-reset-val" onclick="resetValutatore()">🔄 Nuova</button>
            </div>
        </div>
    `;
    
    box.scrollIntoView({behavior:'smooth', block:'start'});
}

function copiaRisultatoValutazione() {
    const pr = parseFloat(document.getElementById('val-prezzo-richiesto').value)||0;
    const txt = `ARENA FLEGREA - Valutazione
Valore stimato: €${document.querySelector('.prezzo-grande')?.textContent.replace('€','') || '0,00'}
Prezzo richiesto: €${pr.toFixed(2)}
Rapporto: ${document.querySelector('.consiglio-testo strong')?.textContent || ''}
Consiglio: ${document.querySelector('.consiglio-testo h3')?.textContent || ''}`;
    navigator.clipboard.writeText(txt).then(()=>mostraNotifica('📋 Copiato negli appunti','success'));
}

// ========================================
// ASTE
// ========================================

function mostraFormAsta() {
    document.getElementById('form-nuova-asta-container').style.display='block';
}

function nascondiFormAsta() {
    document.getElementById('form-nuova-asta-container').style.display='none';
    document.getElementById('form-asta').reset();
}

document.getElementById('form-asta').addEventListener('submit', function(e){
    e.preventDefault();
    const a = {
        id: Date.now(),
        minerale: document.getElementById('asta-minerale').value,
        localita: document.getElementById('asta-localita').value,
        prezzoBase: parseFloat(document.getElementById('asta-prezzo-base').value)||0,
        prezzoFinale: parseFloat(document.getElementById('asta-prezzo-finale').value)||0,
        stato: document.getElementById('asta-stato').value,
        data: document.getElementById('asta-data').value,
        link: document.getElementById('asta-link').value,
        note: document.getElementById('asta-note').value,
        ts: new Date().toISOString()
    };
    aste.push(a);
    salvaAste();
    this.reset();
    nascondiFormAsta();
    mostraAste();
    aggiornaDashboard();
    mostraNotifica('✅ Asta salvata','success');
});

function mostraAste() {
    const c = document.getElementById('lista-aste');
    const f = document.getElementById('aste-filter').value;
    const s = (document.getElementById('aste-search').value||'').toLowerCase();
    
    const list = aste.filter(x => {
        const m1 = f==='tutte'||x.stato===f;
        const m2 = !s || x.minerale.toLowerCase().includes(s) || x.localita.toLowerCase().includes(s);
        return m1&&m2;
    }).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
    
    if (list.length===0){
        c.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:2rem;">Nessuna asta trovata</p>';
        return;
    }
    
    c.innerHTML = list.map(x => `
        <div class="asta-card">
            <h3>${x.minerale}</h3>
            <p>📍 ${x.localita}</p>
            <div class="asta-prezzo">€${(x.prezzoFinale||x.prezzoBase||0).toFixed(2)}</div>
            <span class="badge ${x.stato}">${x.stato.toUpperCase()}</span>
            ${x.data ? `<div class="asta-meta">📅 ${new Date(x.data).toLocaleDateString('it-IT')}</div>` : ''}
            ${x.note ? `<div class="asta-note">📝 ${x.note}</div>` : ''}
            ${x.link ? `<a href="${x.link}" target="_blank" class="link-asta">🔗 Vedi su Catawiki</a>` : ''}
            <button class="asta-del" onclick="eliminaAsta(${x.id})" title="Elimina">🗑️</button>
        </div>
    `).join('');
}

function eliminaAsta(id){
    if (confirm('Eliminare questa asta?')){
        aste = aste.filter(x=>x.id!==id);
        salvaAste();
        mostraAste();
        aggiornaDashboard();
        mostraNotifica('🗑️ Asta eliminata','info');
    }
}

document.getElementById('aste-filter')?.addEventListener('change', mostraAste);
document.getElementById('aste-search')?.addEventListener('input', mostraAste);

// ========================================
// DASHBOARD & STORAGE
// ========================================

function caricaTuttiDati(){
    const d1 = localStorage.getItem('arena-flegrea-prezzi-db');
    if (d1) dbPrezzi = JSON.parse(d1);
    const d2 = localStorage.getItem('arena-flegrea-aste');
    if (d2) aste = JSON.parse(d2);
    const d3 = localStorage.getItem('arena-flegrea-val-count');
    if (d3) conteggioValutazioni = parseInt(d3)||0;
}

function salvaDBPrezzi(){ localStorage.setItem('arena-flegrea-prezzi-db', JSON.stringify(dbPrezzi)); }
function salvaAste(){ localStorage.setItem('arena-flegrea-aste', JSON.stringify(aste)); }

function aggiornaDashboard(){
    const keys = Object.keys(dbPrezzi);
    let totCampioni = 0;
    keys.forEach(k=> totCampioni += (dbPrezzi[k].campioni||[]).length);
    
    const v = aste.filter(a=>a.stato==='venduta').length;
    const i = aste.filter(a=>a.stato==='invenduta').length;
    const ac= aste.filter(a=>a.stato==='attiva').length;
    
    document.getElementById('stat-minerali').textContent = keys.length;
    document.getElementById('stat-prezzi').textContent = totCampioni;
    document.getElementById('stat-aste').textContent = aste.length;
    document.getElementById('stat-valutazioni').textContent = conteggioValutazioni;
}

function aggiornaStatisticheStorage(){
    function kb(k){ const s = localStorage.getItem(k)||''; return (new Blob([s]).size/1024).toFixed(1)+' KB'; }
    document.getElementById('stat-db-size').textContent = kb('arena-flegrea-prezzi-db');
    document.getElementById('stat-aste-size').textContent = kb('arena-flegrea-aste');
    document.getElementById('stat-val-size').textContent = kb('arena-flegrea-val-count');
}

// ========================================
// IMPOSTAZIONI
// ========================================

function backupCompleto(){
    const b = {
        versione: '1.0.0',
        data: new Date().toISOString(),
        dbPrezzi,
        aste,
        conteggioValutazioni
    };
    const blob = new Blob([JSON.stringify(b,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arena-flegrea-backup-completo_'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    URL.revokeObjectURL(url);
    mostraNotifica('💾 Backup completo esportato','success');
}

function ripristinaBackup(){
    const inp = document.createElement('input');
    inp.type='file';
    inp.accept='.json';
    inp.onchange = e => {
        const f = e.target.files[0];
        if(!f) return;
        const r = new FileReader();
        r.onload = ev => {
            try {
                const obj = JSON.parse(ev.target.result);
                if (obj.dbPrezzi) dbPrezzi = obj.dbPrezzi;
                if (obj.aste) aste = obj.aste;
                if (typeof obj.conteggioValutazioni === 'number') conteggioValutazioni = obj.conteggioValutazioni;
                salvaDBPrezzi(); salvaAste();
                localStorage.setItem('arena-flegrea-val-count', conteggioValutazioni.toString());
                mostraDatabasePrezzi(); mostraAste(); aggiornaDashboard(); aggiornaStatisticheStorage();
                mostraNotifica('📤 Backup ripristinato con successo!','success');
            } catch(err){ alert('File backup non valido'); }
        };
        r.readAsText(f);
    };
    inp.click();
}

function resetTutto(){
    if (confirm('⚠️ ATTENZIONE: Vuoi ELIMINARE TUTTI i dati?\n\n- Database Prezzi\n- Registro Aste\n- Conteggio Valutazioni\n\nQuesta azione è IRREVERSIBILE')) {
        if (confirm('Confermi davvero?')) {
            localStorage.removeItem('arena-flegrea-prezzi-db');
            localStorage.removeItem('arena-flegrea-aste');
            localStorage.removeItem('arena-flegrea-val-count');
            dbPrezzi={}; aste=[]; conteggioValutazioni=0;
            mostraDatabasePrezzi(); mostraAste(); aggiornaDashboard(); aggiornaStatisticheStorage();
            document.getElementById('risultato-valutazione').innerHTML='';
            mostraNotifica('🗑️ Tutti i dati eliminati','info');
        }
    }
}

// ========================================
// NOTIFICHE
// ========================================

function mostraNotifica(msg, tipo='info'){
    const n = document.createElement('div');
    n.className = 'notifica notifica-'+tipo;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(()=>{
        n.style.animation='slideOutRight .25s';
        setTimeout(()=>n.remove(),250);
    },2200);
}
