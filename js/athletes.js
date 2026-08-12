import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, EmailAuthProvider, linkWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// iOS 手勢防護
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

const THEME_OPTIONS = [
    { id: 'blue', name: '經典藍', bg: 'bg-gradient-to-r from-blue-600 to-blue-800' },
    { id: 'emerald', name: '翡翠綠', bg: 'bg-gradient-to-r from-emerald-600 to-teal-800' },
    { id: 'purple', name: '浪漫紫', bg: 'bg-gradient-to-r from-purple-600 to-indigo-800' },
    { id: 'rose', name: '珊瑚紅', bg: 'bg-gradient-to-r from-rose-600 to-red-800' },
    { id: 'amber', name: '琥珀金', bg: 'bg-gradient-to-r from-amber-500 to-orange-700' },
    { id: 'slate', name: '極簡灰', bg: 'bg-gradient-to-r from-slate-700 to-slate-900' }
];

let selectedThemeId = 'blue';
let editingAthleteForColor = null;
let editSelectedThemeId = 'blue';
let currentUser = null;
let selectedAvatarBase64 = '';
let cropper = null;

let activePickerTarget = null;
let selectedY = new Date().getFullYear();
let selectedM = new Date().getMonth() + 1;
let selectedD = new Date().getDate();
let isProgrammaticScrolling = false;
let isInitializingPicker = false;

function showAlert(msg, icon = 'i') {
    const msgEl = document.getElementById('custom-alert-msg');
    const iconEl = document.getElementById('custom-alert-icon');
    if (msgEl) msgEl.textContent = msg;
    if (iconEl) {
        iconEl.textContent = icon;
        if (icon === '✅') {
            iconEl.className = 'w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold';
        } else if (icon === '❌' || icon === '⚠️') {
            iconEl.className = 'w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold';
        } else {
            iconEl.className = 'w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold';
        }
    }
    document.getElementById('custom-alert-modal')?.classList.remove('hidden');
}

let confirmResolver = null;
function showConfirm(msg) {
    document.getElementById('custom-confirm-msg').textContent = msg;
    document.getElementById('custom-confirm-modal').classList.remove('hidden');
    return new Promise((resolve) => { confirmResolver = resolve; });
}

function calculateAge(dobString) {
    if (!dobString) return '未填寫';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '未填寫';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? `${age} 歲` : '未填寫';
}

function renderColorPicker() {
    const container = document.getElementById('color-picker-container');
    if (!container) return;
    container.innerHTML = '';
    THEME_OPTIONS.forEach(t => {
        const opt = document.createElement('div');
        opt.className = `color-option ${t.bg} ${t.id === selectedThemeId ? 'active' : ''}`;
        opt.onclick = () => { selectedThemeId = t.id; renderColorPicker(); };
        container.appendChild(opt);
    });
}

function renderEditColorPicker() {
    const container = document.getElementById('edit-color-picker-container');
    if (!container) return;
    container.innerHTML = '';
    THEME_OPTIONS.forEach(t => {
        const opt = document.createElement('div');
        opt.className = `color-option ${t.bg} ${t.id === editSelectedThemeId ? 'active' : ''}`;
        opt.onclick = () => { editSelectedThemeId = t.id; renderEditColorPicker(); };
        container.appendChild(opt);
    });
}

function openColorModal(athlete) {
    editingAthleteForColor = athlete;
    editSelectedThemeId = athlete.themeColor || 'blue';
    document.getElementById('color-modal-athlete-name').textContent = `運動員：${athlete.name}`;
    renderEditColorPicker();
    document.getElementById('change-color-modal').classList.remove('hidden');
}

function setTodayAsDefault() {
    const now = new Date();
    selectedY = now.getFullYear();
    selectedM = now.getMonth() + 1;
    selectedD = now.getDate();
    const formatted = `${selectedY}-${String(selectedM).padStart(2, '0')}-${String(selectedD).padStart(2, '0')}`;
    document.getElementById('athlete-dob').value = formatted;
    document.getElementById('dob-display-text').textContent = `${selectedY}年${selectedM}月${selectedD}日`;
}

async function fetchAthletes() {
    const container = document.getElementById('slots-container');
    if (!currentUser) return;
    try {
        const q = query(collection(db, "athletes"), where("user_id", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        let athletes = [];
        querySnapshot.forEach((docSnap) => athletes.push({ id: docSnap.id, ...docSnap.data() }));
        athletes.sort((a, b) => (a.created_at?.seconds || 0) - (b.created_at?.seconds || 0));
        renderSlots(athletes);
    } catch (err) {
        console.error("載入失敗：", err);
        renderSlots([]);
    }
}

function renderSlots(athletes) {
    const container = document.getElementById('slots-container');
    if (!container) return;
    container.innerHTML = '';
    const totalSlots = 3;
    const count = athletes.length;

    for (let i = 0; i < totalSlots; i++) {
        if (i < count) {
            const athlete = athletes[i];
            const themeObj = THEME_OPTIONS.find(t => t.id === athlete.themeColor) || THEME_OPTIONS[0];
            const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";

            const wrapper = document.createElement('div');
            wrapper.className = 'swipe-container bg-slate-800 shadow-lg';
            wrapper.innerHTML = `
                <div class="absolute right-0 top-0 bottom-0 flex w-[160px]">
                    <button class="color-btn w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer"><span>顏色</span></button>
                    <button class="delete-btn w-1/2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer"><span>刪除</span></button>
                </div>
                <div class="swipe-content ${themeObj.bg} text-white p-6 rounded-3xl flex items-center justify-between cursor-pointer select-none relative z-10">
                    <div class="flex items-center gap-5">
                        <img src="${athlete.avatar || defaultAvatar}" class="w-16 h-16 rounded-full object-cover border-2 border-white/60 bg-black/20 flex-shrink-0">
                        <div class="space-y-1">
                            <h3 class="text-xl font-black tracking-wide">${athlete.name}</h3>
                            <p class="text-xs md:text-sm text-white/90 font-medium">出生日期: ${athlete.dob || '未填寫'}</p>
                            <div class="flex gap-3 text-xs text-white/80 font-medium">
                                <span>年齡: ${calculateAge(athlete.dob)}</span> • <span>性別: ${athlete.gender || '未指定'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const swipeContent = wrapper.querySelector('.swipe-content');
            wrapper.querySelector('.color-btn').addEventListener('click', (e) => { e.stopPropagation(); openColorModal(athlete); });
            wrapper.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await showConfirm(`確定要刪除「${athlete.name}」嗎？`);
                if (confirmed) {
                    await deleteDoc(doc(db, "athletes", athlete.id));
                    await fetchAthletes();
                }
            });

            // 當點擊運動員卡片時：
            swipeContent.addEventListener('click', () => {
                // 1. 記住運動員 ID
                localStorage.setItem('current_athlete_id', athlete.id);
    
                // 2. 記住運動員名字
                localStorage.setItem('current_athlete_name', athlete.name);
    
                // 3. 記住運動員頭像 (如果沒有頭像，就存空字串 '')
                localStorage.setItem('current_athlete_avatar', athlete.avatar || '');
    
                // 4. 跳轉到選擇運動頁面 (或成績頁面)
                window.location.href = 'select_sport.html';
            });

            container.appendChild(wrapper);
        } else if (i === count) {
            const addBox = document.createElement('div');
            addBox.className = "border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/60 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer text-slate-400 hover:text-blue-600 min-h-[110px]";
            addBox.innerHTML = `<span class="text-xs font-bold">點擊新增第 ${i + 1} 位運動員</span>`;
            addBox.addEventListener('click', () => {
                document.getElementById('add-modal').classList.remove('hidden');
                setTodayAsDefault();
                renderColorPicker();
            });
            container.appendChild(addBox);
        }
    }
}

// 監聽 Auth 狀態
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace('index.html');
        return;
    }
    currentUser = user;
    if (user.email) document.getElementById('btn-open-link-modal')?.classList.remove('hidden');
    setTodayAsDefault();
    renderColorPicker();
    await fetchAthletes();
});

// DOM 事件觸發綁定
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await signOut(auth);
        localStorage.clear();
        window.location.replace('index.html');
    });

    document.getElementById('btn-close-custom-alert')?.addEventListener('click', () => {
        document.getElementById('custom-alert-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-confirm-cancel')?.addEventListener('click', () => {
        document.getElementById('custom-confirm-modal')?.classList.add('hidden');
        if (confirmResolver) confirmResolver(false);
    });

    document.getElementById('btn-confirm-ok')?.addEventListener('click', () => {
        document.getElementById('custom-confirm-modal')?.classList.add('hidden');
        if (confirmResolver) confirmResolver(true);
    });

    document.getElementById('btn-close-add-modal')?.addEventListener('click', () => {
        document.getElementById('add-modal')?.classList.add('hidden');
    });
    document.getElementById('btn-close-add-modal-x')?.addEventListener('click', () => {
        document.getElementById('add-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-close-color-modal')?.addEventListener('click', () => {
        document.getElementById('change-color-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-confirm-color-modal')?.addEventListener('click', async () => {
        if (!editingAthleteForColor) return;
        await updateDoc(doc(db, "athletes", editingAthleteForColor.id), { themeColor: editSelectedThemeId });
        document.getElementById('change-color-modal')?.classList.add('hidden');
        await fetchAthletes();
    });

    document.getElementById('add-athlete-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('athlete-name').value.trim();
        const dob = document.getElementById('athlete-dob').value;
        const gender = document.getElementById('athlete-gender').value;

        if (!name || !dob || !gender) {
            showAlert('請完整填寫欄位！', '⚠️');
            return;
        }

        await addDoc(collection(db, "athletes"), {
            name, dob, gender,
            themeColor: selectedThemeId,
            avatar: selectedAvatarBase64,
            user_id: currentUser.uid,
            created_at: serverTimestamp()
        });
        document.getElementById('add-modal').classList.add('hidden');
        await fetchAthletes();
    });
});
