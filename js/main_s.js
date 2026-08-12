import { auth, db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const athleteId = localStorage.getItem('current_athlete_id');
    const athleteName = localStorage.getItem('current_athlete_name');

    // 驗證是否有選擇運動員
    if (!athleteId) {
        window.location.href = 'athletes.html';
        return;
    }

    // 更新頁面上顯示的運動員姓名（若有相對應標籤）
    const nameDisplay = document.getElementById('current-athlete-display');
    if (nameDisplay && athleteName) {
        nameDisplay.textContent = athleteName;
    }

    // 檢查 Firebase 登入狀態
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        loadSwimRecords(athleteId);
    });

    // 監聽新增游泳紀錄表單提交（若頁面上有表單）
    const swimForm = document.getElementById('swim-record-form');
    if (swimForm) {
        swimForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleAddSwimRecord(athleteId);
        });
    }
});

// 載入游泳成績紀錄
async function loadSwimRecords(athleteId) {
    const recordContainer = document.getElementById('swim-record-list');
    if (!recordContainer) return;

    try {
        const q = query(
            collection(db, "swimming_records"), 
            where("athleteId", "==", athleteId)
        );
        const querySnapshot = await getDocs(q);
        recordContainer.innerHTML = '';

        if (querySnapshot.empty) {
            recordContainer.innerHTML = '<div class="text-center text-slate-400 py-8">暫無游泳紀錄</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const row = document.createElement('div');
            row.className = 'p-4 bg-white rounded-2xl mb-3 shadow-sm border border-slate-100 flex justify-between items-center';
            row.innerHTML = `
                <div>
                    <div class="font-bold text-slate-800 text-base">${item.event || '游泳項目'}</div>
                    <div class="text-xs text-slate-400 mt-1">${item.date || ''} ${item.poolLength ? `(${item.poolLength}m池)` : ''}</div>
                </div>
                <div class="font-mono text-xl font-bold text-cyan-600">${item.time || '--:--.--'}</div>
            `;
            recordContainer.appendChild(row);
        });
    } catch (error) {
        console.error("載入游泳成績失敗:", error);
    }
}

// 新增游泳成績紀錄
async function handleAddSwimRecord(athleteId) {
    const eventInput = document.getElementById('swim-event')?.value;
    const timeInput = document.getElementById('swim-time')?.value;
    const dateInput = document.getElementById('swim-date')?.value;

    if (!eventInput || !timeInput) {
        alert('請填寫完整項目與成績');
        return;
    }

    try {
        await addDoc(collection(db, "swimming_records"), {
            athleteId: athleteId,
            event: eventInput,
            time: timeInput,
            date: dateInput || new Date().toISOString().split('T')[0],
            createdAt: new Date()
        });

        // 重新載入列表並重置表單
        loadSwimRecords(athleteId);
        const swimForm = document.getElementById('swim-record-form');
        if (swimForm) swimForm.reset();
    } catch (error) {
        console.error("新增游泳成績失敗:", error);
        alert('新增失敗，請稍後再試');
    }
}
