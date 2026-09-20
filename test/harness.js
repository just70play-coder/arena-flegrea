// ===========================
// ARENA FLEGREA — HARNESS DI TEST (jsdom)
// Carica index.html + script.js reali, espone le funzioni interne e fornisce
// un mini-runner. Usato da test-*.js. Non modificare script.js per i test:
// l'esportazione avviene qui, in coda al sorgente eval'd.
// ===========================

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP_DIR = process.env.ARENA_DIR || path.resolve(__dirname, '..');
const DEMO_PATH = path.join(APP_DIR, 'dati-demo.json');

// Funzioni interne rese visibili ai test (in coda al sorgente eval'd)
const SONDA = `
window.__app = {
    get CONFIG() { return CONFIG; },
    get dbPrezzi() { return dbPrezzi; },
    set dbPrezzi(v) { dbPrezzi = v; },
    get filtriAttivi() { return filtriAttivi; },
    set filtriAttivi(v) { Object.assign(filtriAttivi, v); },
    get ALIAS_MINERALI() { return ALIAS_MINERALI; },
    get LOCALITA_CANONICHE() { return LOCALITA_CANONICHE; },
    get INDICE_LOCALITA() { return INDICE_LOCALITA; },
    caricaDatabase: caricaDatabase,
    salvaDatabase: salvaDatabase,
    aggiornaDatalist: aggiornaDatalist,
    normalizzaMinerale: normalizzaMinerale,
    sanitizzaLocalita: sanitizzaLocalita,
    normalizzaLocalita: normalizzaLocalita,
    localitaCanonica: localitaCanonica,
    estraiMineraleDominante: estraiMineraleDominante,
    getFattoreLocalita: getFattoreLocalita,
    generaChiave: generaChiave,
    calcolaMedie: calcolaMedie,
    calcolaStatisticheAvanzate: calcolaStatisticheAvanzate,
    calcolaDistribuzioneMercati: calcolaDistribuzioneMercati,
    calcolaTrendTemporale: calcolaTrendTemporale,
    calcolaMediaPonderata: calcolaMediaPonderata,
    toggleLocalitaSconosciuta: toggleLocalitaSconosciuta,
    resetStatoSconosciuta: resetStatoSconosciuta,
    trovaDatiGruppo: trovaDatiGruppo,
    trovaDatiLocalitaSconosciuta: trovaDatiLocalitaSconosciuta,
    calcolaValoreStimato: calcolaValoreStimato,
    calcolaScore: calcolaScore,
    fattoreDaIntegrita: fattoreDaIntegrita,
    leggiVotiScoring: leggiVotiScoring,
    aggiornaPannelloScoring: aggiornaPannelloScoring,
    resetScoring: resetScoring,
    generaScomposizione: generaScomposizione,
    generaBloccoScomposizione: generaBloccoScomposizione,
    generaRaccomandazione: generaRaccomandazione,
    mostraDatabase: mostraDatabase,
    // v0.2.8: scala
    canonicalizzaDatabase: canonicalizzaDatabase,
    parseMineraliSecondari: parseMineraliSecondari,
    generaBarraPaginazione: generaBarraPaginazione,
    disegnaPaginaDatabase: disegnaPaginaDatabase,
    disegnaListaCampioni: disegnaListaCampioni,
    vaiAPagina: vaiAPagina,
    cambiaGruppiPerPage: cambiaGruppiPerPage,
    generaCardCampione: generaCardCampione,
    disegnaListaCheckbox: disegnaListaCheckbox,
    escapeHtml: escapeHtml,
    popolaFiltri: popolaFiltri,
    ricostruisciListaCheckbox: ricostruisciListaCheckbox,
    toggleTutti: toggleTutti,
    cercaNelPopover: cercaNelPopover,
    aggiornaSelectAll: aggiornaSelectAll,
    aggiornaStatoFiltri: aggiornaStatoFiltri,
    gruppoSuperaFiltri: gruppoSuperaFiltri,
    campioneSuperaFiltri: campioneSuperaFiltri,
    applicaFiltri: applicaFiltri,
    aggiornaUIFiltri: aggiornaUIFiltri,
    rimuoviTuttiFiltri: rimuoviTuttiFiltri,
    impostaPeriodo: impostaPeriodo,
    aggiornaContatoreRisultati: aggiornaContatoreRisultati,
    filtraDatabase: filtraDatabase,
    mostraDettagliMinerale: mostraDettagliMinerale,
    modificaCampione: modificaCampione,
    eliminaCampione: eliminaCampione,
};
`;

/**
 * Avvia l'app in jsdom.
 * @param {object} opts
 * @param {boolean} opts.silenzia   nasconde i console.log dell'app
 * @param {object}  opts.database   oggetto db da precaricare in localStorage
 * @param {boolean} opts.fileDemo   precarica dati-demo.json reale
 * @param {string[]} opts.extra     nomi extra da esporre su window.__app
 */
function caricaApp(opts = {}) {
    const { silenzia = true, database = null, fileDemo = false, extra = [] } = opts;

    const html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
    let script = fs.readFileSync(path.join(APP_DIR, 'script.js'), 'utf8');
    if (extra.length) {
        script += `\nObject.assign(window.__app, { ${extra.join(', ')} });\n`;
    }

    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
    const w = dom.window;

    if (silenzia) {
        w.console.log = () => {};
        w.console.warn = () => {};
    }

    // jsdom non implementa alert/confirm/prompt: li sostituiamo con stub che registrano
    // il messaggio, così i test possono anche verificare il testo mostrato all'utente.
    const dialoghi = { alert: [], confirm: [], prompt: [] };
    w.alert = (msg) => dialoghi.alert.push(String(msg));
    w.confirm = (msg) => { dialoghi.confirm.push(String(msg)); return true; };
    w.prompt = (msg, def) => { dialoghi.prompt.push(String(msg)); return def !== undefined ? def : null; };

    if (fileDemo) {
        w.localStorage.setItem('arenaFlegreaPrezzi', fs.readFileSync(DEMO_PATH, 'utf8'));
    } else if (database !== null) {
        w.localStorage.setItem('arenaFlegreaPrezzi', JSON.stringify(database));
    }

    w.eval(script + SONDA);

    // Il documento jsdom è già "complete": DOMContentLoaded non si ri-scatena da solo.
    // Lo inviamo a mano così l'inizializzazione dell'app (caricaDatabase, form handler,
    // datalist) avviene in modo sincrono e deterministico per i test.
    w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

    return { dom, window: w, document: w.document, app: w.__app, dialoghi };
}

function demoData() {
    return JSON.parse(fs.readFileSync(DEMO_PATH, 'utf8'));
}

/** Conta i campioni totali di un db */
function contaCampioni(db) {
    return Object.values(db).reduce((s, g) => s + g.campioni.length, 0);
}

// ===========================
// MINI RUNNER
// ===========================

function creaRunner(etichetta) {
    const risultati = [];
    let gruppoCorrente = '';

    const registra = (ok, nome, dettagli) =>
        risultati.push({ ok, nome, dettagli, gruppo: gruppoCorrente });

    const runner = {
        gruppo(nome) { gruppoCorrente = nome; },

        eq(nome, ricevuto, atteso) {
            const ok = Object.is(ricevuto, atteso);
            registra(ok, nome, ok ? '' : `atteso ${JSON.stringify(atteso)} → ottenuto ${JSON.stringify(ricevuto)}`);
        },

        quasi(nome, ricevuto, atteso, tolleranza = 1e-6) {
            const ok = typeof ricevuto === 'number' && Math.abs(ricevuto - atteso) <= tolleranza;
            registra(ok, nome, ok ? '' : `atteso ${atteso} ±${tolleranza} → ottenuto ${ricevuto}`);
        },

        ok(nome, condizione, dettagli = '') {
            registra(Boolean(condizione), nome, condizione ? '' : (dettagli || 'condizione falsa'));
        },

        contiene(nome, haystack, needle) {
            const s = String(haystack);
            registra(s.includes(needle), nome, s.includes(needle) ? '' : `"${needle}" assente`);
        },

        nonContiene(nome, haystack, needle) {
            const s = String(haystack);
            registra(!s.includes(needle), nome, !s.includes(needle) ? '' : `"${needle}" presente`);
        },

        lancia(nome, fn) {
            try {
                fn();
                registra(false, nome, 'nessuna eccezione sollevata');
            } catch (e) {
                registra(true, nome, '');
            }
        },

        riepilogo() {
            const verdi = risultati.filter(r => r.ok).length;
            const totale = risultati.length;
            const nomeFile = etichetta;
            let out = `\n=== ${nomeFile}: ${verdi}/${totale} verdi ===\n`;
            let ultimoGruppo = null;
            for (const r of risultati) {
                if (r.gruppo !== ultimoGruppo) { out += `\n[${r.gruppo}]\n`; ultimoGruppo = r.gruppo; }
                out += `  ${r.ok ? '✓' : '✗'} ${r.nome}${r.dettagli ? ' — ' + r.dettagli : ''}\n`;
            }
            return { verdi, totale, testo: out };
        },

        esci() {
            const { verdi, totale, testo } = runner.riepilogo();
            process.stdout.write(testo);
            process.exit(verdi === totale ? 0 : 1);
        }
    };

    return runner;
}

module.exports = { caricaApp, demoData, contaCampioni, creaRunner, APP_DIR, DEMO_PATH };
