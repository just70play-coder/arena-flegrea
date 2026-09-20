// ===========================
// TEST v0.2.5.1 / v0.2.6 — FATTORI LOCALITÀ PER MINERALE (19 asserzioni)
// Copre il fix v0.2.5.1 (chiavi minuscole) e il motore v0.2.6 delle LOCALITÀ
// CANONICHE: alias, corrispondenza case-insensitive, giacimenti tipici
// (es. Parker Shaft / Franklin Mine per hardystonite, clinohedrite e willemite),
// minerale dominante nelle associazioni, fallback neutro 1.0.
// ===========================

const { caricaApp, creaRunner } = require('./harness');

const t = creaRunner('test-v0251.js');
const { app } = caricaApp({ fileDemo: true });

// ===========================
t.gruppo('Fattori specifici per minerale (retaggio v0.2.5.1)');
// ===========================
t.eq('Sanidino/Monte Nuovo = 1.4', app.getFattoreLocalita('Sanidino', 'Monte Nuovo'), 1.4);
t.eq('Sanidino/Solfatara = 1.5', app.getFattoreLocalita('Sanidino', 'Solfatara'), 1.5);
t.eq('Sanidino/Pisciarelli = 1.6', app.getFattoreLocalita('Sanidino', 'Pisciarelli'), 1.6);
t.eq('Sanidino/Vesuvio = 1.2', app.getFattoreLocalita('Sanidino', 'Vesuvio'), 1.2);
t.eq('Diaspro rosso/Egitto = 1.3', app.getFattoreLocalita('Diaspro rosso', 'Egitto'), 1.3);
t.eq('Diaspro rosso/Madagascar = 1.2', app.getFattoreLocalita('Diaspro rosso', 'Madagascar'), 1.2);
t.eq('Diaspro rosso/Australia = 1.15', app.getFattoreLocalita('Diaspro rosso', 'Australia'), 1.15);
t.eq('Diaspro rosso/Brasile = 1.0', app.getFattoreLocalita('Diaspro rosso', 'Brasile'), 1.0);
t.eq('Quarzo/Alpi = 1.25', app.getFattoreLocalita('Quarzo', 'Alpi'), 1.25);
t.eq('Quarzo/Brasile = 1.15', app.getFattoreLocalita('Quarzo', 'Brasile'), 1.15);
t.eq('Quarzo/Madagascar = 1.1', app.getFattoreLocalita('Quarzo', 'Madagascar'), 1.1);

// ===========================
t.gruppo('Giacimenti tipici: Parker Shaft, Franklin Mine');
// ===========================
const FRANKLIN = 'Parker Shaft, Franklin Mine, New Jersey, Stati Uniti';
t.eq('Hardystonite/Parker Shaft = 1.6 (località tipo)', app.getFattoreLocalita('Hardystonite', 'Parker Shaft'), 1.6);
t.eq('Hardystonite/intera dicitura Franklin = 1.6', app.getFattoreLocalita('Hardystonite', FRANKLIN), 1.6);
t.eq('Clinohedrite/Franklin Mine = 1.6', app.getFattoreLocalita('Clinohedrite', 'Franklin Mine'), 1.6);
t.eq('Willemite/Franklin, New Jersey = 1.5', app.getFattoreLocalita('Willemite', 'Franklin, New Jersey'), 1.5);
t.eq('Minerale non tipico di Franklin → neutro 1.0', app.getFattoreLocalita('Ametista', 'Parker Shaft'), 1.0);

// ===========================
t.gruppo('Corrispondenza case-insensitive e varianti');
// ===========================
t.eq('minerale minuscolo', app.getFattoreLocalita('sanidino', 'Monte Nuovo'), 1.4);
t.eq('località minuscola', app.getFattoreLocalita('Sanidino', 'monte nuovo'), 1.4);
t.eq('variante "Montenuovo"', app.getFattoreLocalita('Sanidino', 'Montenuovo'), 1.4);
t.eq('variante "Solfatara di Pozzuoli"', app.getFattoreLocalita('Sanidino', 'Solfatara di Pozzuoli'), 1.5);

// ===========================
t.gruppo('Associazioni multiminerali → minerale dominante');
// ===========================
t.eq('dominante estratto da "A, B e C"',
    app.estraiMineraleDominante('Hardystonite, Clinohedrite e Willemite'), 'Hardystonite');
t.eq('fattore calcolato sul dominante (1.6, non 1.0)',
    app.getFattoreLocalita('Hardystonite, Clinohedrite e Willemite', FRANKLIN), 1.6);

// ===========================
t.gruppo('Fallback');
// ===========================
t.eq('località non censita → neutro 1.0', app.getFattoreLocalita('Zirconio', 'Cava Fantasia'), 1.0);
t.eq('Sconosciuta → 0.7', app.getFattoreLocalita('Sanidino', 'Sconosciuta'), 0.7);
t.eq('variante "provenienza sconosciuta" → 0.7',
    app.getFattoreLocalita('Sanidino', 'provenienza sconosciuta'), 0.7);
t.eq('Leucite/Monte Nuovo usa il fallback generico 1.4',
    app.getFattoreLocalita('Leucite', 'Monte Nuovo'), 1.4);

// ===========================
t.gruppo('Canonicalizzazione');
// ===========================
t.eq('normalizzaLocalita → forma canonica',
    app.normalizzaLocalita('franklin mine'), 'Parker Shaft (Franklin, New Jersey)');
t.eq('località sconosciuta resta se stessa',
    app.normalizzaLocalita('Cava Fantasia'), 'Cava Fantasia');

t.esci();
