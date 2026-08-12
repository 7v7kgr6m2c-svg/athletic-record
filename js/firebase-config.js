import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA40NWznF4c7Gz2FNzVTCyse_Tm9gp-1n0",
  authDomain: "trackandwave.com",
  projectId: "athletes-record",
  storageBucket: "athletes-record.firebasestorage.app",
  messagingSenderId: "259439207122",
  appId: "1:259439207122:web:26d6211ac1379c936e030b",
  measurementId: "G-F3ZH9YN0VT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
