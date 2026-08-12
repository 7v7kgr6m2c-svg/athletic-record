import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const currentAthleteId = localStorage.getItem('current_athlete_id');
const athleteProfile = {
  id: currentAthleteId,
  name: localStorage.getItem('current_athlete_name'),
  dob: localStorage.getItem('current_athlete_dob'),
  gender: localStorage.getItem('current_athlete_gender'),
  avatar: localStorage.getItem('current_athlete_avatar'),
  theme: localStorage.getItem('current_athlete_theme') || 'cyan'
};

let chartInstance = null;

function calculateAge(dobStr) {
  if (!dobStr) return '未知';
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return '未知';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function showAlert(msg, icon = '') {
  alert(`${icon} ${msg}`);
}

function applyTheme(theme) {
  document.documentElement.style.setProperty('--primary-color', theme === 'blue' ? '#0288d1' : '#009688');
}

function setInitialTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('record-date');
  if (dateInput) dateInput.value = today;
}

function initProfileUI() {
  document.getElementById('athlete-name').textContent = athleteProfile.name || '運動員';
  document.getElementById('athlete-dob').textContent = `出生日期: ${athleteProfile.dob || '未填寫'}`;
  document.getElementById('athlete-age').textContent = `年齡: ${calculateAge(athleteProfile.dob)}`;
  document.getElementById('athlete-gender').textContent = `性別: ${athleteProfile.gender || '未指定'}`;

  const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";

  const avatarImg = document.getElementById('avatar-img');
  if (avatarImg) {
    const avatarVal = athleteProfile.avatar;
    avatarImg.src = (avatarVal && avatarVal !== 'null' && avatarVal.trim() !== '') ? avatarVal : defaultAvatar;
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const date = document.getElementById('record-date').value;
  const category = document.getElementById('record-category').value;
  const item = document.getElementById('record-item').value;
  const value = parseFloat(document.getElementById('record-value').value);

  try {
    await addDoc(collection(db, "athletes", currentAthleteId, "swim_records"), {
      date, category, item, value,
      createdAt: new Date()
    });
    showAlert('紀錄儲存成功！', '✅');
    await fetchRecordsFromFirestore();
  } catch (err) {
    showAlert('儲存失敗：' + err.message, '❌');
  }
}

async function fetchRecordsFromFirestore() {
  try {
    const q = query(
      collection(db, "athletes", currentAthleteId, "swim_records"),
      orderBy("date", "asc")
    );
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => doc.data());
    initChart(records);
  } catch (err) {
    console.error("載入紀錄失敗:", err);
  }
}

function initChart(records = []) {
  const ctx = document.getElementById('performance-chart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const labels = records.map(r => r.date);
  const data = records.map(r => r.value);

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['無數據'],
      datasets: [{
        label: '游泳成績 (秒)',
        data: data.length ? data : [0],
        borderColor: '#0288d1',
        backgroundColor: 'rgba(2, 136, 209, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } }
    }
  });
}

function initMainPage() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    if (!currentAthleteId) {
      showAlert('未選擇運動員，將為您返回選擇頁面！', '⚠️');
      setTimeout(() => { window.location.href = 'athletes.html'; }, 1500);
      return;
    }

    initProfileUI();
    applyTheme(athleteProfile.theme);
    setInitialTodayDate();

    await fetchRecordsFromFirestore();

    document.getElementById('record-form').addEventListener('submit', handleFormSubmit);
  });
}

initMainPage();
