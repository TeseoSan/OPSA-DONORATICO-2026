// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Configurazione del progetto
const firebaseConfig = {
  apiKey: "AIzaSyCiNmW_i7ucGczuKNb4fMbDoIIRP4Zs6Kk",
  authDomain: "opsa-donoratico-2026.firebaseapp.com",
  projectId: "opsa-donoratico-2026",
  storageBucket: "opsa-donoratico-2026.firebasestorage.app",
  messagingSenderId: "542005351083",
  appId: "1:542005351083:web:05b3fd08812bf9a7009dee"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza Firestore
const db = getFirestore(app);

// Esporta il database
export { db };