import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, EmailAuthProvider, linkWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const THEME_OPTIONS = [
    { id: 'blue', name: '經典藍', bg: 'bg-gradient-to-r from-blue-600 to-blue-800', primaryHex: '#2563eb' },
    { id: 'emerald', name: '翡翠綠', bg: 'bg-gradient-to-r from-emerald-600 to-teal-800', primaryHex: '#059669' },
    { id: 'purple', name: '浪漫紫', bg: 'bg-gradient-to-r from-purple-600 to-indigo-800', primaryHex: '#9333ea' },
    { id: 'rose', name: '珊瑚紅', bg: 'bg-gradient-to-r from-rose-600 to-red-800', primaryHex: '#e11d48' },
    { id: 'amber', name: '琥珀金', bg: 'bg-gradient-to-r from-amber-500 to-orange-700', primaryHex: '#d97706' },
    { id: 'slate', name: '極簡灰', bg: 'bg-gradient-to-r from-slate-700 to-slate-900', primaryHex: '#334155' }
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
let confirmResolver = null;

// 自訂 Alert 彈窗
function showAlert(msg, icon = 'i') {
    const msgEl = document.getElementById('custom-alert-msg');
    const iconEl = document.getElementById('custom-alert-icon');
    const modalEl = document.getElementById('custom-alert-modal');

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
    if (modalEl) modalEl.classList.remove('hidden');
}

function closeCustomAlert() {
    const modalEl = document.getElementById('custom-alert-modal');
    if (modalEl) modalEl.classList.add('hidden');
}

// 自訂 Confirm 彈窗
function showConfirm(msg) {
    const msgEl = document.getElementById('custom-confirm-msg');
    const modalEl = document.getElementById('custom-confirm-modal');
    if (msgEl) msgEl.textContent = msg;
    if (modalEl) modalEl.classList.remove('hidden');
    return new Promise((resolve) => {
        confirmResolver = resolve;
    });
}

function resolveCustomConfirm(val) {
    const modalEl = document.getElementById('custom-confirm-modal');
    if (modalEl) modalEl.classList.add('hidden');
    if (confirmResolver) confirmResolver(val);
}

// 綁定彈窗控制
function openLinkModal() {
    const modalEl = document.getElementById('link-password-modal');
    if (modalEl) modalEl.classList.remove('hidden');
}

function closeLinkModal() {
    const modalEl = document.getElementById('link-password-modal');
    const inputEl = document.getElementById('new-password-input');
    if (modalEl) modalEl.classList.add('hidden');
    if (inputEl) inputEl.value = '';
}

async function handleLinkPassword() {
    const user = auth.currentUser;
    const inputEl = document.getElementById('new-password-input');
    const password = inputEl ? inputEl.value : '';

    if (!user) {
        showAlert('請先登入帳戶！', '⚠️');
        return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!password || !passwordRegex.test(password)) {
        showAlert('密碼不符合安全性規定：\n• 長度至少 8 位數\n• 必須包含大寫字母\n• 必須包含小寫字母\n• 必須包含數字', '⚠️');
        return;
    }

    try {
        const hasPassword = user.providerData.some(p => p.providerId === 'password');

        if (hasPassword) {
            await updatePassword(user, password);
            showAlert(`成功重設密碼！未來請使用新的密碼登入。`, '✅');
        } else {
            const credential = EmailAuthProvider.credential(user.email, password);
            await linkWithCredential(user, credential);
            showAlert(`成功為 ${user.email} 設定密碼！未來可以使用 Email / 密碼 登入。`, '✅');
        }
        closeLinkModal();
    } catch (err) {
        console.error('操作失敗：', err);
        if (err.code === 'auth/weak-password' || err.code === 'auth/password-policy-autherror') {
            showAlert('密碼強度不足或不符合政策規定，請重新設定！', '⚠️');
        } else if (err.code === 'auth/provider-already-linked') {
            try {
                await updatePassword(user, password);
                showAlert(`已更新密碼！未來請使用新的密碼登入。`, '✅');
                closeLinkModal();
            } catch (updateErr) {
                showAlert('更新密碼失敗：' + updateErr.message, '❌');
            }
        } else if (err.code === 'auth/credential-already-in-use') {
            showAlert('此 Email 憑證已被其他帳號使用！', '❌');
        } else if (err.code === 'auth/requires-recent-login') {
            showAlert('敏感操作，請登出後重新用 Google 登入再嘗試設定。', '⚠️');
        } else {
            showAlert('設定失敗：' + err.message, '❌');
        }
    }
}

function checkUserProviders(user) {
    const btnLink = document.getElementById('btn-open-link-modal');
    if (user && user.email && btnLink) {
        btnLink.classList.remove('hidden');
    }
}

function calculateAge(dobString) {
    if (!dobString) return '未填寫';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '未填寫';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 0 ? `${age} 歲` : '未填寫';
}

function renderColorPicker() {
    const container = document.getElementById('color-picker-container');
    if (!container) return;
    container.innerHTML = '';
    THEME_OPTIONS.forEach(t => {
        const opt = document.createElement('div');
        opt.className = `color-option ${t.bg} ${t.id === selectedThemeId ? 'active' : ''}`;
        opt.title = t.name;
        opt.onclick = () => {
            selectedThemeId = t.id;
            renderColorPicker();
        };
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
        opt.title = t.name;
        opt.onclick = () => {
            editSelectedThemeId = t.id;
            renderEditColorPicker();
        };
        container.appendChild(opt);
    });
}

function openColorModal(athlete) {
    editingAthleteForColor = athlete;
    editSelectedThemeId = athlete.themeColor || 'blue';
    const nameEl = document.getElementById('color-modal-athlete-name');
    const modalEl = document.getElementById('change-color-modal');
    if (nameEl) nameEl.textContent = `運動員：${athlete.name}`;
    renderEditColorPicker();
    if (modalEl) modalEl.classList.remove('hidden');
}

function closeColorModal() {
    const modalEl = document.getElementById('change-color-modal');
    if (modalEl) modalEl.classList.add('hidden');
    editingAthleteForColor = null;
}

async function confirmChangeColor() {
    if (!editingAthleteForColor) return;
    try {
        const athleteRef = doc(db, "athletes", editingAthleteForColor.id);
        await updateDoc(athleteRef, { themeColor: editSelectedThemeId });
        showAlert(`已更新「${editingAthleteForColor.name}」的主題顏色！`, '✅');
        closeColorModal();
        await fetchAthletes();
    } catch (err) {
        showAlert('更新顏色失敗：' + err.message, '❌');
    }
}

function setTodayAsDefault() {
    const now = new Date();
    selectedY = now.getFullYear();
    selectedM = now.getMonth() + 1;
    selectedD = now.getDate();
    const formatted = `${selectedY}-${String(selectedM).padStart(2, '0')}-${String(selectedD).padStart(2, '0')}`;
    const dobInput = document.getElementById('athlete-dob');
    const dobText = document.getElementById('dob-display-text');
    if (dobInput) dobInput.value = formatted;
    if (dobText) dobText.textContent = `${selectedY}年${selectedM}月${selectedD}日`;
}

// iOS 日期選擇器邏輯
function openIosWheelPicker(targetType) {
    activePickerTarget = targetType;
    const modal = document.getElementById('ios-wheel-modal');
    if (modal) modal.classList.remove('hidden');

    const dobInput = document.getElementById('athlete-dob');
    const currentVal = dobInput ? dobInput.value : '';
    if (currentVal && currentVal.includes('-')) {
        const parts = currentVal.split('-');
        selectedY = parseInt(parts[0], 10);
        selectedM = parseInt(parts[1], 10);
        selectedD = parseInt(parts[2], 10);
    } else {
        const now = new Date();
        selectedY = now.getFullYear();
        selectedM = now.getMonth() + 1;
        selectedD = now.getDate();
    }

    isInitializingPicker = true;
    isProgrammaticScrolling = true;

    renderWheelYears();
    renderWheelMonths();
    renderWheelDays(false);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            scrollWheelToValue('wheel-year', selectedY);
            scrollWheelToValue('wheel-month', selectedM);
            
            setTimeout(() => {
                scrollWheelToValue('wheel-day', selectedD);
                setTimeout(() => {
                    isProgrammaticScrolling = false;
                    isInitializingPicker = false;
                }, 150);
            }, 50);
        });
    });
}

function closeIosWheelPicker() {
    const modal = document.getElementById('ios-wheel-modal');
    if (modal) modal.classList.add('hidden');
}

function confirmIosWheelPicker() {
    const formatted = `${selectedY}-${String(selectedM).padStart(2, '0')}-${String(selectedD).padStart(2, '0')}`;
    if (activePickerTarget === 'dob') {
        const dobInput = document.getElementById('athlete-dob');
        const dobText = document.getElementById('dob-display-text');
        if (dobInput) dobInput.value = formatted;
        if (dobText) dobText.textContent = `${selectedY}年${selectedM}月${selectedD}日`;
    }
    closeIosWheelPicker();
}

function renderWheelYears() {
    const container = document.getElementById('wheel-year');
    if (!container) return;
    const nowY = new Date().getFullYear();
    container.innerHTML = '<div class="h-20"></div>';
    for (let y = nowY + 2; y >= nowY - 80; y--) {
        const div = document.createElement('div');
        div.className = 'picker-item';
        div.dataset.val = y;
        div.textContent = `${y}年`;
        container.appendChild(div);
    }
    container.innerHTML += '<div class="h-20"></div>';
    bindWheelScroll('wheel-year', (val) => { 
        selectedY = val; 
        if (!isInitializingPicker) renderWheelDays(true); 
    });
}

function renderWheelMonths() {
    const container = document.getElementById('wheel-month');
    if (!container) return;
    container.innerHTML = '<div class="h-20"></div>';
    for (let m = 1; m <= 12; m++) {
        const div = document.createElement('div');
        div.className = 'picker-item';
        div.dataset.val = m;
        div.textContent = `${m}月`;
        container.appendChild(div);
    }
    container.innerHTML += '<div class="h-20"></div>';
    bindWheelScroll('wheel-month', (val) => { 
        selectedM = val; 
        if (!isInitializingPicker) renderWheelDays(true); 
    });
}

function renderWheelDays(keepCurrentDay = true) {
    const container = document.getElementById('wheel-day');
    if (!container) return;
    const daysCount = new Date(selectedY, selectedM, 0).getDate();
    if (selectedD > daysCount) selectedD = daysCount;

    container.innerHTML = '<div class="h-20"></div>';
    for (let d = 1; d <= daysCount; d++) {
        const div = document.createElement('div');
        div.className = 'picker-item';
        div.dataset.val = d;
        div.textContent = `${d}日`;
        container.appendChild(div);
    }
    container.innerHTML += '<div class="h-20"></div>';
    bindWheelScroll('wheel-day', (val) => { selectedD = val; });

    if (keepCurrentDay && !isInitializingPicker) {
        scrollWheelToValue('wheel-day', selectedD);
    }
}

function bindWheelScroll(elementId, onSelectCallback) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let timer = null;
    el.onscroll = () => {
        if (isProgrammaticScrolling) return;

        clearTimeout(timer);
        timer = setTimeout(() => {
            const centerOffset = el.scrollTop + 80;
            const items = el.querySelectorAll('.picker-item');
            let closest = null;
            let minDiff = Infinity;

            items.forEach(item => {
                item.classList.remove('selected');
                const diff = Math.abs((item.offsetTop + 20) - centerOffset);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = item;
                }
            });

            if (closest) {
                closest.classList.add('selected');
                const val = parseInt(closest.dataset.val, 10);
                onSelectCallback(val);
            }
        }, 80);
    };
}

function scrollWheelToValue(elementId, val) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const items = el.querySelectorAll('.picker-item');
    items.forEach(item => {
        if (parseInt(item.dataset.val, 10) === val) {
            item.classList.add('selected');
            const targetTop = item.offsetTop - 80;
            el.scrollTop = targetTop;
        } else {
            item.classList.remove('selected');
        }
    });
}

async function fetchAthletes() {
    if (!currentUser) return;
    try {
        const q = query(collection(db, "athletes"), where("user_id", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        let athletes = [];
        querySnapshot.forEach((docSnap) => {
            athletes.push({ id: docSnap.id, ...docSnap.data() });
        });
        athletes.sort((a, b) => (a.created_at?.seconds || 0) - (b.created_at?.seconds || 0));
        renderSlots(athletes);
    } catch (err) {
        showAlert('載入運動員失敗：' + err.message, '❌');
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
                    <button class="color-btn w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-inner cursor-pointer transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.75 1.7-1.67 0-.42-.16-.82-.44-1.11-.28-.29-.44-.69-.44-1.11 0-.92.75-1.67 1.67-1.67H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z"/></svg>
                        <span>顏色</span>
                    </button>
                    <button class="delete-btn w-1/2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-inner cursor-pointer transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span>刪除</span>
                    </button>
                </div>

                <div class="swipe-content ${themeObj.bg} text-white p-6 rounded-3xl flex items-center justify-between cursor-pointer select-none relative z-10">
                    <div class="flex items-center gap-5">
                        <img src="${athlete.avatar || defaultAvatar}" class="w-16 h-16 rounded-full object-cover border-2 border-white/60 bg-black/20 flex-shrink-0 shadow-sm">
                        <div class="space-y-1">
                            <h3 class="text-xl font-black tracking-wide">${athlete.name}</h3>
                            <p class="text-xs md:text-sm text-white/90 font-medium">出生日期: ${athlete.dob || '未填寫'}</p>
                            <div class="flex gap-3 text-xs text-white/80 font-medium">
                                <span>年齡: ${calculateAge(athlete.dob)}</span>
                                <span>•</span>
                                <span>性別: ${athlete.gender || '未指定'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-white/80 flex items-center pl-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </div>
            `;

            const swipeContent = wrapper.querySelector('.swipe-content');
            const colorBtn = wrapper.querySelector('.color-btn');
            const deleteBtn = wrapper.querySelector('.delete-btn');

            const resetSwipe = setupSwipeEvent(swipeContent, athlete, () => {
                localStorage.setItem('current_athlete_id', athlete.id);
                localStorage.setItem('current_athlete_name', athlete.name);
                localStorage.setItem('current_athlete_dob', athlete.dob || '');
                localStorage.setItem('current_athlete_gender', athlete.gender || '');
                localStorage.setItem('current_athlete_avatar', athlete.avatar || '');
                localStorage.setItem('current_athlete_theme', athlete.themeColor || 'blue');
                window.location.href = 'select_sport.html';
            });

            colorBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                resetSwipe();
                openColorModal(athlete);
            });

            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                resetSwipe();
                await deleteAthlete(athlete.id, athlete.name);
            });

            container.appendChild(wrapper);

        } else if (i === count) {
            const addBox = document.createElement('div');
            addBox.className = "border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/60 hover:bg-blue-50/50 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-slate-400 hover:text-blue-600 min-h-[110px] shadow-xs";
            addBox.innerHTML = `
                <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shadow-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin='round'><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <span class="text-xs font-bold tracking-wide">點擊新增第 ${i + 1} 位運動員</span>
            `;
            addBox.addEventListener('click', openAddModal);
            container.appendChild(addBox);
        } else {
            break;
        }
    }
}

function setupSwipeEvent(element, athlete, onClick) {
    let startX = 0, currentX = 0, isDragging = false, isOpen = false;
    const maxSwipe = -160;

    const resetPosition = () => {
        element.style.transition = 'transform 0.2s ease-out';
        element.style.transform = 'translateX(0px)';
        isOpen = false;
        currentX = 0;
    };

    const onStart = (e) => {
        isDragging = true;
        startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        element.style.transition = 'none';
    };

    const onMove = (e) => {
        if (!isDragging) return;
        const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const diff = x - startX;
        currentX = isOpen ? Math.min(0, Math.max(maxSwipe, maxSwipe + diff)) : Math.min(0, Math.max(maxSwipe, diff));
        element.style.transform = `translateX(${currentX}px)`;
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        element.style.transition = 'transform 0.2s ease-out';
        if (currentX < maxSwipe / 2) {
            element.style.transform = `translateX(${maxSwipe}px)`;
            isOpen = true;
        } else {
            resetPosition();
        }
    };

    element.addEventListener('touchstart', onStart, { passive: true });
    element.addEventListener('touchmove', onMove, { passive: true });
    element.addEventListener('touchend', onEnd);
    element.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    element.addEventListener('click', () => {
        if (Math.abs(currentX) < 5 && !isOpen) {
            onClick();
        } else if (isOpen) {
            resetPosition();
        }
    });

    return resetPosition;
}

async function deleteAthlete(athleteId, name) {
    const confirmed = await showConfirm(`確定要完全刪除運動員「${name}」的資料及所有紀錄嗎？\n（注意：刪除後將無法還原）`);
    if (!confirmed) return;
    try {
        await deleteDoc(doc(db, "athletes", athleteId));
        showAlert(`已完全刪除運動員：${name}`, '✅');
        await fetchAthletes();
    } catch (err) {
        showAlert('刪除失敗：' + err.message, '❌');
    }
}

function openAddModal() { 
    const modal = document.getElementById('add-modal');
    if (modal) modal.classList.remove('hidden'); 
    setTodayAsDefault();
    selectedThemeId = 'blue';
    renderColorPicker();
}

function closeAddModal() {
    const modal = document.getElementById('add-modal');
    const form = document.getElementById('add-athlete-form');
    const avatarPreview = document.getElementById('avatar-preview');
    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
    setTodayAsDefault();
    selectedAvatarBase64 = '';
    if (avatarPreview) avatarPreview.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const cropImg = document.getElementById('crop-image-target');
            const cropModal = document.getElementById('crop-modal');
            if (cropImg) cropImg.src = e.target.result;
            if (cropModal) cropModal.classList.remove('hidden');

            if (cropper) cropper.destroy();
            setTimeout(() => {
                if (cropImg) {
                    cropper = new Cropper(cropImg, {
                        aspectRatio: 1, viewMode: 1, dragMode: 'move', autoCropArea: 0.8,
                        restore: false, guides: false, center: true, highlight: false,
                        cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false,
                    });
                }
            }, 100);
        };
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

function closeCropModal() {
    const modal = document.getElementById('crop-modal');
    if (modal) modal.classList.add('hidden');
    if (cropper) cropper.destroy();
}

function confirmCrop() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 150, height: 150 });
    selectedAvatarBase64 = canvas.toDataURL('image/jpeg', 0.6);
    const avatarPreview = document.getElementById('avatar-preview');
    if (avatarPreview) avatarPreview.src = selectedAvatarBase64;
    closeCropModal();
}

// 初始化與事件監聽
document.addEventListener('DOMContentLoaded', () => {
    // 按鈕與事件綁定
    document.getElementById('btn-close-alert')?.addEventListener('click', closeCustomAlert);
    document.getElementById('btn-cancel-confirm')?.addEventListener('click', () => resolveCustomConfirm(false));
    document.getElementById('btn-ok-confirm')?.addEventListener('click', () => resolveCustomConfirm(true));

    document.getElementById('btn-open-link-modal')?.addEventListener('click', openLinkModal);
    document.getElementById('btn-close-link-modal')?.addEventListener('click', closeLinkModal);
    document.getElementById('btn-confirm-link-modal')?.addEventListener('click', handleLinkPassword);

    document.getElementById('btn-close-add-modal-x')?.addEventListener('click', closeAddModal);
    document.getElementById('btn-close-add-modal')?.addEventListener('click', closeAddModal);
    document.getElementById('avatar-trigger')?.addEventListener('click', () => document.getElementById('athlete-avatar')?.click());
    document.getElementById('athlete-avatar')?.addEventListener('change', handleFileSelect);
    document.getElementById('dob-picker-trigger')?.addEventListener('click', () => openIosWheelPicker('dob'));

    document.getElementById('btn-close-color-modal')?.addEventListener('click', closeColorModal);
    document.getElementById('btn-confirm-color-modal')?.addEventListener('click', confirmChangeColor);

    document.getElementById('btn-close-wheel')?.addEventListener('click', closeIosWheelPicker);
    document.getElementById('btn-confirm-wheel')?.addEventListener('click', confirmIosWheelPicker);

    document.getElementById('btn-close-crop')?.addEventListener('click', closeCropModal);
    document.getElementById('btn-confirm-crop')?.addEventListener('click', confirmCrop);

    document.getElementById('add-athlete-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('athlete-name');
        const dobInput = document.getElementById('athlete-dob');
        const genderInput = document.getElementById('athlete-gender');

        const name = nameInput ? nameInput.value.trim() : '';
        const dob = dobInput ? dobInput.value : '';
        const gender = genderInput ? genderInput.value : '';

        if (!name || !dob || !gender) {
            showAlert('請完整填寫所有必填欄位（包含出生年月日）！', '⚠️');
            return;
        }

        try {
            await addDoc(collection(db, "athletes"), {
                name, dob, gender,
                themeColor: selectedThemeId,
                avatar: selectedAvatarBase64,
                user_id: currentUser.uid,
                created_at: serverTimestamp()
            });
            closeAddModal();
            await fetchAthletes();
        } catch (err) {
            showAlert('新增失敗：' + err.message, '❌');
        }
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.clear();
            showAlert('成功登出！', '✅');
            setTimeout(() => { window.location.replace('index.html'); }, 800);
        } catch (err) {
            showAlert('登出失敗：' + err.message, '❌');
        }
    });

    // 關鍵修復：防止頁面無限刷新的驗證監聽邏輯
    let authChecked = false;

    onAuthStateChanged(auth, async (user) => {
        if (authChecked && currentUser?.uid === user?.uid) return;
        authChecked = true;

        if (!user) {
            // 使用 replace 跳轉，避免加入歷史紀錄引發循環重定向
            window.location.replace('index.html');
            return;
        }
        
        currentUser = user;
        checkUserProviders(user);
        setTodayAsDefault();
        renderColorPicker();
        await fetchAthletes();
    });
});
