import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { IOSDatePicker } from './ios-picker.js';

let currentUser = null;
let cropper = null;
let croppedAvatarBase64 = '';
let datePicker = null;

// UI 提示 Modal
function showCustomAlert(msg, icon = 'i') {
  document.getElementById('custom-alert-msg').textContent = msg;
  document.getElementById('custom-alert-icon').textContent = icon;
  document.getElementById('custom-alert-modal').classList.remove('hidden');
}

function showCustomConfirm(msg, onConfirm) {
  document.getElementById('custom-confirm-msg').textContent = msg;
  const modal = document.getElementById('custom-confirm-modal');
  modal.classList.remove('hidden');

  const btnOk = document.getElementById('btn-confirm-ok');
  const btnCancel = document.getElementById('btn-confirm-cancel');

  const handleOk = () => {
    cleanup();
    onConfirm();
  };
  const handleCancel = () => {
    cleanup();
  };
  function cleanup() {
    modal.classList.add('hidden');
    btnOk.removeEventListener('click', handleOk);
    btnCancel.removeEventListener('click', handleCancel);
  }

  btnOk.addEventListener('click', handleOk);
  btnCancel.addEventListener('click', handleCancel);
}

// 載入運動員清單
async function loadAthletes() {
  const container = document.getElementById('slots-container');
  if (!container || !currentUser) return;

  try {
    const q = query(collection(db, "users", currentUser.uid, "athletes"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = `<div class="text-center py-8 text-slate-400 font-medium">尚未新增任何運動員，請點擊下方按鈕新增。</div>`;
    } else {
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const card = createAthleteCard(docSnap.id, data);
        container.appendChild(card);
      });
    }

    // 新增按鈕
    const addBtn = document.createElement('button');
    addBtn.className = "w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-4 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer";
    addBtn.innerHTML = `<span class="text-xl">+</span><span>新增運動員</span>`;
    addBtn.onclick = () => document.getElementById('add-modal').classList.remove('hidden');
    container.appendChild(addBtn);

  } catch (err) {
    console.error("載入運動員失敗:", err);
    showCustomAlert("載入運動員失敗: " + err.message, "❌");
  }
}

function createAthleteCard(id, data) {
  const wrapper = document.createElement('div');
  wrapper.className = "swipe-container bg-white p-4 shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer";
  wrapper.innerHTML = `
    <div class="flex items-center gap-4">
      <img src="${data.avatar || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'1.5\'%3E%3Cpath d=\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\'/%3E%3Ccircle cx=\'12\' cy=\'7\' r=\'4\'/%3E%3C/svg%3E'}" class="w-12 h-12 rounded-full object-cover">
      <div>
        <h3 class="font-bold text-slate-900">${data.name}</h3>
        <p class="text-xs text-slate-500">${data.gender || '未知'} · ${data.dob || '未設定'}</p>
      </div>
    </div>
  `;

  wrapper.onclick = () => {
    localStorage.setItem('current_athlete_id', id);
    localStorage.setItem('current_athlete_name', data.name);
    localStorage.setItem('current_athlete_dob', data.dob);
    localStorage.setItem('current_athlete_gender', data.gender);
    localStorage.setItem('current_athlete_avatar', data.avatar || '');
    localStorage.setItem('current_athlete_theme', data.theme || 'blue');
    window.location.href = 'select_sport.html';
  };

  return wrapper;
}

// 事件繫結
document.addEventListener('DOMContentLoaded', () => {
  // Alert 關閉
  document.getElementById('btn-close-custom-alert')?.addEventListener('click', () => {
    document.getElementById('custom-alert-modal').classList.add('hidden');
  });

  // Auth 狀態檢查
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = user;
    loadAthletes();
  });

  // 登出
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  // iOS DatePicker 初始化
  datePicker = new IOSDatePicker({
    wheelYear: 'wheel-year',
    wheelMonth: 'wheel-month',
    wheelDay: 'wheel-day'
  });
  datePicker.init();

  document.getElementById('trigger-dob-picker')?.addEventListener('click', () => {
    document.getElementById('ios-wheel-modal').classList.remove('hidden');
  });
  document.getElementById('btn-close-wheel')?.addEventListener('click', () => {
    document.getElementById('ios-wheel-modal').classList.add('hidden');
  });
  document.getElementById('btn-confirm-wheel')?.addEventListener('click', () => {
    const selected = datePicker.getSelectedDate();
    document.getElementById('athlete-dob').value = selected;
    document.getElementById('dob-display-text').textContent = selected;
    document.getElementById('ios-wheel-modal').classList.add('hidden');
  });

  // 新增 Modal 關閉
  const closeAddModal = () => document.getElementById('add-modal').classList.add('hidden');
  document.getElementById('btn-close-add-modal')?.addEventListener('click', closeAddModal);
  document.getElementById('btn-close-add-modal-x')?.addEventListener('click', closeAddModal);

  // 表單提交
  document.getElementById('add-athlete-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const name = document.getElementById('athlete-name').value.trim();
    const dob = document.getElementById('athlete-dob').value;
    const gender = document.getElementById('athlete-gender').value;

    try {
      await addDoc(collection(db, "users", currentUser.uid, "athletes"), {
        name, dob, gender,
        avatar: croppedAvatarBase64 || '',
        theme: 'blue',
        createdAt: new Date()
      });
      closeAddModal();
      loadAthletes();
      showCustomAlert("運動員新增成功！", "✅");
    } catch (err) {
      showCustomAlert("新增失敗: " + err.message, "❌");
    }
  });
});
