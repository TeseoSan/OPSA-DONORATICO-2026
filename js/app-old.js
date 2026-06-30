import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


const params = new URLSearchParams(window.location.search);

const userId = params.get("u");

if (!userId) {

    document.body.innerHTML = "<h2>Utente non specificato.</h2>";

    throw "Utente mancante";

}


const userSnap = await getDoc(doc(db, "users", userId));

if (!userSnap.exists()) {

    document.body.innerHTML = "<h2>Utente inesistente.</h2>";

    throw "Utente inesistente";

}

const utente = userSnap.data();

document.getElementById("utente").innerHTML = `
<h2>${utente.displayName}</h2>
`;

const query = await getDocs(collection(db, "turni"));

const turni = [];

query.forEach(d => {

    turni.push({
        id: d.id,
        ...d.data()
    });

});

const utente = userSnap.data();

async function prenotaOP(idTurno) {

    await updateDoc(
        doc(db, "turni", idTurno),
        {
            OP: {
                id: userId,
                nome: utente.displayName
            }
        }
    );

    location.reload();

}

turni.sort((a,b)=>{

    if(a.data===b.data){

        return a.turno.localeCompare(b.turno);

    }

    return a.data.localeCompare(b.data);

});

let html = "";

const mesi = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre"
];

for (const turno of turni) {

    const data = new Date(turno.data + "T12:00:00");

    const giorno = data.getDate();
    const mese = mesi[data.getMonth()];

    html += `

    <hr>

    <h3>${turno.giorno} ${giorno} ${mese} - ${turno.turno}</h3>

    <div>


        <b>OPERATORE</b><br>
        ${turno.OP ? turno.OP.nome : "Disponibile"}
        <b>OPERATORE</b><br>
        ${turno.OP
            ? turno.OP.nome : `<button onclick="prenotaOP('${turno.id}')">
            MI PRENOTO
            </button>`
        }
}


        <br><br>

        <b>CENTRALINO</b><br>
        ${
            turno.CE.length
                ? turno.CE.map(x => x.nome).join("<br>")
                : "Nessuno"
        }

        <br><br>

        <b>RISERVA</b><br>
        ${
            turno.RIS.length
                ? turno.RIS.map(x => x.nome).join("<br>")
                : "Nessuno"
        }

    </div>

    `;

}

document.getElementById("turni").innerHTML = html;
