// Esegue tutte le suite e stampa il totale complessivo
const { execFileSync } = require('child_process');
const suites = ['test-phase4.js', 'test-v025.js', 'test-v0251.js', 'test-v026-localita.js', 'test-phase5.js', 'test-v028-scala.js'];
let verdi = 0, totale = 0, fallite = [];
for (const s of suites) {
    try {
        const out = execFileSync('node', [s], { encoding: 'utf8' });
        process.stdout.write(out);
    } catch (e) {
        process.stdout.write(e.stdout || '');
        fallite.push(s);
    }
    const m = (process.stdout.write ? null : null);
}
// rilegge i conteggi
let testo = '';
for (const s of suites) {
    try { testo += execFileSync('node', [s], { encoding: 'utf8' }); }
    catch (e) { testo += e.stdout || ''; }
}
const righe = testo.match(/=== \S+: (\d+)\/(\d+) verdi ===/g) || [];
righe.forEach(r => { const [, v, t] = r.match(/(\d+)\/(\d+)/); verdi += +v; totale += +t; });
console.log(`\n############ TOTALE: ${verdi}/${totale} verdi ${fallite.length ? '(suite fallite: ' + fallite.join(', ') + ')' : ''} ############`);
process.exit(fallite.length ? 1 : 0);
