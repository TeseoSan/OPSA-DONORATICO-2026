import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    getDocs,
    collection,
    runTransaction,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ---------------------------------------------------------------
// 1) Recupero utente da link personale (?u=ID)
// ---------------------------------------------------------------

const params = new URLSearchParams(window.location.search);
const userId = params.get("u");

if (!userId) {
    document.body.innerHTML = "<h2>Link non valido: manca l'utente.</h2>";
    throw "Utente mancante";
}

const userSnap = await getDoc(doc(db, "users", userId));

if (!userSnap.exists()) {
    document.body.innerHTML = "<h2>Utente non trovato. Controlla il link.</h2>";
    throw "Utente inesistente";
}

const utente = userSnap.data();
utente.id = userId;

document.getElementById("utente").innerHTML = `
    <h2>Ciao, ${utente.displayName}</h2>
    ${utente.isAdmin ? "<p><b>(accesso amministratore)</b></p>" : ""}
`;

// ---------------------------------------------------------------
// 2) Caricamento turni
// ---------------------------------------------------------------

const turniSnap = await getDocs(collection(db, "turni"));

let turni = [];
turniSnap.forEach(d => turni.push({ id: d.id, ...d.data() }));

turni.sort((a, b) => {
    if (a.data === b.data) return a.turno.localeCompare(b.turno);
    return a.data.localeCompare(b.data);
});

const mesi = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const NOMI_RUOLI = {
    CN: "Conduttore",
    OP: "Operatore",
    CE: "Centralino",
    RIS: "Riserva"
};

// ---------------------------------------------------------------
// 3) Render
// ---------------------------------------------------------------

function render() {

    let html = "";

    for (const turno of turni) {

        const data = new Date(turno.data + "T12:00:00");
        const giorno = data.getDate();
        const mese = mesi[data.getMonth()];

        html += `<hr><h3>${turno.giorno} ${giorno} ${mese} - ${turno.turno}</h3><div>`;

        // CN e OP: slot singolo
        html += renderSlotSingolo(turno, "CN");
        html += renderSlotSingolo(turno, "OP");

        // CE e RIS: slot multipli
        html += renderSlotMultiplo(turno, "CE");
        html += renderSlotMultiplo(turno, "RIS");

        html += `</div>`;
    }

    document.getElementById("turni").innerHTML = html;
}

function utenteOccupaGiaTurno(turno, esclusoRuolo) {
    // ritorna true se l'utente loggato occupa già un'altra posizione in questo turno
    if (turno.CN && turno.CN.id === userId && esclusoRuolo !== "CN") return true;
    if (turno.OP && turno.OP.id === userId && esclusoRuolo !== "OP") return true;
    if (turno.CE.some(x => x.id === userId) && esclusoRuolo !== "CE") return true;
    if (turno.RIS.some(x => x.id === userId) && esclusoRuolo !== "RIS") return true;
    return false;
}

function renderSlotSingolo(turno, ruolo) {

    const occupante = turno[ruolo]; // {id, nome} oppure null
    const nomeRuolo = NOMI_RUOLI[ruolo];

    let html = `<br><b>${nomeRuolo.toUpperCase()}</b><br>`;

    if (occupante) {

        html += `<b>${occupante.nome}</b> `;

        const puoCancellare = occupante.id === userId || utente.isAdmin;

        if (puoCancellare) {
            html += `<button data-action="cancella" data-shift="${turno.id}" data-ruolo="${ruolo}" data-target="${occupante.id}">rimuovi prenotazione</button>`;
        }

    } else {

        const abilitato = utente.qualifiche && utente.qualifiche[ruolo];
        const giaOccupato = utenteOccupaGiaTurno(turno, ruolo);

        html += `Disponibile `;

        if (abilitato && !giaOccupato) {
            html += `<button data-action="prenota" data-shift="${turno.id}" data-ruolo="${ruolo}">prenotati</button>`;
        } else if (!abilitato) {
            html += `<i>(non abilitato)</i>`;
        } else if (giaOccupato) {
            html += `<i>(hai già un'altra posizione in questo turno)</i>`;
        }
    }

    if (utente.isAdmin) {
        html += renderInputAdmin(turno, ruolo);
    }

    return html + "<br>";
}

function renderSlotMultiplo(turno, ruolo) {

    const lista = turno[ruolo] || []; // array di {id, nome}
    const nomeRuolo = NOMI_RUOLI[ruolo];

    let html = `<br><b>${nomeRuolo.toUpperCase()}</b><br>`;

    if (lista.length) {
        for (const occupante of lista) {
            const puoCancellare = occupante.id === userId || utente.isAdmin;
            html += `<b>${occupante.nome}</b> `;
            if (puoCancellare) {
                html += `<button data-action="cancella" data-shift="${turno.id}" data-ruolo="${ruolo}" data-target="${occupante.id}">rimuovi prenotazione</button>`;
            }
            html += `<br>`;
        }
    } else {
        html += `Nessuno<br>`;
    }

    const abilitato = utente.qualifiche && utente.qualifiche[ruolo];
    const giaPresente = lista.some(x => x.id === userId);
    const giaOccupatoAltrove = utenteOccupaGiaTurno(turno, ruolo);

    if (abilitato && !giaPresente && !giaOccupatoAltrove) {
        html += `<button data-action="prenota" data-shift="${turno.id}" data-ruolo="${ruolo}">prenotati</button><br>`;
    } else if (!abilitato) {
        html += `<i>(non abilitato)</i><br>`;
    } else if (giaOccupatoAltrove && !giaPresente) {
        html += `<i>(hai già un'altra posizione in questo turno)</i><br>`;
    }

    if (utente.isAdmin) {
        html += renderInputAdmin(turno, ruolo);
    }

    return html;
}

function renderInputAdmin(turno, ruolo) {
    return `
        <span style="background:#ffe;border:1px solid #cc0;padding:4px;display:inline-block;margin:2px 0;">
            ADMIN:
            <input type="text" placeholder="nome e cognome" style="width:160px"
                   data-admin-input="${turno.id}|${ruolo}">
            <button data-action="assegna" data-shift="${turno.id}" data-ruolo="${ruolo}">assegna</button>
        </span><br>
    `;
}

// ---------------------------------------------------------------
// 4) Azioni: prenota / cancella / assegna (admin)
// ---------------------------------------------------------------

async function scriviStorico(record) {
    await addDoc(collection(db, "history"), {
        ...record,
        timestamp: serverTimestamp()
    });
}

async function prenota(shiftId, ruolo, targetUser) {

    const shiftRef = doc(db, "turni", shiftId);

    try {

        await runTransaction(db, async (tx) => {

            const snap = await tx.get(shiftRef);
            if (!snap.exists()) throw "Turno non trovato";

            const t = snap.data();

            // controllo: il target non deve già occupare un'altra posizione in questo turno
            const giaOccupato =
                (t.CN && t.CN.id === targetUser.id) ||
                (t.OP && t.OP.id === targetUser.id) ||
                (t.CE || []).some(x => x.id === targetUser.id) ||
                (t.RIS || []).some(x => x.id === targetUser.id);

            if (giaOccupato) throw "Questa persona occupa già una posizione in questo turno.";

            if (ruolo === "CN" || ruolo === "OP") {
                if (t[ruolo]) throw "Posizione già occupata, ricarica la pagina.";
                tx.update(shiftRef, { [ruolo]: { id: targetUser.id, nome: targetUser.displayName } });
            } else {
                const lista = t[ruolo] || [];
                if (lista.some(x => x.id === targetUser.id)) throw "Già presente.";
                tx.update(shiftRef, { [ruolo]: [...lista, { id: targetUser.id, nome: targetUser.displayName }] });
            }
        });

        await scriviStorico({
            shiftId, ruolo,
            azione: "prenota",
            byUserId: userId,
            byNome: utente.displayName,
            targetUserId: targetUser.id,
            targetNome: targetUser.displayName
        });

        location.reload();

    } catch (e) {
        alert("Errore: " + e);
    }
}

async function cancella(shiftId, ruolo, targetUserId) {

    if (targetUserId !== userId && !utente.isAdmin) {
        alert("Non puoi cancellare la prenotazione di un altro utente.");
        return;
    }

    const shiftRef = doc(db, "turni", shiftId);
    let nomeRimosso = "";

    try {

        await runTransaction(db, async (tx) => {

            const snap = await tx.get(shiftRef);
            if (!snap.exists()) throw "Turno non trovato";

            const t = snap.data();

            if (ruolo === "CN" || ruolo === "OP") {
                if (!t[ruolo] || t[ruolo].id !== targetUserId) throw "Prenotazione non trovata.";
                nomeRimosso = t[ruolo].nome;
                tx.update(shiftRef, { [ruolo]: null });
            } else {
                const lista = t[ruolo] || [];
                const trovato = lista.find(x => x.id === targetUserId);
                if (!trovato) throw "Prenotazione non trovata.";
                nomeRimosso = trovato.nome;
                tx.update(shiftRef, { [ruolo]: lista.filter(x => x.id !== targetUserId) });
            }
        });

        await scriviStorico({
            shiftId, ruolo,
            azione: utente.isAdmin && targetUserId !== userId ? "admin_cancella" : "cancella",
            byUserId: userId,
            byNome: utente.displayName,
            targetUserId,
            targetNome: nomeRimosso
        });

        location.reload();

    } catch (e) {
        alert("Errore: " + e);
    }
}

async function adminAssegnaLibero(shiftId, ruolo, nomeLibero) {

    const shiftRef = doc(db, "turni", shiftId);

    // id "finto" per le persone inserite a mano dall'admin (non hanno un
    // account/link proprio). Serve solo per poter poi cancellarle.
    const idManuale = "manual_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

    try {

        await runTransaction(db, async (tx) => {

            const snap = await tx.get(shiftRef);
            if (!snap.exists()) throw "Turno non trovato";

            if (ruolo === "CN" || ruolo === "OP") {
                // l'admin può sovrascrivere anche una posizione già occupata
                tx.update(shiftRef, { [ruolo]: { id: idManuale, nome: nomeLibero } });
            } else {
                const t = snap.data();
                const lista = t[ruolo] || [];
                tx.update(shiftRef, { [ruolo]: [...lista, { id: idManuale, nome: nomeLibero }] });
            }
        });

        await scriviStorico({
            shiftId, ruolo,
            azione: "admin_assegna_libero",
            byUserId: userId,
            byNome: utente.displayName,
            targetUserId: idManuale,
            targetNome: nomeLibero
        });

        location.reload();

    } catch (e) {
        alert("Errore: " + e);
    }
}

// ---------------------------------------------------------------
// 5) Listener (delegazione eventi, niente onclick inline)
// ---------------------------------------------------------------

document.getElementById("turni").addEventListener("click", (ev) => {

    const btn = ev.target.closest("button");
    if (!btn) return;

    const azione = btn.dataset.action;
    const shiftId = btn.dataset.shift;
    const ruolo = btn.dataset.ruolo;

    if (azione === "prenota") {
        prenota(shiftId, ruolo, { id: userId, displayName: utente.displayName });
    }

    if (azione === "cancella") {
        cancella(shiftId, ruolo, btn.dataset.target);
    }

    if (azione === "assegna") {
        const input = document.querySelector(`input[data-admin-input="${shiftId}|${ruolo}"]`);
        const nome = input.value.trim();
        if (!nome) { alert("Scrivi un nome."); return; }
        adminAssegnaLibero(shiftId, ruolo, nome);
    }
});

render();