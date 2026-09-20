const { caricaApp } = require('./harness');
const { app } = caricaApp({ fileDemo: true });
const casi = [
  ['Hardystonite', 'Parker Shaft, Franklin Mine, New Jersey, Stati Uniti'],
  ['Clinohedrite', 'Franklin Mine'],
  ['Willemite', 'Franklin, New Jersey'],
  ['Hardystonite', 'Cava Fantasia (non censita)'],
  ['Hardystonite', 'Sconosciuta'],
  ['Sanidino', 'monte nuovo'],
  ['Sanidino', 'Montenuovo'],
  ['Diaspro rosso', 'Egitto'],
  ['Diaspro rosso', 'Madagascar'],
  ['Leucite', 'Solfatara di Pozzuoli'],
  ['Quarzo', 'Alpi'],
];
console.log('minerali / località'.padEnd(62), 'v0.2.5.1', '  →  ', 'v0.2.6');
console.log('-'.repeat(92));
const vecchi = {
  'Hardystonite|Parker Shaft, Franklin Mine, New Jersey, Stati Uniti': 0.85,
  'Clinohedrite|Franklin Mine': 0.85,
  'Willemite|Franklin, New Jersey': 0.85,
  'Hardystonite|Cava Fantasia (non censita)': 0.85,
  'Hardystonite|Sconosciuta': 0.7,
  'Sanidino|monte nuovo': 0.85,
  'Sanidino|Montenuovo': 0.85,
  'Diaspro rosso|Egitto': 0.85,
  'Diaspro rosso|Madagascar': 1.2,
  'Leucite|Solfatara di Pozzuoli': 0.85,
  'Quarzo|Alpi': 1.25,
};
for (const [m, l] of casi) {
  const chiave = m + '|' + l;
  const ora = app.getFattoreLocalita(m, l);
  const prima = vecchi[chiave];
  const delta = ora > prima ? ' ↑' : (ora < prima ? ' ↓' : '  ');
  console.log((m + ' / ' + l).padEnd(62), String(prima).padEnd(6), ' → ', String(ora).padEnd(5), delta);
}
