// Stress test: 300 gruppi / 1500 campioni — la scala annunciata da Fabio
const { caricaApp } = require('./harness');

const MERCATI = ['catawiki', 'ebay', 'etsy', 'heritage', 'dealer'];
const BASI = ['Minerale', 'Cristallo', 'Pietra', 'Gemma', 'Vena'];
const SITI = ['Sito A', 'Sito B', 'Sito C', 'Sito D', 'Sito E'];

const db = {};
let n = 0;
for (let i = 1; i <= 300; i++) {
    const minerale = BASI[i % 5] + ' ' + i;
    const localita = SITI[i % 5] + ' ' + i;
    const campioni = [];
    for (let j = 0; j < 5; j++) {
        const prezzo = 10 + ((i * 7 + j * 13) % 200);
        const peso = 5 + ((i + j) % 50);
        campioni.push({
            prezzo, peso, prezzogrammo: prezzo / peso,
            mercato: MERCATI[(i + j) % 5], data: '2025-0' + (1 + j % 9) + '-15',
            note: 'nota di prova', dimensioni: '', link: ''
        });
        n++;
    }
    db[minerale.toLowerCase().replace(/ /g, '_') + '_' + localita.toLowerCase().replace(/ /g, '_')] = {
        minerale, localita, campioni, medie: {}
    };
}

console.log('Database sintetico:', Object.keys(db).length, 'gruppi,', n, 'campioni');
const { window: w, document: doc, app } = caricaApp({ database: db });

let t0 = Date.now();
app.filtraDatabase();
let t1 = Date.now();
const cardMostrate = doc.querySelectorAll('#database-list .database-card').length;
const pagine = doc.querySelector('#db-paginazione') ? doc.querySelector('#db-paginazione').textContent.match(/Pagina (\d+) di (\d+)/)[0] : 'n/d';
console.log('filtraDatabase (300 gruppi):', (t1 - t0) + 'ms | card nel DOM:', cardMostrate, '| barra:', pagine);

t0 = Date.now();
app.popolaFiltri();
t1 = Date.now();
const vociPopover = doc.querySelectorAll('#pl-minerali .filter-checkbox').length;
const troncamento = doc.querySelector('#pl-minerali .filter-truncate');
console.log('popolaFiltri (300 minerali):', (t1 - t0) + 'ms | checkbox renderizzate:', vociPopover, '|', troncamento ? troncamento.textContent : 'nessun troncamento');

t0 = Date.now();
app.cercaNelPopover('minerali', 'minerale 2');
t1 = Date.now();
console.log('cercaNelPopover "minerale 2":', (t1 - t0) + 'ms | risultati:', doc.querySelectorAll('#pl-minerali .filter-checkbox').length);

const primaChiave = Object.keys(db)[0];
t0 = Date.now();
app.mostraDettagliMinerale(primaChiave);
t1 = Date.now();
const campioniNelModal = doc.querySelectorAll('#campioni-lista .campione-card').length;
console.log('modal dettagli (5 campioni):', (t1 - t0) + 'ms | card nel DOM:', campioniNelModal);

// gruppo con molti campioni: 200 campioni in un solo gruppo
const dbGrande = JSON.parse(JSON.stringify(db));
dbGrande[primaChiave].campioni = [];
for (let j = 0; j < 200; j++) {
    const prezzo = 10 + j, peso = 5 + (j % 50);
    dbGrande[primaChiave].campioni.push({ prezzo, peso, prezzogrammo: prezzo / peso, mercato: MERCATI[j % 5], data: '2025-01-15' });
}
const { window: w2, document: doc2, app: app2 } = caricaApp({ database: dbGrande });
t0 = Date.now();
app2.mostraDettagliMinerale(primaChiave);
t1 = Date.now();
const nelModal2 = doc2.querySelectorAll('#campioni-lista .campione-card').length;
const barre2 = doc2.querySelector('#campioni-paginazione .paginazione');
app2.vaiAPagina('modal', 10);
const dopoPagina = doc2.querySelectorAll('#campioni-lista .campione-card').length;
console.log('modal con 200 campioni:', (t1 - t0) + 'ms | card nel DOM:', nelModal2, '|', barre2 ? barre2.textContent.replace(/\s+/g, ' ').trim() : 'no barra');
console.log('salto a pagina 10: card nel DOM:', dopoPagina, '| primo idx visibile:',
    (doc2.querySelector('#campioni-lista .campione-actions .btn-edit').getAttribute('onclick').match(/,\s*(\d+)\)/) || [])[1]);
console.log('console.error totali:', (w.__errori || 0));
