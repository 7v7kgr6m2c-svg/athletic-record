import { auth, db } from './firebase-config.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        loadAthletes();
    });

    // 登出按鈕
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = 'index.html';
            });
        });
    }
});

async function loadAthletes() {
    const athletesList = document.getElementById('athletes-list');
    if (!athletesList) return;

    try {
        const querySnapshot = await getDocs(collection(db, "athletes"));
        athletesList.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'swipe-container bg-white p-4 mb-3 shadow-sm border border-slate-200 flex justify-between items-center';
            card.innerHTML = `
                <div onclick="selectAthlete('${doc.id}', '${data.name}')" class="cursor-pointer">
                    <h3 class="font-bold text-slate-800 text-lg">${data.name}</h3>
                </div>
            `;
            athletesList.appendChild(card);
        });
    } catch (error) {
        console.error("載入運動員失敗:", error);
    }
}

window.selectAthlete = function(id, name) {
    localStorage.setItem('current_athlete_id', id);
    localStorage.setItem('current_athlete_name', name);
    window.location.href = 'select_sport.html';
};
