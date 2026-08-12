import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let hasRedirected = false;

// 1. 安全監聽 Firebase 驗證狀態
try {
    onAuthStateChanged(auth, (user) => {
        if (user && !hasRedirected) {
            hasRedirected = true;
            window.location.replace('athletes.html');
        }
    });
} catch (err) {
    console.error("Firebase 初始化受阻，請關閉廣告攔截器：", err);
}

// 2. 顯示與關閉 Alert Modal
window.showAlert = function(msg) {
    const msgEl = document.getElementById('alert-msg');
    const modalEl = document.getElementById('alert-modal');
    if (msgEl) msgEl.textContent = msg;
    if (modalEl) modalEl.classList.remove('hidden');
};

window.closeAlert = function() {
    const modalEl = document.getElementById('alert-modal');
    if (modalEl) modalEl.classList.add('hidden');
};

// 3. 全域 Email 登入處理函數
window.handleEmailLogin = async function() {
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
        window.showAlert('請輸入 Email 與密碼！');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.error('Email 登入失敗：', err);
        window.showAlert('登入失敗：' + (err.message || '帳號或密碼錯誤'));
    }
};

// 4. 全域 Google 登入處理函數
window.handleGoogleLogin = async function() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        console.error('Google 登入失敗：', err);
        if (err.code === 'auth/popup-blocked') {
            window.showAlert('登入彈窗被瀏覽器或擴充功能封鎖，請允許本網站開啟彈窗！');
        } else {
            window.showAlert('Google 登入失敗：' + err.message);
        }
    }
};
