// ===========================
// PULVISCOLO STELLARE — VERIFICA SINTETICA "BROWSER" (v0.2.10)
// jsdom non ha canvas 2D: qui i guard vengono SBLUCCATI simulando un browser
// reale (CanvasRenderingContext2D + requestAnimationFrame + matchMedia) e si
// pompano ~6 secondi di frame a mano, con un contesto finto che registra i
// comandi di disegno. Verifica che il pulviscolo venga disegnato, che le
// METEORE siano state rimosse (zero gradienti/stroke), che il resize funzioni
// e che i guard proteggano jsdom e prefers-reduced-motion.
// Verifica anche che il CICLO NOTTE-GIORNO (v0.2.10) parta nel browser
// simulato: il sole deve essere posizionato e visibile, i colori aggiornati.
// Script laterale: NON fa parte di run-tests.js.
// ===========================

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(APP, 'script.js'), 'utf8');

let verifiche = 0;
let fallite = 0;
function controlla(nome, cond, dettagli = '') {
    verifiche++;
    if (cond) {
        console.log('  ✓ ' + nome);
    } else {
        fallite++;
        console.log('  ✗ ' + nome + (dettagli ? ' — ' + dettagli : ''));
    }
}

function contestoFinto() {
    const chiamate = { arc: 0, fill: 0, stroke: 0, gradienti: 0, clearRect: 0, setTransform: 0 };
    const grad = { addColorStop: () => { chiamate.gradienti++; } };
    const rec = {
        chiamate,
        setTransform: () => { chiamate.setTransform++; },
        clearRect: () => { chiamate.clearRect++; },
        beginPath: () => {},
        arc: () => { chiamate.arc++; },
        fill: () => { chiamate.fill++; },
        stroke: () => { chiamate.stroke++; },
        moveTo: () => {},
        lineTo: () => {},
        createLinearGradient: () => grad,
        shadowColor: '', fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: ''
    };
    let maxBlur = 0;
    Object.defineProperty(rec, 'shadowBlur', {
        set: (v) => { maxBlur = Math.max(maxBlur, Number(v) || 0); },
        get: () => maxBlur
    });
    rec.maxBlur = () => maxBlur;
    return rec;
}

function carica(stubs) {
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
    const w = dom.window;
    const canvas = w.document.getElementById('cielo-flegrea');
    if (stubs.ctx) canvas.getContext = () => stubs.ctx;
    if (stubs.browser) {
        w.CanvasRenderingContext2D = function () {};
        w.matchMedia = (q) => ({ matches: false, media: q });
        let inCoda = [];
        w.requestAnimationFrame = (cb) => { inCoda.push(cb); return inCoda.length; };
        w.__pompa = (n, dtMs) => {
            let t = 1000;
            for (let i = 0; i < n; i++) {
                const coda = inCoda;
                inCoda = [];
                t += dtMs;
                for (const cb of coda) cb(t);
            }
        };
    }
    if (stubs.ridotto) w.matchMedia = (q) => ({ matches: true, media: q });
    w.console.log = () => {};
    w.console.warn = () => {};
    w.eval(script);
    w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
    return { w, canvas };
}

console.log('\n[1] Browser reale simulato: pulviscolo e ciclo si accendono');
const registratore = contestoFinto();
const { w, canvas } = carica({ browser: true, ctx: registratore });
controlla('canvas #cielo-flegrea presente nel DOM', !!canvas);
controlla('canvas ridimensionato dal JS', canvas.width === 1024, 'width=' + canvas.width);
w.__pompa(360, 16.7); // ~6 secondi a 60 fps
const c = canvas.getContext('2d');
controlla('contesto unico condiviso con l\'app', c === registratore);
controlla('clearRect eseguito a ogni frame (>300)', c.chiamate.clearRect > 300, String(c.chiamate.clearRect));
controlla('granelli disegnati (centinaia di arc)', c.chiamate.arc > 1000, String(c.chiamate.arc));
controlla('nessuna meteora: zero scie a gradiente', c.chiamate.gradienti === 0, String(c.chiamate.gradienti));
controlla('nessuna scia tracciata: zero stroke', c.chiamate.stroke === 0, String(c.chiamate.stroke));
controlla('glow del pulviscolo (shadowBlur > 0 nel disegno)', c.maxBlur() > 0, 'max=' + c.maxBlur());

const sole = w.document.getElementById('corpo-sole');
const luna = w.document.getElementById('corpo-luna');
controlla('elemento sole presente', !!sole);
controlla('elemento luna presente', !!luna);
const opSole = parseFloat(sole.getAttribute('opacity'));
const traSole = sole.getAttribute('transform') || '';
controlla('sole posizionato e visibile in qualche fase', opSole > 0 || /translate/.test(traSole), 'op=' + opSole);
controlla('luna riceve il proprio turno (opacity impostata)', luna.getAttribute('opacity') !== null);
const sfondo = w.document.documentElement.style.getPropertyValue('--background');
controlla('il ciclo aggiorna il colore del cielo (--background)', /rgb\(/.test(sfondo), sfondo);
const stopA = w.document.getElementById('stop-vesuvio-a').getAttribute('stop-color');
controlla('il ciclo aggiorna la silhouette del Vesuvio', /rgb\(/.test(stopA), stopA);

w.innerWidth = 800;
w.dispatchEvent(new w.Event('resize'));
controlla('resize: canvas aggiornato a 800', canvas.width === 800, 'width=' + canvas.width);

console.log('\n[2] prefers-reduced-motion: tutto resta spento');
const r2 = carica({ browser: true, ridotto: true });
controlla('canvas NON ridimensionato (guard attivo)', r2.canvas.width === 300, 'width=' + r2.canvas.width);
const soleR = r2.w.document.getElementById('corpo-sole');
controlla('sole non posizionato (ciclo fermo)', !(soleR.getAttribute('transform') || '').includes('translate'), soleR.getAttribute('transform'));

console.log('\n[3] jsdom puro (canvas assente): nessun errore');
let errore = null;
try { carica({}); } catch (e) { errore = e; }
controlla('inizializzazione senza eccezioni', errore === null, errore && errore.message);

console.log('\n=== CIELO: ' + (verifiche - fallite) + '/' + verifiche + ' verdi ===');
process.exit(fallite === 0 ? 0 : 1);
