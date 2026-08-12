import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let isRedirecting = false;

document.addEventListener('DOMContentLoaded', () => {
    // 檢查登入狀態：只在確定已登入且未在跳轉中時執行
    onAuthStateChanged(auth, (user) => {
        if (user && !isRedirecting) {
            isRedirecting = true;
            window.location.replace('athletes.html'); // 使用 replace 避免按上一頁卡死
        }
    });

    // 綁定 Modal 關閉按鈕
    const closeBtn = document.getElementById('alert-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeAlert);

    // Email 登入
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
                // 成功後會由 onAuthStateChanged 自動觸發轉址
            } catch (err) {
                console.error('登入失敗：', err);
                showAlert('登入失敗：' + err.message);
            }
        });
    }

    // Google 登入
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
