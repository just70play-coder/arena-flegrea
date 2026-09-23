// ===========================
// TEST v0.2.5 — PROVENIENZA SCONOSCIUTA (0.7x) + lookup ibrido
// Verifica: normalizzaLocalita, checkbox sconosciuta (Quick Add + Valutatore),
// generazione chiave 'Sconosciuta', strategia IBRIDA (gruppo dedicato → aggregato),
// flusso Valutatore end-to-end e valore stimato di riferimento.
// ===========================

const { caricaApp, demoData, creaRunner } = require('./harness');

const t = creaRunner('test-v025.js');
const { window: w, document: doc, app, dialoghi } = caricaApp({ fileDemo: true });

const $ = (sel) => doc.querySelector(sel);
const invia = (formId) => $('#' + formId).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
const pulisciForm = () => {
    ['val-minerale', 'val-localita', 'val-prezzo', 'val-peso'].forEach(id => { $('#' + id).value = ''; });
    $('#val-localita-sconosciuta').checked = false;
    $('#risultato-valutazione').innerHTML = '';
    dialoghi.alert.length = 0;
};

// ===========================
t.gruppo('CONFIG provenienza sconosciuta');
// ===========================
t.eq('CONFIG.localitaSconosciuta', app.CONFIG.localitaSconosciuta, 'Sconosciuta');
t.eq('CONFIG.fattoreLocalitaSconosciuta', app.CONFIG.fattoreLocalitaSconosciuta, 0.7);
t.eq('0.7 è il minimo del range Phase 5', app.CONFIG.fattoreLocalitaSconosciuta >= 0.7, true);

// ===========================
t.gruppo('normalizzaLocalita — canonicalizzazione');
// ===========================
t.eq('"sconosciuta" → "Sconosciuta"', app.normalizzaLocalita('sconosciuta'), 'Sconosciuta');
t.eq('"SCONOSCIUTA" → "Sconosciuta"', app.normalizzaLocalita('SCONOSCIUTA'), 'Sconosciuta');
t.eq('"  Sconosciuta  " → "Sconosciuta"', app.normalizzaLocalita('  Sconosciuta  '), 'Sconosciuta');
t.eq('"Sconosciuta " con spazi interni multipli', app.normalizzaLocalita('Scon   osciuta'), 'Scon osciuta');
t.eq('"Monte Nuovo" invariato', app.normalizzaLocalita('Monte Nuovo'), 'Monte Nuovo');
t.eq('backslash rimossi', app.normalizzaLocalita('Monte\\Nuovo'), 'Monte Nuovo');
t.eq('stringa vuota resta vuota', app.normalizzaLocalita(''), '');

// ===========================
t.gruppo('Checkbox sconosciuta — Quick Add');
// ===========================
$('#qa-localita-sconosciuta').checked = true;
app.toggleLocalitaSconosciuta('qa');
t.eq('campo località svuotato', $('#qa-localita').value, '');
t.eq('campo località disabilitato', $('#qa-localita').disabled, true);
t.eq('attributo required rimosso', $('#qa-localita').hasAttribute('required'), false);
t.eq('asterisco nascosto', $('#qa-localita').closest('.form-group').querySelector('label > .required').style.visibility, 'hidden');

$('#qa-localita-sconosciuta').checked = false;
app.toggleLocalitaSconosciuta('qa');
t.eq('campo località riabilitato', $('#qa-localita').disabled, false);
t.eq('attributo required ripristinato', $('#qa-localita').hasAttribute('required'), true);
t.eq('asterisco di nuovo visibile', $('#qa-localita').closest('.form-group').querySelector('label > .required').style.visibility, '');

// ===========================
t.gruppo('Checkbox sconosciuta — Valutatore');
// ===========================
$('#val-localita-sconosciuta').checked = true;
app.toggleLocalitaSconosciuta('val');
t.eq('val-localita disabilitato', $('#val-localita').disabled, true);
$('#val-localita-sconosciuta').checked = false;
app.toggleLocalitaSconosciuta('val');
t.eq('val-localita riabilitato', $('#val-localita').disabled, false);

app.resetStatoSconosciuta('val');
t.eq('resetStatoSconosciuta: checkbox deselezionata', $('#val-localita-sconosciuta').checked, false);
t.eq('resetStatoSconosciuta: campo attivo', $('#val-localita').disabled, false);

// ===========================
t.gruppo('Lookup con località nota (ramo classico)');
// ===========================
const gruppoNoto = app.trovaDatiGruppo('Sanidino', 'Monte Nuovo');
t.ok('Sanidino/Monte Nuovo trovato', gruppoNoto !== null);
t.eq('6 campioni nel gruppo', gruppoNoto.datiDB.campioni.length, 6);
t.eq('etichetta = località', gruppoNoto.etichetta, 'Monte Nuovo');
t.eq('Sanidino/Solfatara inesistente', app.trovaDatiGruppo('Sanidino', 'Solfatara'), null);
t.eq('Zirconio/Vesuvio inesistente', app.trovaDatiGruppo('Zirconio', 'Vesuvio'), null);

// ===========================
t.gruppo('Strategia IBRIDA — ramo 1: gruppo dedicato');
// ===========================
const dedicato = app.trovaDatiLocalitaSconosciuta('Ametista');
t.ok('Ametista/Sconosciuta trovato', dedicato !== null);
t.eq('aggregato = false (gruppo dedicato)', dedicato.aggregato, false);
t.eq('3 campioni', dedicato.datiDB.campioni.length, 3);
t.eq('fattore località = "Sconosciuta"', dedicato.localitaFattore, 'Sconosciuta');
t.contiene('etichetta contiene (0.7x)', dedicato.etichetta, '(0.7x)');
t.eq('medie ricalcolate dal gruppo', dedicato.datiDB.medie.ebay.n, 1);

// ===========================
t.gruppo('Strategia IBRIDA — ramo 2: aggregato su tutte le località');
// ===========================
const aggregato = app.trovaDatiLocalitaSconosciuta('Sanidino');
t.ok('Sanidino/Sconosciuta trovato via aggregazione', aggregato !== null);
t.eq('aggregato = true', aggregato.aggregato, true);
t.eq('6 campioni aggregati', aggregato.datiDB.campioni.length, 6);
t.contiene('etichetta segnala l\'aggregazione', aggregato.etichetta, 'tutte le località');
t.contiene('etichetta indica 1 zona', aggregato.etichetta, '1 zona');
t.eq('fattore resta "Sconosciuta"', aggregato.localitaFattore, 'Sconosciuta');
t.eq('minerale inesistente → null', app.trovaDatiLocalitaSconosciuta('Zirconio'), null);

// ===========================
t.gruppo('Fattore località applicato');
// ===========================
t.eq('Sanidino/Sconosciuta → 0.7', app.getFattoreLocalita('Sanidino', 'Sconosciuta'), 0.7);
t.eq('Sanidino/Monte Nuovo → 1.4', app.getFattoreLocalita('Sanidino', 'Monte Nuovo'), 1.4);
t.eq('Ametista/Sconosciuta → 0.7', app.getFattoreLocalita('Ametista', 'Sconosciuta'), 0.7);

// ===========================
t.gruppo('Valutatore end-to-end (località nota)');
// ===========================
pulisciForm();
$('#val-minerale').value = 'Sanidino';
$('#val-localita').value = 'Monte Nuovo';
$('#val-prezzo').value = '30';
$('#val-peso').value = '85';
invia('form-valutatore');
const esito = $('#risultato-valutazione');
t.nonContiene('nessun alert di errore', dialoghi.alert.join('|'), 'Nessun dato');
t.contiene('risultato renderizzato', esito.innerHTML, 'Valore stimato');
t.contiene('raccomandazione presente', esito.innerHTML, 'raccomandazione-');

// Valore di riferimento v0.2.5.1 (pre-Phase 5), verificato sull'implementazione reale:
// mediaPonderata €/g = 0.38748 (pesiMercato normalizzati, Etsy ×0.7) → ×85g ×1.4 ×0.5 ×0.95 = 21.95 €
// (corrisponde all'esempio del documento di passaggio: €21.95)
const dati = app.trovaDatiGruppo('Sanidino', 'Monte Nuovo').datiDB;
const stima = app.calcolaValoreStimato('Sanidino', 'Monte Nuovo', 85, dati);
t.quasi('valore stimato = 21.95 € (formula v0.2.5.1)', stima, 21.9479, 0.01);
// Dal v0.2.7 il pannello usa lo score di default (5.75/10, integrità 10), non più la legacy
const stimaDefault = app.calcolaValoreStimato('Sanidino', 'Monte Nuovo', 85, dati,
    app.calcolaScore({ cristallinita: 5, estetica: 5, rarita: 5, dimensioni: 5, integrita: 10, trasparenza: 5 }));
t.quasi('valore di default nel pannello = 26.57 €', stimaDefault, 26.5685, 0.01);
t.eq('percentuale nel pannello coerente col valore di default',
    Number(($('.valore-riga.percentuale strong').textContent.match(/[\d.]+/)[0])).toFixed(1),
    (30 / stimaDefault * 100).toFixed(1));

// ===========================
t.gruppo('Valutatore end-to-end (provenienza sconosciuta)');
// ===========================
pulisciForm();
$('#val-minerale').value = 'Sanidino';
$('#val-localita-sconosciuta').checked = true;
app.toggleLocalitaSconosciuta('val');
$('#val-prezzo').value = '30';
$('#val-peso').value = '85';
invia('form-valutatore');
t.nonContiene('nessun alert: campo località disabilitato accettato', dialoghi.alert.join('|'), 'Compila tutti i campi');
t.contiene('risultato con etichetta Sconosciuta', $('#risultato-valutazione').innerHTML, 'Sconosciuta');
const stimaSconosciuta = app.calcolaValoreStimato('Sanidino', 'Sconosciuta', 85, app.trovaDatiLocalitaSconosciuta('Sanidino').datiDB);
t.quasi('valore con 0.7x = 10.97 €', stimaSconosciuta, 21.9479 * 0.7 / 1.4, 0.01);
t.ok('stima sconosciuta < stima Monte Nuovo', stimaSconosciuta < stima, `${stimaSconosciuta} vs ${stima}`);

// ===========================
t.gruppo('Validazione form');
// ===========================
pulisciForm();
$('#val-minerale').value = 'Sanidino';
$('#val-peso').value = '85';
invia('form-valutatore');
t.contiene('manca il prezzo → alert', dialoghi.alert.join('|'), 'Compila tutti i campi');

pulisciForm();
$('#val-minerale').value = 'Zirconio';
$('#val-localita').value = 'Vesuvio';
$('#val-prezzo').value = '30';
$('#val-peso').value = '85';
invia('form-valutatore');
t.contiene('minerale senza dati → alert dedicato', dialoghi.alert.join('|'), 'Nessun dato per Zirconio');

// ===========================
t.gruppo('Quick Add con provenienza sconosciuta');
// ===========================
$('#qa-minerale').value = 'Zirconio';
$('#qa-localita-sconosciuta').checked = true;
app.toggleLocalitaSconosciuta('qa');
$('#qa-prezzo').value = '40';
$('#qa-peso').value = '10';
$('#qa-mercato').value = 'catawiki';
$('#qa-data').value = '2026-09-20';
invia('form-quick-add');
t.ok('gruppo zirconio_sconosciuta creato', 'zirconio_sconosciuta' in app.dbPrezzi);
t.eq('località salvata = "Sconosciuta"', app.dbPrezzi.zirconio_sconosciuta.localita, 'Sconosciuta');
t.eq('1 campione salvato', app.dbPrezzi.zirconio_sconosciuta.campioni.length, 1);
t.eq('prezzogrammo calcolato', app.dbPrezzi.zirconio_sconosciuta.campioni[0].prezzogrammo, 4);
t.ok('persistito in localStorage',
    JSON.parse(w.localStorage.getItem('arenaFlegreaPrezzi')).zirconio_sconosciuta !== undefined);
t.eq('checkbox resettata dopo il salvataggio', $('#qa-localita-sconosciuta').checked, false);
t.eq('campo località riabilitato dopo il salvataggio', $('#qa-localita').disabled, false);

// Il nuovo gruppo ora esiste: il ramo ibrido deve usare quello dedicato
const zirc = app.trovaDatiLocalitaSconosciuta('Zirconio');
t.eq('ramo dedicato usato per Zirconio', zirc.aggregato, false);

// Alias multilingua in Quick Add
$('#qa-minerale').value = 'red jasper';
$('#qa-localita').value = 'Madagascar';
$('#qa-localita-sconosciuta').checked = false;
$('#qa-prezzo').value = '25';
$('#qa-peso').value = '100';
invia('form-quick-add');
t.eq('alias "red jasper" → Diaspro rosso',
    app.normalizzaMinerale('red jasper'), 'Diaspro rosso');
t.eq('nessun gruppo duplicato creato',
    app.dbPrezzi['diaspro rosso_madagascar'], undefined);

t.esci();
