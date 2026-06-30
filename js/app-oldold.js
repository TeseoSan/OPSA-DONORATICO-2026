import { db } from "./firebase.js";

console.log("🔥 Firebase collegato!", db);

document.getElementById("app").innerHTML = `
    <h2>✅ Connessione a Firebase riuscita!</h2>
`;

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

async function testFirestore() {

    try {

        await setDoc(
            doc(db, "test", "ciao"),
            {
                messaggio: "Funziona!",
                data: new Date().toISOString()
            }
        );

        console.log("🔥 Documento scritto!");

        document.getElementById("app").innerHTML = `
            <h2>✅ Firestore funziona!</h2>
            <p>Documento creato con successo.</p>
        `;

    } catch (err) {

        console.error(err);

        document.getElementById("app").innerHTML = `
            <h2>❌ Errore</h2>
            <pre>${err}</pre>
        `;

    }

}

testFirestore();