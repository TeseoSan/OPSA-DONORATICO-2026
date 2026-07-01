import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const NOMI_RUOLI = {
    CN: "Conduttore",
    OP: "Operatore",
    CE: "Centralino",
    RIS: "Riserva"
};

const mesi = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

// ---------------------------------------------------------------
// 1) Carico turni (per etichette leggibili) e storico
// ---------------------------------------------------------------

const turniSnap = await getDocs(collection(db, "turni"));
const turniById = {};
turniSnap.forEach(d => { turniById[d.id] = d.data(); });

const historySnap = await getDocs(collection(db, "history"));
const eventi = [];
historySnap.forEach(d => eventi.push({ id: d.id, ...d.data() }));

// ---------------------------------------------------------------
// 2) Raggruppo per turno
// ---------------------------------------------------------------

const gruppi = {}; // shiftId -> [eventi]

for (const ev of eventi) {
    if (!gruppi[ev.shiftId]) gruppi[ev.shiftId] = [];
    gruppi[ev.shiftId].push(ev);
}

// ordino gli eventi di ogni gruppo per data/ora crescente
for (const shiftId in gruppi) {
    gruppi[shiftId].sort((a, b) => {
        const ta = a.timestamp ? a.timestamp.toMillis() : 0;
        const tb = b.timestamp ? b.timestamp.toMillis() : 0;
        return ta - tb;
    });
}

// ordino i turni per data (quelli con eventi più recenti prima, o semplicemente
// per data del turno, decrescente = più vicini nel tempo prima)
const shiftIds = Object.keys(gruppi).sort((a, b) => b.localeCompare(a));

// ---------------------------------------------------------------
// 3) Formattazione testo evento
// ---------------------------------------------------------------

function formattaData(ts) {
    if (!ts) return "data sconosciuta";
    const d = ts.toDate();
    const gg = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${gg}/${mm}/${yyyy} ${hh}:${min}`;
}

function descriviEvento(ev) {

    const ruolo = NOMI_RUOLI[ev.ruolo] || ev.ruolo;
    const quando = formattaData(ev.timestamp);

    let testo = "";
    let classe = "";

    switch (ev.azione) {

        case "prenota":
            testo = `${ev.byNome} si è prenotato/a come <b>${ruolo}</b>`;
            classe = "prenota";
            break;

        case "cancella":
            testo = `${ev.byNome} ha rimosso la propria prenotazione come <b>${ruolo}</b>`;
            classe = "cancella";
            break;

        case "admin_cancella":
            testo = `${ev.byNome} (admin) ha rimosso la prenotazione di <b>${ev.targetNome}</b> come <b>${ruolo}</b>`;
            classe = "admin";
            break;

        case "admin_assegna_libero":
            testo = `${ev.byNome} (admin) ha assegnato <b>${ev.targetNome}</b> come <b>${ruolo}</b>`;
            classe = "admin";
            break;

        default:
            testo = `${ev.byNome}: ${ev.azione} - ${ruolo} (${ev.targetNome || ""})`;
    }

    return `<li class="${classe}">${quando} — ${testo}</li>`;
}

// ---------------------------------------------------------------
// 4) Render
// ---------------------------------------------------------------

function etichettaTurno(shiftId) {

    const t = turniById[shiftId];

    if (!t) return shiftId; // turno magari cancellato/rigenerato, mostro l'id grezzo

    const d = new Date(t.data + "T12:00:00");
    const giorno = d.getDate();
    const mese = mesi[d.getMonth()];

    return `${t.giorno} ${giorno} ${mese} - ${t.turno}`;
}

function render(filtroTesto) {

    const filtro = (filtroTesto || "").trim().toLowerCase();

    let html = "";
    let trovatiQuestoFiltro = 0;

    for (const shiftId of shiftIds) {

        const etichetta = etichettaTurno(shiftId);
        const eventiTurno = gruppi[shiftId];

        const testoCompleto = (
            etichetta + " " + eventiTurno.map(e => e.byNome + " " + (e.targetNome || "")).join(" ")
        ).toLowerCase();

        if (filtro && !testoCompleto.includes(filtro)) continue;

        trovatiQuestoFiltro++;

        html += `<h3>${etichetta}</h3><ul>`;
        html += eventiTurno.map(descriviEvento).join("");
        html += `</ul>`;
    }

    if (trovatiQuestoFiltro === 0) {
        html = `<p>Nessun risultato.</p>`;
    }

    document.getElementById("storico").innerHTML = html;
}

document.getElementById("filtro").addEventListener("input", (e) => render(e.target.value));

render("");
