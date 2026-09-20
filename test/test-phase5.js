// ===========================
// TEST PHASE 5 — SCORING FOTOGRAFICO
// Verifica: pesi dei criteri, calcolo dello score ponderato, fattore integrità
// derivato dal voto (opzione C), formula finale, retrocompatibilità delle chiamate
// senza score, cursori dell'interfaccia, scomposizione trasparente nel risultato
// e interazione con il fattore località della v0.2.6.
// ===========================

const { caricaApp, creaRunner } = require('./harness');

const t = creaRunner('test-phase5.js');
const { window: w, document: doc, app, dialoghi } = caricaApp({ fileDemo: true });

const $ = (sel) => doc.querySelector(sel);
const CRITERI = ['cristallinita', 'estetica', 'rarita', 'dimensioni', 'integrita', 'trasparenza'];
const voti = (v) => Object.fromEntries(CRITERI.map(c => [c, v]));

// ===========================
t.gruppo('Configurazione dei criteri');
// ===========================
const sommaPesi = Object.values(app.CONFIG.scoringCriteri).reduce((s, c) => s + c.peso, 0);
t.eq('i pesi sommano 100', sommaPesi, 100);
t.eq('cristallinita 25%', app.CONFIG.scoringCriteri.cristallinita.peso, 25);
t.eq('estetica 20%', app.CONFIG.scoringCriteri.estetica.peso, 20);
t.eq('rarita 20%', app.CONFIG.scoringCriteri.rarita.peso, 20);
t.eq('dimensioni 15%', app.CONFIG.scoringCriteri.dimensioni.peso, 15);
t.eq('integrita 10%', app.CONFIG.scoringCriteri.integrita.peso, 10);
t.eq('trasparenza 10%', app.CONFIG.scoringCriteri.trasparenza.peso, 10);
t.eq('fattore integrità minimo 0.60', app.CONFIG.fattoreIntegritaMin, 0.60);
t.eq('fattore integrità massimo 1.00', app.CONFIG.fattoreIntegritaMax, 1.00);
t.eq('default integrità = 10 (integrità perfetta)', app.CONFIG.scoringDefaultIntegrita, 10);

// ===========================
t.gruppo('Score ponderato');
// ===========================
t.eq('tutti a 5 → 5.0', app.calcolaScore(voti(5)).score, 5.0);
t.eq('tutti a 10 → 10.0', app.calcolaScore(voti(10)).score, 10.0);
t.eq('tutti a 1 → 1.0', app.calcolaScore(voti(1)).score, 1.0);
t.eq('default reale (5 con integrità 10) → 5.5',
    app.calcolaScore({ ...voti(5), integrita: 10 }).score, 5.5);
t.eq('suDieci = score/10', app.calcolaScore(voti(7)).suDieci, 0.7);
// Esempio del documento: crist 8, est 7, rar 6, dim 5, tras 7, integrità 3
t.quasi('esempio doc → 6.35', app.calcolaScore({
    cristallinita: 8, estetica: 7, rarita: 6, dimensioni: 5, integrita: 3, trasparenza: 7
}).score, 6.35, 1e-9);
t.eq('voto fuori scala viene limitato a 10', app.calcolaScore({ ...voti(5), rarita: 42 }).score, 6.0);
t.eq('voto sotto scala viene limitato a 1', app.calcolaScore({ ...voti(5), rarita: -3 }).score, 4.2);
t.eq('voto mancante → default 5', app.calcolaScore({ cristallinita: 9 }).score,
    (9 * 25 + 5 * 75) / 100);

// ===========================
t.gruppo('Fattore integrità derivato dal voto');
// ===========================
t.eq('voto 1 → 0.60', app.fattoreDaIntegrita(1), 0.60);
t.eq('voto 10 → 1.00', app.fattoreDaIntegrita(10), 1.00);
t.quasi('voto 5 → 0.778', app.fattoreDaIntegrita(5), 0.7778, 0.001);
t.quasi('voto 3 → 0.689', app.fattoreDaIntegrita(3), 0.6889, 0.001);
t.eq('voto oltre scala → 1.00', app.fattoreDaIntegrita(99), 1.00);
t.eq('voto nullo → default 10', app.fattoreDaIntegrita(null), 1.00);

// ===========================
t.gruppo('Formula finale');
// ===========================
const dati = app.trovaDatiGruppo('Sanidino', 'Monte Nuovo').datiDB;
const base = app.generaScomposizione('Sanidino', 'Monte Nuovo', 85, dati,
    app.calcolaScore(voti(10))).base;
t.quasi('base di mercato (0.38748 €/g × 85 g)', base, 33.0043, 0.001);

const perfetto = app.calcolaScore(voti(10));
t.quasi('score 10 → base × località × 1.0 × 1.0',
    app.calcolaValoreStimato('Sanidino', 'Monte Nuovo', 85, dati, perfetto),
    base * 1.4, 1e-6);

const mediocre = app.calcolaScore({ ...voti(5), integrita: 5 });
t.quasi('score 5, integrità 5 → base × 1.4 × 0.5 × 0.778',
    app.calcolaValoreStimato('Sanidino', 'Monte Nuovo', 85, dati, mediocre),
    base * 1.4 * mediocre.suDieci * app.fattoreDaIntegrita(5), 1e-6);

// Esempio del documento di passaggio (punta scheggiata → integrità 3)
const scDoc = app.calcolaScore({ cristallinita: 8, estetica: 7, rarita: 6,
    dimensioni: 5, integrita: 3, trasparenza: 7 });
const datiNeutri = { minerale: 'X', localita: 'Cava Fantasia', campioni: dati.campioni, medie: dati.medie };
t.quasi('esempio doc su media 100 e località 1.0 → €43.74',
    app.calcolaValoreStimato('X', 'Cava Fantasia', 1, {
        minerale: 'X', localita: 'Cava Fantasia', campioni: [],
        medie: { catawiki: { mediaPrezzo: 100, mediaPeso: 1, mediaPrezzoGrammo: 100, min: 100, max: 100, n: 1 } }
    }, scDoc),
    100 * 0.635 * app.fattoreDaIntegrita(3), 1e-6);

// ===========================
t.gruppo('Retrocompatibilità (chiamate senza score)');
// ===========================
t.quasi('senza score → formula v0.2.5.1 (21.95 €)',
    app.calcolaValoreStimato('Sanidino', 'Monte Nuovo', 85, dati), 21.9479, 0.01);
t.eq('la legacy vale 0.5 × 0.95',
    app.calcolaValoreStimato('Sanidino', 'Monte Nuovo', 85, dati) / (base * 1.4), 0.475);

// ===========================
t.gruppo('Interazione con il fattore località (v0.2.6)');
// ===========================
const sc = app.calcolaScore({ ...voti(5), integrita: 10 });
const gruppoFranklin = {
    minerale: 'Hardystonite', localita: 'Parker Shaft (Franklin, New Jersey)',
    campioni: dati.campioni, medie: dati.medie
};
const franklin = app.calcolaValoreStimato('Hardystonite', 'Parker Shaft (Franklin, New Jersey)', 50, gruppoFranklin, sc);
const neutro = app.calcolaValoreStimato('Hardystonite', 'Cava Fantasia', 50, gruppoFranklin, sc);
const ignoto = app.calcolaValoreStimato('Hardystonite', 'Sconosciuta', 50, gruppoFranklin, sc);
t.quasi('Franklin / località neutra = 1.6', franklin / neutro, 1.6, 1e-9);
t.quasi('Sconosciuta / Franklin = 0.7/1.6', ignoto / franklin, 0.7 / 1.6, 1e-9);

// ===========================
t.gruppo('Interfaccia: cursori e pannello live');
// ===========================
t.eq('6 cursori nel Valutatore', doc.querySelectorAll('#form-valutatore .scoring-criterio input[type="range"]').length, 6);
t.eq('default cristallinita = 5', $('#score-cristallinita').value, '5');
t.eq('default integrità = 10', $('#score-integrita').value, '10');
t.eq('pannello score iniziale = 5.5', $('#score-valore').textContent, '5.5');
t.eq('pannello fattore integrità iniziale = 1.00', $('#score-fattore-integrita').textContent, '1.00');
t.eq('barra iniziale al 55%', $('#score-barra-riempimento').style.width, '55%');

$('#score-cristallinita').value = '9';
$('#score-cristallinita').dispatchEvent(new w.Event('input', { bubbles: true }));
t.eq('output del criterio aggiornato', $('#score-valore-cristallinita').textContent, '9');
t.eq('score live aggiornato a 6.5', $('#score-valore').textContent, '6.5');
t.eq('barra aggiornata al 65%', $('#score-barra-riempimento').style.width, '65%');

$('#score-integrita').value = '1';
$('#score-integrita').dispatchEvent(new w.Event('input', { bubbles: true }));
t.eq('fattore integrità live = 0.60', $('#score-fattore-integrita').textContent, '0.60');

$('#score-reset').dispatchEvent(new w.Event('click', { bubbles: true }));
t.eq('ripristino: cristallinita = 5', $('#score-cristallinita').value, '5');
t.eq('ripristino: integrità = 10', $('#score-integrita').value, '10');
t.eq('ripristino: score = 5.5', $('#score-valore').textContent, '5.5');
t.eq('ripristino: fattore = 1.00', $('#score-fattore-integrita').textContent, '1.00');

// ===========================
t.gruppo('Valutatore end-to-end con score');
// ===========================
['val-minerale', 'val-localita', 'val-prezzo', 'val-peso'].forEach(id => { $('#' + id).value = ''; });
dialoghi.alert.length = 0;
$('#val-minerale').value = 'Sanidino';
$('#val-localita').value = 'Monte Nuovo';
$('#val-prezzo').value = '30';
$('#val-peso').value = '85';
$('#score-cristallinita').value = '9';
$('#score-cristallinita').dispatchEvent(new w.Event('input', { bubbles: true }));
$('#form-valutatore').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

t.eq('nessun alert', dialoghi.alert.join('|'), '');
const esito = $('#risultato-valutazione').innerHTML;
t.contiene('scomposizione presente', esito, 'Come è calcolato il valore');
t.contiene('riga base di mercato', esito, 'Base di mercato');
t.contiene('riga fattore località', esito, 'Fattore località');
t.contiene('riga score qualità', esito, 'Score qualità');
t.contiene('riga fattore integrità', esito, 'Fattore integrità');
t.contiene('fattore località 1.40 mostrato', esito, '× 1.40');
t.contiene('score 6.5 mostrato', esito, '(6.5/10)');
t.contiene('totale presente', esito, 'scomposizione-riga totale');
const atteso = app.calcolaValoreStimato('Sanidino', 'Monte Nuovo', 85, dati,
    app.calcolaScore({ ...voti(5), cristallinita: 9, integrita: 10 }));
t.eq('valore nel pannello = calcolo atteso',
    Number(esito.match(/Valore stimato:<\/span>\s*<strong>€([\d.,]+)/)[1].replace(',', '.')),
    Number(atteso.toFixed(2)));
t.contiene('raccomandazione ancora presente', esito, 'raccomandazione-');

t.esci();
