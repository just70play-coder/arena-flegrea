// ===========================
// TEST PHASE 4 — FILTRI EXCEL-LIKE (regressione, 55 asserzioni)
// Verifica: popolamento popover, ricerca, seleziona-tutto, stato filtri,
// badge/contatori, filtri per mercato/data/prezzo/peso, rimozione totale,
// scorciatoie periodo, rendering griglia, spunte preservate, indici ORIGINALI nel modal.
// NON modificare script.js per far passare questi test: sono il vincolo di regressione.
// ===========================

const { caricaApp, demoData, contaCampioni, creaRunner } = require('./harness');

const t = creaRunner('test-phase4.js');
const { window: w, document: doc, app } = caricaApp({ fileDemo: true });
const demo = demoData();

const $ = (sel) => doc.querySelector(sel);
const $$ = (sel) => Array.from(doc.querySelectorAll(sel));
const checkMin = (nome, checked) => {
    const cb = $$(`#pl-minerali input[type="checkbox"]`).find(c => c.value === nome);
    if (!cb) { t.ok(`checkbox minerale "${nome}" presente`, false); return null; }
    cb.checked = checked;
    return cb;
};
const badge = () => $('#filter-badge');
const contatore = () => ({
    visibili: Number($('#results-count').textContent),
    totali: Number($('#results-total').textContent)
});

// ===========================
t.gruppo('Caricamento dati demo');
// ===========================
t.eq('dbPrezzi ha 6 gruppi', Object.keys(app.dbPrezzi).length, 6);
t.eq('dbPrezzi ha 23 campioni', contaCampioni(app.dbPrezzi), 23);
t.eq('gruppo sanidino_monte_nuovo presente', 'sanidino_monte_nuovo' in app.dbPrezzi, true);
t.eq('gruppo ametista_sconosciuta presente', 'ametista_sconosciuta' in app.dbPrezzi, true);
t.eq('localStorage chiave corretta', w.localStorage.getItem('arenaFlegreaPrezzi') !== null, true);

// ===========================
t.gruppo('Popolamento popover filtri');
// ===========================
app.mostraDatabase();
t.eq('popover minerali: 6 checkbox', $$('#pl-minerali input[type="checkbox"]').length, 6);
t.eq('popover località: 6 checkbox', $$('#pl-localita input[type="checkbox"]').length, 6);
t.eq('popover mercati: 5 checkbox', $$('#pl-mercati input[type="checkbox"]').length, 5);
t.ok('popover minerali contiene Sanidino',
    $$('#pl-minerali input[type="checkbox"]').some(c => c.value === 'Sanidino'));
t.ok('popover località contiene Sconosciuta',
    $$('#pl-localita input[type="checkbox"]').some(c => c.value === 'Sconosciuta'));
t.ok('popover mercati contiene catawiki',
    $$('#pl-mercati input[type="checkbox"]').some(c => c.value === 'catawiki'));
t.eq('valori località ordinati alfabeticamente',
    $$('#pl-localita input[type="checkbox"]').map(c => c.value).join('|'),
    Array.from($$('#pl-localita input[type="checkbox"]').map(c => c.value)).sort().join('|'));
t.nonContiene('popover senza placeholder "Nessun dato"', $('#pl-minerali').innerHTML, 'Nessun dato');

// ===========================
t.gruppo('Contatore risultati senza filtri');
// ===========================
t.eq('visibili = 23 senza filtri', contatore().visibili, 23);
t.eq('totali = 23', contatore().totali, 23);
t.eq('badge nascosto senza filtri', badge().classList.contains('hidden'), true);
t.eq('pulsante clear nascosto senza filtri', $('#btn-clear-filters').classList.contains('hidden'), true);

// ===========================
t.gruppo('Filtro per minerale');
// ===========================
checkMin('Sanidino', true);
app.applicaFiltri();
t.eq('stato filtri: minerali = [Sanidino]', app.filtriAttivi.minerali.join(','), 'Sanidino');
t.eq('visibili = 6 con filtro Sanidino', contatore().visibili, 6);
t.eq('totali resta 23', contatore().totali, 23);
t.eq('badge visibile', badge().classList.contains('hidden'), false);
t.eq('badge testo "1 filtro attivo"', badge().textContent, '1 filtro attivo');
t.eq('pulsante minerale attivo', $('#fb-minerali').classList.contains('attivo'), true);
t.eq('counter minerali = 1', $('#fc-minerali').textContent, '1');
t.eq('counter minerali non nascosto', $('#fc-minerali').classList.contains('hidden'), false);
t.contiene('griglia renderizza la card Sanidino', $('#database-list').innerHTML.toLowerCase(), 'sanidino');
t.nonContiene('griglia NON renderizza Diaspro rosso', $('#database-list').innerHTML.toLowerCase(), 'diaspro rosso');

// ===========================
t.gruppo('Badge plurale + secondo filtro');
// ===========================
checkMin('Leucite', true);
app.applicaFiltri();
t.eq('visibili = 10 con Sanidino+Leucite', contatore().visibili, 10);
// Il badge conta i GRUPPI di filtri attivi, non le singole spunte: 2 minerali = 1 gruppo
t.eq('badge resta "1 filtro attivo" con 2 minerali', badge().textContent, '1 filtro attivo');
t.eq('counter minerali = 2', $('#fc-minerali').textContent, '2');

// ===========================
t.gruppo('Spunte preservate al ripopolamento');
// ===========================
app.popolaFiltri();
t.eq('Sanidino ancora spuntato dopo ripopolamento',
    $$('#pl-minerali input[type="checkbox"]').find(c => c.value === 'Sanidino').checked, true);
t.eq('Leucite ancora spuntata dopo ripopolamento',
    $$('#pl-minerali input[type="checkbox"]').find(c => c.value === 'Leucite').checked, true);
t.eq('Hauyne NON spuntata dopo ripopolamento',
    $$('#pl-minerali input[type="checkbox"]').find(c => c.value === 'Hauyne').checked, false);

// ===========================
t.gruppo('Seleziona tutto / deseleziona tutto');
// ===========================
app.toggleTutti('minerali', true);
t.eq('tutti e 6 i minerali spuntati',
    $$('#pl-minerali input[type="checkbox"]:checked').length, 6);
t.eq('select-all minerali sincronizzato', $('#select-all-minerali').checked, true);
app.applicaFiltri();
t.eq('visibili = 23 con tutti spuntati', contatore().visibili, 23);
app.toggleTutti('minerali', false);
t.eq('nessun minerale spuntato',
    $$('#pl-minerali input[type="checkbox"]:checked').length, 0);
t.eq('select-all desincronizzato', $('#select-all-minerali').checked, false);
app.applicaFiltri();
t.eq('visibili = 23 senza filtri attivi', contatore().visibili, 23);
t.eq('badge di nuovo nascosto', badge().classList.contains('hidden'), true);

// ===========================
t.gruppo('Ricerca nel popover');
// ===========================
// v0.2.8: la ricerca rigenera la lista — le voci non corrispondenti escono dal DOM
app.cercaNelPopover('minerali', 'dias');
t.eq('opzione Diaspro rosso presente nella lista',
    $$('#pl-minerali .filter-checkbox').some(l => l.textContent.toLowerCase().includes('diaspro rosso')), true);
t.eq('opzione Sanidino assente dalla lista',
    $$('#pl-minerali .filter-checkbox').some(l => l.textContent.includes('Sanidino')), false);
app.cercaNelPopover('minerali', '');
t.eq('opzione Sanidino di nuovo presente',
    $$('#pl-minerali .filter-checkbox').some(l => l.textContent.includes('Sanidino')), true);

// ===========================
t.gruppo('Filtro per mercato');
// ===========================
const cbCatawiki = $$('#pl-mercati input[type="checkbox"]').find(c => c.value === 'catawiki');
cbCatawiki.checked = true;
app.applicaFiltri();
t.eq('stato filtri: mercati = [catawiki]', app.filtriAttivi.mercati.join(','), 'catawiki');
t.eq('visibili = 8 con solo catawiki', contatore().visibili, 8);
t.eq('pulsante mercati attivo', $('#fb-mercati').classList.contains('attivo'), true);
cbCatawiki.checked = false;
app.applicaFiltri();

// ===========================
t.gruppo('Filtro per prezzo min/max');
// ===========================
$('#filter-prezzo-min').value = '100';
app.applicaFiltri();
t.eq('stato filtri: prezzoMin = 100', app.filtriAttivi.prezzoMin, 100);
t.eq('prezzoMax resta null', app.filtriAttivi.prezzoMax, null);
t.eq('visibili = 3 con prezzo ≥ 100', contatore().visibili, 3);
$('#filter-prezzo-max').value = '150';
app.applicaFiltri();
t.eq('visibili = 2 con 100 ≤ prezzo ≤ 150', contatore().visibili, 2);
$('#filter-prezzo-min').value = '';
$('#filter-prezzo-max').value = '';
app.applicaFiltri();
t.eq('visibili = 23 dopo reset range prezzo', contatore().visibili, 23);

// ===========================
t.gruppo('Filtro per peso min/max');
// ===========================
$('#filter-peso-min').value = '200';
app.applicaFiltri();
t.eq('stato filtri: pesoMin = 200', app.filtriAttivi.pesoMin, 200);
t.eq('visibili = 8 con peso ≥ 200', contatore().visibili, 8);
$('#filter-peso-min').value = '';
app.applicaFiltri();

// ===========================
t.gruppo('Filtro per intervallo date');
// ===========================
$('#filter-data-da').value = '2026-01-01';
$('#filter-data-a').value = '2026-12-31';
app.applicaFiltri();
t.eq('stato filtri: dataDa impostata', app.filtriAttivi.dataDa instanceof w.Date, true);
t.eq('stato filtri: dataA impostata', app.filtriAttivi.dataA instanceof w.Date, true);
t.eq('visibili = 16 nel solo 2026', contatore().visibili, 16);
t.eq('pulsante date attivo', $('#fb-date').classList.contains('attivo'), true);

// ===========================
t.gruppo('Scorciatoie periodo (30/90/365 giorni)');
// ===========================
app.impostaPeriodo(3650);
t.eq('visibili = 23 con periodo lunghissimo', contatore().visibili, 23);
app.impostaPeriodo(1);
t.ok('con periodo 1 giorno i visibili sono pochi', contatore().visibili < 23,
    `ottenuto ${contatore().visibili}`);
t.eq('campo data-da compilato da impostaPeriodo', $('#filter-data-da').value !== '', true);
app.rimuoviTuttiFiltri();
t.eq('visibili = 23 dopo rimuoviTuttiFiltri', contatore().visibili, 23);
t.eq('campo data-da svuotato', $('#filter-data-da').value, '');
t.eq('badge nascosto dopo rimuoviTuttiFiltri', badge().classList.contains('hidden'), true);
t.eq('pulsante clear nascosto dopo rimuoviTuttiFiltri',
    $('#btn-clear-filters').classList.contains('hidden'), true);

// ===========================
t.gruppo('Ricerca testuale + ordinamento');
// ===========================
$('#search-db').value = 'sanidino';
app.filtraDatabase();
t.eq('visibili = 6 con ricerca "sanidino"', contatore().visibili, 6);
$('#search-db').value = 'zzz-nessun-risultato';
app.filtraDatabase();
t.eq('visibili = 0 con ricerca senza esiti', contatore().visibili, 0);
t.contiene('stato vuoto mostrato', $('#database-list').innerHTML, 'Nessun risultato trovato');
$('#search-db').value = '';
app.filtraDatabase();

// ===========================
t.gruppo('Modal dettagli: indici ORIGINALI preservati');
// ===========================
app.rimuoviTuttiFiltri();
app.mostraDettagliMinerale('sanidino_monte_nuovo');
let modal = $('.modal');
t.ok('modal aperto', modal !== null);
t.contiene('modal titolo corretto', modal.innerHTML, 'Sanidino - Monte Nuovo');
t.eq('modal lista 6 campioni', modal.querySelectorAll('.campione-card').length, 6);
t.eq('pulsanti Modifica nel modal', modal.querySelectorAll('.btn-edit').length, 6);

// Filtro attivo: il modal deve mostrare solo i visibili ma con indici originali
modal.remove();
$('#filter-prezzo-min').value = '100';
app.applicaFiltri();
app.mostraDettagliMinerale('sanidino_monte_nuovo');
modal = $('.modal');
t.eq('modal filtrato: 1 campione su 6', modal.querySelectorAll('.campione-card').length, 1);
t.contiene('modal filtrato: avviso vista filtrata', modal.innerHTML, 'Vista filtrata');
// Il campione Heritage da €120 è l'indice 4 del gruppo: l'onclick deve usare 4, non 0
const idxOnclick = modal.querySelector('.btn-edit').getAttribute('onclick').match(/,\s*(\d+)\)/)[1];
t.eq('indice onclick = 4 (originale, non 0)', idxOnclick, '4');
t.contiene('modal filtrato: statistiche ricalcolate sui visibili', modal.innerHTML, '1 di 6');

// ===========================
t.gruppo('Utility di supporto');
// ===========================
app.rimuoviTuttiFiltri(); // azzera anche il periodo impostato da impostaPeriodo
t.eq('escapeHtml: apici', app.escapeHtml(`<b>"a"</b>`), '&lt;b&gt;&quot;a&quot;&lt;/b&gt;');
t.eq('gruppoSuperaFiltri senza filtri', app.gruppoSuperaFiltri(app.dbPrezzi.sanidino_monte_nuovo), true);
t.eq('campioneSuperaFiltri con dato valido',
    app.campioneSuperaFiltri(app.dbPrezzi.sanidino_monte_nuovo.campioni[0], app.dbPrezzi.sanidino_monte_nuovo), true);
modal.remove();
app.rimuoviTuttiFiltri();

t.esci();
