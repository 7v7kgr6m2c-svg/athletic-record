import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    let hasRedirected = false;

    // 監聽 Firebase 驗證狀態
    onAuthStateChanged(auth, (user) => {
        // 只有在「確定已登入」且「尚未執行過轉址」時才跳轉
        if (user && !hasRedirected) {
            hasRedirected = true;
            window.location.replace('athletes.html');
        }
    });

    // 彈窗關閉按鈕
    const closeBtn = document.getElementById('alert-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAlert);
    }

    // Email 密碼登入
    const emailLoginBtn = document.getElementById('btn-email-login');
    if (emailLoginBtn) {
        emailLoginBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('email-input');
            const passwordInput = document.getElementById('password-input');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!email || !password) {
                showAlert('請輸入 Email 與密碼！');
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, password);
                // 成功後 onAuthStateChanged 會自動處理轉址
            } catch (err) {
                console.error('登入失敗：', err);
                showAlert('登入失敗：' + (err.message || '帳號或密碼錯誤'));
            }
        });
    }

    // Google 帳號登入
    const googleLoginBtn = document.getElementById('btn-google-login');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
                // 成功後 onAuthStateChanged 會自動處理轉址
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
