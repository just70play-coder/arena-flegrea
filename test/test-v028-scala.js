// ===========================
// TEST v0.2.8 — SCALA: CENTINAIA DI CAMPIONI
// Verifica: migrazione canonicalizzante dei gruppi, paginazione della griglia
// Database Prezzi, paginazione del modal dei dettagli con preservazione degli
// INDICI ORIGINALI (anti-bug v0.2.5), tetto sulle liste dei popover dei filtri
// con priorità alle voci spuntate, campo "minerali secondari" (parse, Quick Add,
// ricerca, visualizzazione, modifica) e aggiornamento della versione.
// ===========================

const { caricaApp, creaRunner } = require('./harness');

const t = creaRunner('test-v028-scala.js');

// ===========================
t.gruppo('Configurazione scala');
// ===========================
const demo = caricaApp({ fileDemo: true });
const w = demo.window, doc = demo.document, app = demo.app, dialoghi = demo.dialoghi;

const $ = (sel) => doc.querySelector(sel);
const $$ = (sel) => Array.from(doc.querySelectorAll(sel));
const contatore = () => ({
    visibili: Number($('#results-count').textContent),
    totali: Number($('#results-total').textContent)
});

t.eq('gruppi per pagina di default = 12', app.CONFIG.gruppoPerPage, 12);
t.eq('campioni per pagina nel modal = 20', app.CONFIG.campioniPerPagina, 20);
t.eq('soglia liste popover = 150', app.CONFIG.sogliaPopoverFiltri, 150);

// ===========================
t.gruppo('parseMineraliSecondari');
// ===========================
t.eq('lista semplice normalizzata',
    JSON.stringify(app.parseMineraliSecondari('clinohedrite, willemite')),
    JSON.stringify(['Clinohedrite', 'Willemite']));
t.eq('virgole vuote e spazi ignorati',
    JSON.stringify(app.parseMineraliSecondari('  Hardystonite , , ,  ')),
    JSON.stringify(['Hardystonite']));
t.eq('stringa vuota → array vuoto', JSON.stringify(app.parseMineraliSecondari('')), '[]');
t.eq('null → array vuoto', JSON.stringify(app.parseMineraliSecondari(null)), '[]');
t.eq('undefined → array vuoto', JSON.stringify(app.parseMineraliSecondari(undefined)), '[]');

// ===========================
t.gruppo('Migrazione canonicalizzante (dati sporchi)');
// ===========================
const c = (prezzo, peso) => ({ prezzo, peso, prezzogrammo: prezzo / peso, mercato: 'catawiki', data: '2026-01-10', note: '' });
const dbSporco = {
    'sanidino|monte nuovo': { minerale: 'sanidino', localita: 'monte nuovo', campioni: [c(10, 10), c(20, 10)], medie: {} },
    'Diaspro Rosso|Egitto': { minerale: 'Diaspro Rosso', localita: 'Egitto', campioni: [c(30, 10)], medie: {} },
    'Diaspro rosso|Egitto': { minerale: 'Diaspro rosso', localita: 'Egitto', campioni: [c(40, 10), c(50, 10)], medie: {} }
};

const sporco = caricaApp({ database: dbSporco });
const appS = sporco.app, wS = sporco.window;

t.eq('gruppi sporchi ridotti a 2', Object.keys(appS.dbPrezzi).length, 2);
t.eq('nessun campione perso nella migrazione',
    Object.values(appS.dbPrezzi).reduce((s, g) => s + g.campioni.length, 0), 5);

const gruppoSanidino = appS.dbPrezzi[appS.generaChiave('Sanidino', 'Monte Nuovo')];
const gruppoDiaspro = appS.dbPrezzi[appS.generaChiave('Diaspro Rosso', 'Egitto')];
t.ok('gruppo Sanidino/Monte Nuovo presente con chiave canonica', !!gruppoSanidino);
t.ok('gruppo Diaspro Rosso/Egitto presente con chiave canonica', !!gruppoDiaspro);
t.eq('minerale canonicalizzato', gruppoDiaspro.minerale, appS.normalizzaMinerale('Diaspro rosso'));
t.eq('località canonicalizzata', gruppoDiaspro.localita, appS.localitaCanonica('egitto').nome);
t.eq('località "monte nuovo" → forma canonica', gruppoSanidino.localita, appS.localitaCanonica('monte nuovo').nome);
t.eq('i due gruppi Diaspro sono stati accorpati', gruppoDiaspro.campioni.length, 3);
t.eq('fattore località attivo sul gruppo migrato',
    appS.getFattoreLocalita(gruppoDiaspro.minerale, gruppoDiaspro.localita), 1.3);
t.eq('medie ricalcolate sul gruppo accorpato',
    JSON.stringify(gruppoDiaspro.medie), JSON.stringify(appS.calcolaMedie(gruppoDiaspro.campioni)));
t.ok('localStorage persistito con chiavi canoniche',
    JSON.parse(wS.localStorage.getItem('arenaFlegreaPrezzi'))[appS.generaChiave('Diaspro Rosso', 'Egitto')] !== undefined);

t.eq('seconda esecuzione: nessuna modifica (idempotente)', appS.canonicalizzaDatabase(), false);
t.eq('gruppi invariati dopo la seconda esecuzione', Object.keys(appS.dbPrezzi).length, 2);
t.eq('campioni invariati dopo la seconda esecuzione',
    Object.values(appS.dbPrezzi).reduce((s, g) => s + g.campioni.length, 0), 5);

appS.dbPrezzi = JSON.parse(JSON.stringify(dbSporco));
t.eq('riesecuzione su dati sporchi: migrazione attiva', appS.canonicalizzaDatabase(), true);
t.eq('gruppi di nuovo 2', Object.keys(appS.dbPrezzi).length, 2);

// ===========================
t.gruppo('Paginazione griglia Database Prezzi');
// ===========================
// 6 gruppi demo: sotto i 12 per pagina non c'è barra
app.filtraDatabase();
t.eq('6 card visibili (tutti i gruppi demo)', $$('#database-list .database-card').length, 6);
t.eq('nessuna barra di paginazione con una sola pagina', $$('#database-list .paginazione').length, 0);
t.eq('contatore campioni ancora completo', contatore().visibili, 23);

// 2 gruppi per pagina → 3 pagine
app.CONFIG.gruppoPerPage = 2;
app.filtraDatabase();
t.eq('pagina 1: 2 card', $$('#database-list .database-card').length, 2);
t.ok('barra di paginazione presente', !!$('#db-paginazione'));
t.contiene('testo "Pagina 1 di 3"', $('#db-paginazione').textContent, 'Pagina 1 di 3');
t.contiene('totale gruppi nella barra', $('#db-paginazione').textContent, '6 gruppi');
t.eq('indietro disabilitato in prima pagina', $$('#db-paginazione .btn-pagina')[0].disabled, true);
t.eq('avanti abilitato in prima pagina', $$('#db-paginazione .btn-pagina')[1].disabled, false);

app.vaiAPagina('db', 3);
t.eq('pagina 3: 2 card', $$('#database-list .database-card').length, 2);
t.contiene('testo "Pagina 3 di 3"', $('#db-paginazione').textContent, 'Pagina 3 di 3');
t.eq('avanti disabilitato in ultima pagina', $$('#db-paginazione .btn-pagina')[1].disabled, true);

const cardPagina1 = $$('#database-list .database-card h3').map(h => h.textContent);
app.vaiAPagina('db', 2);
const cardPagina2 = $$('#database-list .database-card h3').map(h => h.textContent);
t.ok('le pagine mostrano gruppi diversi',
    cardPagina1.every(titolo => !cardPagina2.includes(titolo)) && cardPagina2.length === 2);

// la ricerca azzera la pagina
$('#search-db').value = 'leucite';
app.filtraDatabase(true);
t.eq('ricerca: 1 card e nessuna barra', $$('#database-list .database-card').length, 1);
t.eq('nessuna barra dopo la ricerca selettiva', $$('#database-list .paginazione').length, 0);

// azzeraPagina = false: la pagina viene agganciata ai limiti
$('#search-db').value = '';
app.filtraDatabase(true);
app.vaiAPagina('db', 3);
$('#search-db').value = 'sanidino';
app.filtraDatabase(false);
t.eq('pagina agganciata quando i risultati si riducono (1 card)', $$('#database-list .database-card').length, 1);
t.eq('barra assente dopo il clamp', $$('#database-list .paginazione').length, 0);

$('#search-db').value = '';
app.filtraDatabase(true);
t.contiene('pagina di nuovo 1 di 3', $('#db-paginazione').textContent, 'Pagina 1 di 3');

// cambio gruppi per pagina
app.vaiAPagina('db', 2);
app.cambiaGruppiPerPage('4');
t.eq('cambio per-page: 4 card in pagina 1', $$('#database-list .database-card').length, 4);
t.contiene('2 pagine totali', $('#db-paginazione').textContent, 'Pagina 1 di 2');
app.cambiaGruppiPerPage('pippo');
t.eq('valore non numerico ignorato', app.CONFIG.gruppoPerPage, 4);

app.CONFIG.gruppoPerPage = 12;
app.filtraDatabase();
t.eq('ripristino config: di nuovo 6 card senza barra', $$('#database-list .database-card').length, 6);

// ===========================
t.gruppo('Paginazione modal + indici originali');
// ===========================
// sanidino_monte_nuovo ha 6 campioni: 2 per pagina → 3 pagine
app.CONFIG.campioniPerPagina = 2;
app.mostraDettagliMinerale('sanidino_monte_nuovo');

t.eq('modal: 2 campioni in pagina 1', $$('#campioni-lista .campione-card').length, 2);
t.ok('barra paginazione modal presente', !!$('#campioni-paginazione .paginazione'));
t.contiene('testo "Pagina 1 di 3" nel modal', $('#campioni-paginazione').textContent, 'Pagina 1 di 3');

const indiciRaccolti = [];
for (let pagina = 1; pagina <= 3; pagina++) {
    app.vaiAPagina('modal', pagina);
    $$('#campioni-lista .campione-actions .btn-edit').forEach(btn => {
        indiciRaccolti.push(Number(btn.getAttribute('onclick').match(/,\s*(\d+)\)/)[1]));
    });
}
t.eq('gli indici originali coprono 0-5 senza duplicati',
    JSON.stringify(indiciRaccolti.sort((a, b) => a - b)), JSON.stringify([0, 1, 2, 3, 4, 5]));
t.ok('i pulsanti puntano ancora a modificaCampione',
    $$('#campioni-lista .campione-actions .btn-edit').every(b => b.getAttribute('onclick').includes('modificaCampione')));

// con i filtri attivi gli indici restano quelli ORIGINALI (anti-bug v0.2.5)
doc.querySelector('.modal').remove();
const cbEbay = $$('#pl-mercati input[type="checkbox"]').find(cb => cb.value === 'ebay');
cbEbay.checked = true;
app.applicaFiltri();
app.mostraDettagliMinerale('sanidino_monte_nuovo');
t.eq('modal filtrato: 1 campione ebay visibile', $$('#campioni-lista .campione-card').length, 1);
t.contiene('badge mercato del campione visibile', $('#campioni-lista .campione-card').textContent, 'EBAY');
const onclickFiltrato = $('#campioni-lista .campione-actions .btn-edit').getAttribute('onclick');
t.contiene('l\'unico campione ebay conserva il suo indice originale (1, non 0)', onclickFiltrato, ', 1)');

cbEbay.checked = false;
app.rimuoviTuttiFiltri();
doc.querySelector('.modal').remove();
app.CONFIG.campioniPerPagina = 20;

// ===========================
t.gruppo('Tetto liste popover filtri');
// ===========================
app.CONFIG.sogliaPopoverFiltri = 3;
app.popolaFiltri();
t.eq('solo 3 minerali renderizzati (6 nel demo)', $$('#pl-minerali .filter-checkbox').length, 3);
t.ok('avviso di troncamento presente', !!$('#pl-minerali .filter-truncate'));
t.contiene('avviso conta le voci nascoste', $('#pl-minerali .filter-truncate').textContent, '+ altre 3 voci');

// unità: le voci spuntate hanno priorità e restano sempre visibili
app.disegnaListaCheckbox('minerali', ['Alfa', 'Beta', 'Gamma', 'Delta', 'Epsilon'], new Set(['Delta']), '');
const etichette = $$('#pl-minerali .filter-checkbox').map(l => l.textContent);
t.eq('la voce spuntata è la prima della lista', etichette[0], 'Delta');
t.eq('3 voci renderizzate', etichette.length, 3);
t.eq('la voce spuntata resta spuntata', $('#pl-minerali .filter-checkbox input').checked, true);
t.contiene('avviso: 2 voci nascoste', $('#pl-minerali .filter-truncate').textContent, '+ altre 2 voci');

// integrazione: la ricerca rigenera e preserva le selezioni
app.cercaNelPopover('minerali', 'san');
t.eq('ricerca "san": 1 voce', $$('#pl-minerali .filter-checkbox').length, 1);
t.eq('la voce è Sanidino', $('#pl-minerali .filter-checkbox').textContent, 'Sanidino');
$('#pl-minerali .filter-checkbox input').checked = true;
app.cercaNelPopover('minerali', '');
t.ok('Sanidino spuntato resta visibile oltre la soglia',
    $$('#pl-minerali .filter-checkbox').some(l => l.textContent === 'Sanidino' && l.querySelector('input').checked));
t.eq('nuovamente 3 voci renderizzate', $$('#pl-minerali .filter-checkbox').length, 3);

app.rimuoviTuttiFiltri();
app.CONFIG.sogliaPopoverFiltri = 150;
app.popolaFiltri();
t.eq('ripristino soglia: tutte le 6 voci', $$('#pl-minerali .filter-checkbox').length, 6);

// ===========================
t.gruppo('Minerali secondari end-to-end');
// ===========================
$('#qa-minerale').value = 'Sanidino';
$('#qa-localita').value = 'Monte Nuovo';
$('#qa-prezzo').value = '25';
$('#qa-peso').value = '10';
$('#qa-mercato').value = 'dealer';
$('#qa-data').value = '2026-09-20';
$('#qa-minerali-secondari').value = 'clinohedrite, willemite';
$('#form-quick-add').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

const gruppoDopo = app.dbPrezzi['sanidino_monte_nuovo'];
t.eq('campione aggiunto (7 totali)', gruppoDopo.campioni.length, 7);
t.eq('minerali secondari salvati normalizzati',
    JSON.stringify(gruppoDopo.campioni[6].mineraliSecondari),
    JSON.stringify(['Clinohedrite', 'Willemite']));

// la ricerca trova il gruppo anche tramite i minerali secondari
$('#search-db').value = 'willemite';
app.filtraDatabase();
t.ok('ricerca "willemite" trova il gruppo Sanidino',
    $$('#database-list .database-card').some(card => card.textContent.toUpperCase().includes('SANIDINO')));
$('#search-db').value = '';
app.filtraDatabase();

// il modal mostra l'associazione
app.CONFIG.campioniPerPagina = 2;
app.mostraDettagliMinerale('sanidino_monte_nuovo');
app.vaiAPagina('modal', 4); // il nuovo campione è l'ultimo (indice 6 → pagina 4)
t.eq('pagina 4: 1 campione', $$('#campioni-lista .campione-card').length, 1);
t.contiene('riga Associazione nel modal', $('#campioni-lista').innerHTML, 'Associazione:');
t.contiene('minerali secondari mostrati', $('#campioni-lista').textContent, 'Clinohedrite, Willemite');
doc.querySelector('.modal').remove();
app.CONFIG.campioniPerPagina = 20;

// modificaCampione: prompt che restituisce i default → i secondari restano invariati
dialoghi.prompt.length = 0;
app.modificaCampione('sanidino_monte_nuovo', 6);
t.ok('prompt dei minerali secondari presentato',
    dialoghi.prompt.some(msg => msg.includes('Minerali secondari')));
t.eq('con prompt a default i secondari non cambiano',
    JSON.stringify(app.dbPrezzi['sanidino_monte_nuovo'].campioni[6].mineraliSecondari),
    JSON.stringify(['Clinohedrite', 'Willemite']));

// modifica effettiva dei secondari tramite prompt
const richieste = [
    (msg, def) => msg.includes('Minerale:') ? def : null,
    (msg, def) => msg.includes('Localit') ? def : null,
    (msg, def) => msg.includes('Prezzo') ? def : null,
    (msg, def) => msg.includes('Peso') ? def : null,
    (msg, def) => msg.includes('Note:') ? def : null,
    (msg, def) => msg.includes('Minerali secondari') ? 'willemite, hardystonite' : null
];
let iRichiesta = 0;
w.prompt = (msg, def) => richieste[iRichiesta++](String(msg), def);
app.modificaCampione('sanidino_monte_nuovo', 6);
w.prompt = (msg, def) => { dialoghi.prompt.push(String(msg)); return def !== undefined ? def : null; };
t.eq('secondari aggiornati tramite modifica',
    JSON.stringify(app.dbPrezzi['sanidino_monte_nuovo'].campioni[6].mineraliSecondari),
    JSON.stringify(['Willemite', 'Hardystonite']));

// ===========================
t.gruppo('Versione');
// ===========================
t.contiene('versione aggiornata a 0.3.2', doc.body.textContent, '0.3.2 - Unificazione');

t.esci();
