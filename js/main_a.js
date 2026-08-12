import { auth, db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const athleteId = localStorage.getItem('current_athlete_id');
    const athleteName = localStorage.getItem('current_athlete_name');

    if (!athleteId) {
        window.location.href = 'athletes.html';
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        loadTrackRecords(athleteId);
    });
});

async function loadTrackRecords(athleteId) {
    const recordContainer = document.getElementById('record-list');
    if (!recordContainer) return;

    try {
        const q = query(collection(db, "track_records"), where("athleteId", "==", athleteId));
        const querySnapshot = await getDocs(q);
        recordContainer.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const row = document.createElement('div');
            row.className = 'p-3 border-b border-slate-100 flex justify-between items-center';
            row.innerHTML = `
                <div>
                    <span class="font-bold text-slate-800">${item.event || '田徑項目'}</span>
                    <span class="text-xs text-slate-400 block">${item.date || ''}</span>
                </div>
                <div class="font-mono text-lg font-semibold text-orange-600">${item.time || item.score}</div>
            `;
            recordContainer.appendChild(row);
        });
    } catch (error) {
        console.error("載入田徑成績失敗:", error);
    }
}
