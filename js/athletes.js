import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged, 
  signOut, 
  updatePassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { IOSDatePicker } from './ios-picker.js';

let currentUser = null;
let cropper = null;
let croppedAvatarBase64 = '';
let datePicker = null;

let editingAthleteId = null;
let selectedEditColor = 'blue';
let selectedAddColor = 'blue';

const availableColors = [
  { name: 'blue', bgClass: 'bg-blue-600' },
  { name: 'green', bgClass: 'bg-emerald-600' },
  { name: 'purple', bgClass: 'bg-purple-600' },
  { name: 'orange', bgClass: 'bg-orange-600' }
];

// 工具函數：計算年齡
function calculateAge(dobStr) {
  if (!dobStr) return '未知';
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return '未知';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// UI 提示 Modal 操控
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
    addBtn.className = "w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-4 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer mt-4";
    addBtn.innerHTML = `<span class="text-xl">+</span><span>點擊新增第 ${snapshot.size + 1} 位運動員</span>`;
    addBtn.onclick = () => {
      renderAddColorPicker();
      document.getElementById('add-modal').classList.remove('hidden');
    };
    container.appendChild(addBtn);

  } catch (err) {
    console.error("載入運動員失敗:", err);
    showCustomAlert("載入運動員失敗: " + err.message, "❌");
  }
}

// 建立運動員卡片（採用原生行內樣式鎖死，無視任何 Tailwind CDN 未編譯問題）
function createAthleteCard(id, data) {
  const wrapper = document.createElement('div');
  
  // 原生 Inline Style 強制鎖定卡片相對定位與圓角遮罩
  wrapper.style.cssText = "position: relative !important; overflow: hidden !important; border-radius: 1.5rem !important; margin-bottom: 1rem; user-select: none;";
  wrapper.className = "shadow-sm border border-slate-200/60";

  const themeColors = {
    blue: 'bg-blue-600',
    green: 'bg-emerald-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600'
  };
  const bgClass = themeColors[data.theme] || 'bg-blue-600';

  wrapper.innerHTML = `
    <!-- 背景操作按鈕層 (原生絕對定位，100% 錨定於上方 wrapper) -->
    <div style="position: absolute !important; top: 0 !important; bottom: 0 !important; right: 0 !important; height: 100% !important; display: flex !important; align-items: center !important; z-index: 1 !important;">
      <button class="btn-change-color bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 flex items-center justify-center transition cursor-pointer" style="height: 100% !important; border: none !important;" type="button">更換顏色</button>
      <button class="btn-delete bg-red-600 hover:bg-red-700 text-white font-bold px-5 flex items-center justify-center transition cursor-pointer" style="height: 100% !important; border: none !important;" type="button">刪除</button>
    </div>

    <!-- 前景卡片內容層 (原生相對定位 z-index: 2 蓋住按鈕) -->
    <div class="swipe-content ${bgClass} p-5 rounded-3xl text-white flex items-center justify-between cursor-pointer" style="position: relative !important; z-index: 2 !important; width: 100% !important; transition: transform 0.2s ease-out; will-change: transform;">
      <div class="flex items-center gap-4">
        <img src="${data.avatar || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'1.5\'%3E%3Cpath d=\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\'/%3E%3Ccircle cx=\'12\' cy=\'7\' r=\'4\'/%3E%3C/svg%3E'}" class="w-14 h-14 rounded-full object-cover border-2 border-white/20 shadow-sm flex-shrink-0">
        <div>
          <h3 class="font-black text-xl tracking-tight">${data.name}</h3>
          <p class="text-xs font-medium opacity-90 mt-1">
            出生日期: ${data.dob || '未設定'}
          </p>
          <p class="text-xs font-medium opacity-80 mt-0.5">
            年齡: ${calculateAge(data.dob)} 歲 · 性別: ${data.gender || '未知'}
          </p>
        </div>
      </div>
    </div>
  `;

  const swipeContent = wrapper.querySelector('.swipe-content');
  const btnColor = wrapper.querySelector('.btn-change-color');
  const btnDelete = wrapper.querySelector('.btn-delete');

  let startX = 0;
  let currentX = 0;
  let isSwiping = false;
  const maxSwipe = -160;

  // 滑動手勢操控
  swipeContent.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isSwiping = true;
    swipeContent.style.transition = 'none';
  }, { passive: true });

  swipeContent.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const diffX = e.touches[0].clientX - startX;
    if (diffX < 0 && diffX >= maxSwipe) {
      swipeContent.style.transform = `translateX(${diffX}px)`;
      currentX = diffX;
    } else if (diffX > 0 && currentX < 0) {
      const newX = currentX + diffX;
      swipeContent.style.transform = `translateX(${Math.min(0, newX)}px)`;
    }
  }, { passive: true });

  swipeContent.addEventListener('touchend', () => {
    isSwiping = false;
    swipeContent.style.transition = 'transform 0.2s ease-out';
    if (currentX < maxSwipe / 2) {
      swipeContent.style.transform = `translateX(${maxSwipe}px)`;
      currentX = maxSwipe;
    } else {
      swipeContent.style.transform = `translateX(0px)`;
      currentX = 0;
    }
  });

  // 卡片點擊事件
  swipeContent.addEventListener('click', () => {
    if (currentX !== 0) {
      swipeContent.style.transition = 'transform 0.2s ease-out';
      swipeContent.style.transform = `translateX(0px)`;
      currentX = 0;
      return;
    }
    localStorage.setItem('current_athlete_id', id);
    localStorage.setItem('current_athlete_name', data.name);
    localStorage.setItem('current_athlete_dob', data.dob);
    localStorage.setItem('current_athlete_gender', data.gender);
    localStorage.setItem('current_athlete_avatar', data.avatar || '');
    localStorage.setItem('current_athlete_theme', data.theme || 'blue');
    window.location.href = 'select_sport.html';
  });

  btnColor.addEventListener('click', (e) => {
    e.stopPropagation();
    openColorModal(id, data.name, data.theme);
  });

  btnDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDeleteAthlete(id, data.name);
  });

  return wrapper;
}

// 顏色更換 Modal 操控
function openColorModal(id, name, currentTheme) {
  editingAthleteId = id;
  selectedEditColor = currentTheme || 'blue';
  document.getElementById('color-modal-athlete-name').textContent = `運動員：${name}`;

  const container = document.getElementById('edit-color-picker-container');
  if (container) {
    container.innerHTML = '';
    availableColors.forEach(c => {
      const btn = document.createElement('div');
      btn.className = `color-option ${c.bgClass} ${c.name === selectedEditColor ? 'active' : ''}`;
      btn.dataset.color = c.name;
      btn.onclick = () => {
        container.querySelectorAll('.color-option').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        selectedEditColor = c.name;
      };
      container.appendChild(btn);
    });
  }
  document.getElementById('change-color-modal').classList.remove('hidden');
}

// 新增運動員的主題顏色選擇器
function renderAddColorPicker() {
  const container = document.getElementById('color-picker-container');
  if (!container) return;
  container.innerHTML = '';
  availableColors.forEach(c => {
    const btn = document.createElement('div');
    btn.className = `color-option ${c.bgClass} ${c.name === selectedAddColor ? 'active' : ''}`;
    btn.dataset.color = c.name;
    btn.onclick = () => {
      container.querySelectorAll('.color-option').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      selectedAddColor = c.name;
    };
    container.appendChild(btn);
  });
}

// 刪除運動員
function confirmDeleteAthlete(id, name) {
  showCustomConfirm(`確定要刪除運動員「${name}」及其所有紀錄資料嗎？`, async () => {
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "athletes", id));
      loadAthletes();
      showCustomAlert("已成功刪除運動員！", "✅");
    } catch (err) {
      showCustomAlert("刪除失敗: " + err.message, "❌");
    }
  });
}

// 全域頁面載入初始化
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-custom-alert')?.addEventListener('click', () => {
    document.getElementById('custom-alert-modal').classList.add('hidden');
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = user;

    const btnOpenLinkModal = document.getElementById('btn-open-link-modal');
    if (btnOpenLinkModal && currentUser.providerData.some(p => p.providerId === 'google.com')) {
      btnOpenLinkModal.classList.remove('hidden');
    }

    loadAthletes();
  });

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

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

  const avatarInput = document.getElementById('athlete-avatar');
  const avatarTrigger = document.getElementById('avatar-click-trigger');
  const cropModal = document.getElementById('crop-modal');
  const cropImageTarget = document.getElementById('crop-image-target');

  if (avatarTrigger && avatarInput) {
    avatarTrigger.addEventListener('click', () => avatarInput.click());
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        cropImageTarget.src = evt.target.result;
        cropModal.classList.remove('hidden');

        if (cropper) cropper.destroy();
        cropper = new Cropper(cropImageTarget, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 1,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: false,
          cropBoxResizable: false,
          toggleDragModeOnDblclick: false,
        });
      };
      reader.readAsDataURL(file);
      avatarInput.value = '';
    });
  }

  document.getElementById('btn-close-crop')?.addEventListener('click', () => {
    cropModal.classList.add('hidden');
    if (cropper) cropper.destroy();
  });

  document.getElementById('btn-confirm-crop')?.addEventListener('click', () => {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
    croppedAvatarBase64 = canvas.toDataURL('image/jpeg', 0.8);
    document.getElementById('avatar-preview').src = croppedAvatarBase64;
    cropModal.classList.add('hidden');
    cropper.destroy();
  });

  const closeAddModal = () => document.getElementById('add-modal').classList.add('hidden');
  document.getElementById('btn-close-add-modal')?.addEventListener('click', closeAddModal);
  document.getElementById('btn-close-add-modal-x')?.addEventListener('click', closeAddModal);

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
        theme: selectedAddColor,
        createdAt: new Date()
      });
      closeAddModal();
      croppedAvatarBase64 = '';
      document.getElementById('avatar-preview').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
      document.getElementById('add-athlete-form').reset();
      loadAthletes();
      showCustomAlert("運動員新增成功！", "✅");
    } catch (err) {
      showCustomAlert("新增失敗: " + err.message, "❌");
    }
  });

  document.getElementById('btn-close-color-modal')?.addEventListener('click', () => {
    document.getElementById('change-color-modal').classList.add('hidden');
  });

  document.getElementById('btn-confirm-color-modal')?.addEventListener('click', async () => {
    if (!editingAthleteId || !currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid, "athletes", editingAthleteId), {
        theme: selectedEditColor
      });
      document.getElementById('change-color-modal').classList.add('hidden');
      loadAthletes();
      showCustomAlert("主題顏色修改成功！", "✅");
    } catch (err) {
      showCustomAlert("修改失敗: " + err.message, "❌");
    }
  });

  document.getElementById('btn-close-link-modal')?.addEventListener('click', () => {
    document.getElementById('link-password-modal').classList.add('hidden');
  });

  document.getElementById('btn-confirm-link-password')?.addEventListener('click', async () => {
    const newPassword = document.getElementById('new-password-input').value;
    if (!newPassword || newPassword.length < 8) {
      showCustomAlert("密碼長度至少需要 8 位字元！", "⚠️");
      return;
    }
    try {
      await updatePassword(currentUser, newPassword);
      document.getElementById('link-password-modal').classList.add('hidden');
      showCustomAlert("密碼設定/重設成功！", "✅");
    } catch (err) {
      showCustomAlert("設定失敗: " + err.message, "❌");
    }
  });
});
