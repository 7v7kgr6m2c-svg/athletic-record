import { auth } from './firebase-config.js？v=1.0.1';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// iOS 手勢與滑動鎖定
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        if (!['INPUT', 'BUTTON', 'A'].includes(e.target.tagName)) {
            e.preventDefault();
        }
    }
    lastTouchEnd = now;
}, false);

// 彈窗顯示
function showAlert(msg, isSuccess = false) {
    const alertMsg = document.getElementById('alert-msg');
    const iconEl = document.getElementById('alert-icon');
    if (alertMsg) alertMsg.textContent = msg;
    if (iconEl) {
        if (isSuccess) {
            iconEl.textContent = '✅';
            iconEl.className = 'w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold';
        } else {
            iconEl.textContent = '⚠️';
            iconEl.className = 'w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold';
        }
    }
    document.getElementById('alert-modal')?.classList.remove('hidden');
}

document.getElementById('btn-close-alert')?.addEventListener('click', () => {
    document.getElementById('alert-modal')?.classList.add('hidden');
});

// 防重複跳轉標記
let isRedirecting = false;
onAuthStateChanged(auth, (user) => {
    if (user && !isRedirecting) {
        isRedirecting = true;
        window.location.replace('athletes.html');
    }
});

// Email 登入
document.getElementById('btn-email-login')?.addEventListener('click', async () => {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;

    if (!email || !password) {
        showAlert('請輸入 Email 與密碼！');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.error('登入失敗：', err);
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
            showAlert('Email 或密碼不正確，請重新檢查！');
        } else if (err.code === 'auth/invalid-email') {
            showAlert('請輸入有效的 Email 格式！');
        } else {
            showAlert('登入失敗：' + err.message);
        }
    }
});

// Google 登入
document.getElementById('btn-google-login')?.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        console.error('Google 登入失敗：', err);
        showAlert('Google 登入失敗：' + err.message);
    }
});
