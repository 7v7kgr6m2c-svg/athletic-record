import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // 監聽 Auth 狀態 (只在已登入時自動跳轉)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.replace('athletes.html');
        }
    });

    const closeBtn = document.getElementById('alert-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeAlert);

    const emailLoginBtn = document.getElementById('btn-email-login');
    if (emailLoginBtn) {
        emailLoginBtn.addEventListener('click', async () => {
            const email = document.getElementById('email-input')?.value.trim();
            const password = document.getElementById('password-input')?.value;

            if (!email || !password) {
                showAlert('請輸入 Email 與密碼！');
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
                console.error('登入失敗：', err);
                showAlert('登入失敗：' + err.message);
            }
        });
    }

    const googleLoginBtn = document.getElementById('btn-google-login');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
            } catch (err) {
                console.error('Google 登入失敗：', err);
                showAlert('Google 登入失敗：' + err.message);
            }
        });
    }
});

function showAlert(msg) {
    const msgEl = document.getElementById('alert-msg');
    const modalEl = document.getElementById('alert-modal');
    if (msgEl) msgEl.textContent = msg;
    if (modalEl) modalEl.classList.remove('hidden');
}

function closeAlert() {
    const modalEl = document.getElementById('alert-modal');
    if (modalEl) modalEl.classList.add('hidden');
}
