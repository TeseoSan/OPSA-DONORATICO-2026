import nodemailer from "nodemailer";

const PROJECT_ID = "opsa-donoratico-2026";

const NOMI_RUOLI = { CN: "Conduttore", OP: "Operatore" };

// ---------------------------------------------------------------
// 1) Calcolo prossimo sabato e domenica (fuso orario Europe/Rome)
// ---------------------------------------------------------------

function oggiInRoma() {
    const ora = new Date();
    const stringaRoma = ora.toLocaleString("en-US", { timeZone: "Europe/Rome" });
    return new Date(stringaRoma);
}

function formattaISO(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

const oggi = oggiInRoma();

const giorniAlSabato = (6 - oggi.getDay() + 7) % 7 || 7; // se oggi fosse già sabato, prendi il prossimo
const sabato = new Date(oggi);
sabato.setDate(oggi.getDate() + giorniAlSabato);

const domenica = new Date(sabato);
domenica.setDate(sabato.getDate() + 1);

const dataSabato = formattaISO(sabato);
const dataDomenica = formattaISO(domenica);

console.log(`Controllo turni per Sabato ${dataSabato} e Domenica ${dataDomenica}`);

// ---------------------------------------------------------------
// 2) Lettura turni da Firestore REST API (nessuna autenticazione necessaria)
// ---------------------------------------------------------------

async function leggiTurno(docId) {

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/turni/${docId}`;

    const res = await fetch(url);

    if (!res.ok) {
        console.log(`Turno ${docId} non trovato (status ${res.status})`);
        return null;
    }

    const data = await res.json();
    return data.fields || {};
}

function campoOccupato(fields, ruolo) {
    const campo = fields[ruolo];
    if (!campo) return false;
    if (campo.nullValue !== undefined) return false;
    return true; // è un mapValue con dentro id/nome => occupato
}

async function controllaTurno(docId, etichetta) {

    const fields = await leggiTurno(docId);
    if (!fields) return null;

    const mancanti = [];

    for (const ruolo of ["CN", "OP"]) {
        if (!campoOccupato(fields, ruolo)) {
            mancanti.push(NOMI_RUOLI[ruolo]);
        }
    }

    return { etichetta, mancanti };
}

const turniDaControllare = [
    { id: `${dataSabato}_Mattina`, etichetta: `Sabato ${dataSabato} - Mattina` },
    { id: `${dataSabato}_Pomeriggio`, etichetta: `Sabato ${dataSabato} - Pomeriggio` },
    { id: `${dataDomenica}_Mattina`, etichetta: `Domenica ${dataDomenica} - Mattina` },
    { id: `${dataDomenica}_Pomeriggio`, etichetta: `Domenica ${dataDomenica} - Pomeriggio` }
];

const risultati = [];

for (const t of turniDaControllare) {
    const r = await controllaTurno(t.id, t.etichetta);
    if (r && r.mancanti.length) {
        risultati.push(r);
    }
}

// ---------------------------------------------------------------
// 3) Invio mail solo se c'è qualcosa di incompleto
// ---------------------------------------------------------------

if (risultati.length === 0) {
    console.log("Tutti i turni del weekend sono completi. Nessuna mail inviata.");
    process.exit(0);
}

const corpo = risultati
    .map(r => `- ${r.etichetta}: manca ${r.mancanti.join(" e ")}`)
    .join("\n");

const testoMail = `
Promemoria turni OPSA Donoratico

Per il prossimo weekend ci sono ancora posizioni scoperte:

${corpo}

Controlla il recap completo qui:
https://teseosan.github.io/OPSA-DONORATICO-2026/recap.html
`;

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.RECIPIENT_EMAIL,
    subject: `⚠️ Turni scoperti per il weekend del ${dataSabato}`,
    text: testoMail
});

console.log("Mail di avviso inviata.");
