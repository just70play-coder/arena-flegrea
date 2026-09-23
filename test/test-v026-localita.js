// ===========================
// TEST v0.2.6 — REGOLA GIACIMENTI TIPICI (end-to-end sul flusso reale)
// Caso d'uso di Fabio: hardystonite / clinohedrite / willemite da
// "Parker Shaft, Franklin Mine, New Jersey, Stati Uniti" deve valere PIÙ dello
// stesso minerale da un'altra località, perché è il giacimento di riferimento.
// Verifica anche la convergenza delle scritture diverse sullo stesso gruppo.
// ===========================

const { caricaApp, creaRunner } = require('./harness');

const t = creaRunner('test-v026-localita.js');
const { window: w, document: doc, app, dialoghi } = caricaApp({ fileDemo: true });

const $ = (sel) => doc.querySelector(sel);
const quickAdd = (minerale, localita, prezzo, peso, mercato, sconosciuta = false) => {
    $('#qa-minerale').value = minerale;
    $('#qa-localita-sconosciuta').checked = sconosciuta;
    app.toggleLocalitaSconosciuta('qa');
    if (!sconosciuta) $('#qa-localita').value = localita;
    $('#qa-prezzo').value = String(prezzo);
    $('#qa-peso').value = String(peso);
    $('#qa-mercato').value = mercato;
    $('#qa-data').value = '2026-09-20';
    $('#form-quick-add').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
};

const FRANKLIN_INTERO = 'Parker Shaft, Franklin Mine, New Jersey, Stati Uniti';
const CANONICA = 'Parker Shaft (Franklin, New Jersey)';

// ===========================
t.gruppo('Inserimento da Franklin Mine (scritture diverse, stesso gruppo)');
// ===========================
quickAdd('Hardystonite', 'Parker Shaft', 150, 50, 'catawiki');
quickAdd('Hardystonite', 'Franklin Mine, New Jersey, USA', 160, 55, 'ebay');
quickAdd('Hardystonite', FRANKLIN_INTERO, 140, 45, 'heritage');

t.ok('gruppo canonico creato', `hardystonite_${CANONICA.toLowerCase().replace(/\s+/g, '_')}` in app.dbPrezzi
    || Object.keys(app.dbPrezzi).some(k => k.startsWith('hardystonite_parker_shaft')));
const chiaviHardy = Object.keys(app.dbPrezzi).filter(k => k.startsWith('hardystonite_'));
t.eq('le tre scritture convergono in UN solo gruppo', chiaviHardy.length, 1);
t.eq('località salvata in forma canonica', app.dbPrezzi[chiaviHardy[0]].localita, CANONICA);
t.eq('3 campioni nel gruppo', app.dbPrezzi[chiaviHardy[0]].campioni.length, 3);

quickAdd('Clinohedrite', 'franklin', 90, 30, 'catawiki');
t.eq('anche "franklin" minuscolo converge sulla canonica',
    app.dbPrezzi[`clinohedrite_${CANONICA.toLowerCase().replace(/\s+/g, '_')}`] !== undefined, true);

// ===========================
t.gruppo('Fattore località applicato nel calcolo');
// ===========================
const gruppoFranklin = app.dbPrezzi[chiaviHardy[0]];
const stimaFranklin = app.calcolaValoreStimato('Hardystonite', CANONICA, 50, gruppoFranklin);
t.eq('fattore Franklin per hardystonite', app.getFattoreLocalita('Hardystonite', CANONICA), 1.6);

// Stesso prezzo/peso ma località non tipica
const gruppoNeutro = {
    minerale: 'Hardystonite',
    localita: 'Cava Fantasia',
    campioni: gruppoFranklin.campioni,
    medie: gruppoFranklin.medie
};
const stimaNeutra = app.calcolaValoreStimato('Hardystonite', 'Cava Fantasia', 50, gruppoNeutro);
t.eq('fattore località non tipica', app.getFattoreLocalita('Hardystonite', 'Cava Fantasia'), 1.0);
t.ok('Franklin vale più di una località non tipica', stimaFranklin > stimaNeutra,
    `${stimaFranklin.toFixed(2)} vs ${stimaNeutra.toFixed(2)}`);
t.quasi('rapporto = 1.6 / 1.0', stimaFranklin / stimaNeutra, 1.6, 1e-9);

// Provenienza sconosciuta: deve valere meno di entrambe
const stimaSconosciuta = app.calcolaValoreStimato('Hardystonite', 'Sconosciuta', 50, gruppoFranklin);
t.ok('Sconosciuta (0.7x) vale meno della località non tipica (1.0x)', stimaSconosciuta < stimaNeutra);
t.quasi('rapporto Sconosciuta/Franklin = 0.7/1.6', stimaSconosciuta / stimaFranklin, 0.7 / 1.6, 1e-9);

// Willemite: giacimento tipico ma con fattore suo (1.5)
t.eq('Willemite/Franklin = 1.5', app.getFattoreLocalita('Willemite', CANONICA), 1.5);
t.ok('hardystonite (1.6) più favorita della willemite (1.5) a Franklin',
    app.getFattoreLocalita('Hardystonite', CANONICA) > app.getFattoreLocalita('Willemite', CANONICA));

// ===========================
t.gruppo('Valutatore end-to-end su Franklin Mine');
// ===========================
['val-minerale', 'val-localita', 'val-prezzo', 'val-peso'].forEach(id => { $('#' + id).value = ''; });
dialoghi.alert.length = 0;
$('#val-minerale').value = 'Hardystonite';
$('#val-localita').value = 'franklin mine';
$('#val-prezzo').value = '100';
$('#val-peso').value = '50';
$('#form-valutatore').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

t.eq('nessun alert di errore', dialoghi.alert.join('|'), '');
const esito = $('#risultato-valutazione').innerHTML;
t.contiene('risultato renderizzato', esito, 'Valore stimato');
t.contiene('località canonica mostrata nel risultato', esito, 'Parker Shaft');
// Dal v0.2.7 il pannello applica lo score di default (5.75/10, integrità 10)
const scoreDefault = app.calcolaScore({ cristallinita: 5, estetica: 5, rarita: 5,
    dimensioni: 5, integrita: 10, trasparenza: 5 });
const attesaDefault = app.calcolaValoreStimato('Hardystonite', CANONICA, 50, gruppoFranklin, scoreDefault);
t.eq('valore stimato nel pannello = calcolo atteso (score di default)',
    Number(esito.match(/Valore stimato:<\/span>\s*<strong>€([\d.,]+)/)[1].replace(',', '.')),
    Number(attesaDefault.toFixed(2)));
t.contiene('il risultato mostra la scomposizione della formula', esito, 'Come è calcolato il valore');
t.contiene('scomposizione: fattore località 1.60', esito, '× 1.60');

// ===========================
t.gruppo('Interfaccia: datalist e filtri');
// ===========================
app.aggiornaDatalist();
const opzioniVal = Array.from(doc.querySelectorAll('#datalist-localita-val option')).map(o => o.value);
t.ok('datalist località contiene la forma canonica', opzioniVal.includes(CANONICA));

app.mostraDatabase();
const filtriLocalita = Array.from(doc.querySelectorAll('#pl-localita input[type="checkbox"]')).map(c => c.value);
t.ok('filtro località contiene Parker Shaft', filtriLocalita.includes(CANONICA));
t.eq('nessun duplicato Franklin nei filtri',
    filtriLocalita.filter(v => v.toLowerCase().includes('franklin')).length, 1);
t.ok('le località del demo restano nei filtri', filtriLocalita.includes('Monte Nuovo'));

t.esci();
