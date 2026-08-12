import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithRedirect, 
    getRedirectResult,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let hasRedirected = false;

// 1. 監聽 Firebase 驗證狀態 (登入成功後自動轉址至 athletes.html)
onAuthStateChanged(auth, (user) => {
    if (user && !hasRedirected) {
        hasRedirected = true;
        window.location.replace('athletes.html');
    }
});

// 2. 頁面初始化：捕捉從 Google 登入頁面重定向回來的結果
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
            console.log("Google 重定向登入成功：", result.user);
            // 登入成功後，onAuthStateChanged 會自動觸發轉址
        }
    } catch (err) {
        console.error('Google 重定向登入失敗：', err);
        if (err.code === 'auth/unauthorized-domain') {
            window.showAlert('登入失敗：未授權的網域，請至 Firebase Console 新增 Authorized Domain。');
        } else {
            window.showAlert('Google 登入失敗：' + (err.message || '無法完成認證'));
        }
    }
});

// 3. 顯示與關閉 Alert Modal (掛載至 window 供全域調用)
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

// 4. Email 登入處理函數 (掛載至 window)
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

// 5. Google 重定向登入處理函數 (採用方案三：signInWithRedirect 替代 Popup)
window.handleGoogleLogin = async function() {
    const provider = new GoogleAuthProvider();
    try {
        // 使用 Redirect 方式進行驗證，完全繞過 Pop-up 彈窗攔截
        await signInWithRedirect(auth, provider);
    } catch (err) {
        console.error('發起 Google 登入失敗：', err);
        window.showAlert('無法啟動 Google 登入：' + err.message);
    }
};
