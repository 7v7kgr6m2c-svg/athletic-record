import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

console.log("index.js 成功載入並開始初始化...");

document.addEventListener('DOMContentLoaded', () => {
    let hasRedirected = false;

    // 監聽 Firebase 驗證狀態
    onAuthStateChanged(auth, (user) => {
        console.log("Auth 狀態改變，目前 User:", user);
        if (user && !hasRedirected) {
            hasRedirected = true;
            window.location.replace('athletes.html');
        }
    });

    const closeBtn = document.getElementById('alert-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeAlert);

    // Email 密碼登入按鈕
    const emailLoginBtn = document.getElementById('btn-email-login');
    if (emailLoginBtn) {
        emailLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("點擊 Email 登入按鈕");

            const emailInput = document.getElementById('email-input');
            const passwordInput = document.getElementById('password-input');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!email || !password) {
                showAlert('請輸入 Email 與密碼！');
                return;
            }

            try {
                const res = await signInWithEmailAndPassword(auth, email, password);
                console.log("Email 登入成功：", res);
            } catch (err) {
                console.error('Email 登入失敗：', err);
                showAlert('登入失敗：' + (err.message || '帳號或密碼錯誤'));
            }
        });
    }

    // Google 帳號登入按鈕
    const googleLoginBtn = document.getElementById('btn-google-login');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("點擊 Google 登入按鈕");

            const provider = new GoogleAuthProvider();
            try {
                const res = await signInWithPopup(auth, provider);
                console.log("Google 登入成功：", res);
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
