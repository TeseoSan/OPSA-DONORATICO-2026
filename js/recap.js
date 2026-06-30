import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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

function nomi(lista) {
    if (!lista || !lista.length) return `<span class="vuoto">nessuno</span>`;
    return lista.map(x => x.nome).join("<br>");
}

let html = `
<table>
<tr>
    <th>Data</th>
    <th>Turno</th>
    <th>Conduttore</th>
    <th>Operatore</th>
    <th>Centralino</th>
    <th>Riserva</th>
</tr>
`;

for (const t of turni) {

    const data = new Date(t.data + "T12:00:00");
    const giorno = data.getDate();
    const mese = mesi[data.getMonth()];

    const completo = t.CN && t.OP;

    html += `
    <tr class="${completo ? 'completo' : ''}">
        <td>${t.giorno} ${giorno} ${mese}</td>
        <td>${t.turno}</td>
        <td>${t.CN ? t.CN.nome : '<span class="vuoto">nessuno</span>'}</td>
        <td>${t.OP ? t.OP.nome : '<span class="vuoto">nessuno</span>'}</td>
        <td>${nomi(t.CE)}</td>
        <td>${nomi(t.RIS)}</td>
    </tr>
    `;
}

html += `</table>`;

document.getElementById("recap").innerHTML = html;
