const { caricaApp } = require('./harness');
const { app } = caricaApp({ fileDemo: true });
const voti = v => ({ cristallinita: v, integrita: v, trasparenza: v, fluorescenza: v, rarita: v, dimensioni: v, iridescenza: v, riflessione: v });
const dati = app.trovaDatiGruppo('Sanidino', 'Monte Nuovo').datiDB;
const sc = app.generaScomposizione('Sanidino', 'Monte Nuovo', 85, dati, app.calcolaScore({ ...voti(5), integrita: 10 }));
console.log('Sanidino / Monte Nuovo — 85 g, prezzo chiesto €30');
console.log('  base di mercato      :', sc.perGrammo ? `€${sc.mediaUnitaria.toFixed(4)}/g × 85 g = €${sc.base.toFixed(2)}` : 'n/d');
console.log('  fattore località     : ×', sc.fattoreLocalita.toFixed(2));
console.log();
const casi = [
  ['v0.2.6 (legacy 0.5 × 0.95)', null],
  ['Phase 5 default (score 5.75, integrità 10)', { ...voti(5), integrita: 10 }],
  ['pezzo eccezionale (tutti 9, integrità 10)', { ...voti(9), integrita: 10 }],
  ['pezzo perfetto (tutti 10)', voti(10)],
  ['punta scheggiata (crist 8, int 3, tras 7, fluor 6, rar 6, dim 5, irid 7, rifless 4)', { cristallinita: 8, integrita: 3, trasparenza: 7, fluorescenza: 6, rarita: 6, dimensioni: 5, iridescenza: 7, riflessione: 4 }],
  ['rottame (tutti 2)', voti(2)],
];
for (const [etichetta, v] of casi) {
  const score = v ? app.calcolaScore(v) : null;
  const val = app.calcolaValoreStimato('Sanidino', 'Monte Nuovo', 85, dati, score);
  const pct = 30 / val * 100;
  console.log('  ' + etichetta.padEnd(58), '€' + val.toFixed(2).padStart(7), '| €30 = ' + pct.toFixed(0).padStart(3) + '% → ' + app.generaRaccomandazione(pct).testo);
}
