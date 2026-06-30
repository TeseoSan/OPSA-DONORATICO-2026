import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const bottone = document.getElementById("importa");

bottone.addEventListener("click", importaUtenti);

async function importaUtenti() {

    const output = document.getElementById("output");

    output.innerHTML = "<h3>Importazione...</h3>";

    const response = await fetch("./data/users.json");
    const utenti = await response.json();

    let html = "<table border='1' cellpadding='5'>";
    html += "<tr><th>Nome</th><th>ID</th><th>Link</th></tr>";

    for (const utente of utenti) {

        utente.createdAt = serverTimestamp();

        const docRef = await addDoc(
            collection(db, "users"),
            utente
        );

        const link = `${window.location.origin}${window.location.pathname.replace("setup.html","index.html")}?u=${docRef.id}`;

        html += `
        <tr>
            <td>${utente.displayName}</td>
            <td>${docRef.id}</td>
            <td>
                <input style="width:450px" value="${link}" readonly>
            </td>
        </tr>
        `;
    }

    html += "</table>";

    output.innerHTML = html;
}

document
    .getElementById("generaTurni")
    .addEventListener("click", generaTurni);

async function generaTurni() {

    const output = document.getElementById("output");

    output.innerHTML = "<h3>Generazione turni...</h3>";

    const giorni = [];

    const giorniSettimana = [
        "Domenica",
        "Lunedì",
        "Martedì",
        "Mercoledì",
        "Giovedì",
        "Venerdì",
        "Sabato"
    ];

    function aggiungiData(anno, mese, giorno) {

        const data = new Date(anno, mese - 1, giorno);

        const yyyy = data.getFullYear();
        const mm = String(data.getMonth() + 1).padStart(2, "0");
        const dd = String(data.getDate()).padStart(2, "0");

        const dataISO = `${yyyy}-${mm}-${dd}`;

        if (!giorni.find(g => g.data === dataISO)) {

            giorni.push({
                data: dataISO,
                giorno: giorniSettimana[data.getDay()]
            });

        }

    }

    // Tutti i sabati e domeniche
    let data = new Date(2026, 5, 27); // 27 giugno 2026

    const fine = new Date(2026, 8, 27); // 27 settembre 2026

    while (data <= fine) {

        if (data.getDay() === 6 || data.getDay() === 0) {

            aggiungiData(
                data.getFullYear(),
                data.getMonth() + 1,
                data.getDate()
            );

        }

        data.setDate(data.getDate() + 1);

    }

    // Settimana di Ferragosto
    for (let giorno = 10; giorno <= 16; giorno++) {

        aggiungiData(2026, 8, giorno);

    }

    giorni.sort((a, b) => a.data.localeCompare(b.data));

    let creati = 0;

    for (const g of giorni) {

        for (const turno of ["Mattina", "Pomeriggio"]) {

            await setDoc(
                doc(db, "turni", `${g.data}_${turno}`),
                {

                    data: g.data,

                    giorno: g.giorno,

                    turno,

                    CN: null,
                    OP: null,

                    CE: [],
                    RIS: [],

                    note: "",

                    lastModifiedBy: null,
                    lastUpdate: serverTimestamp()

                }
            );

            creati++;

        }

    }

    output.innerHTML = `
        <h2>✅ Turni creati</h2>
        <p>${creati} documenti.</p>
    `;



    output.innerHTML = `
        <h2>✅ Turni creati</h2>
        <p>Documenti creati: ${creati}</p>
    `;

}