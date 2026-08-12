import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 彈出提示框邏輯
function showAlert(msg, isSuccess = false) {
    const msgEl = document.getElementById('alert-msg');
    const iconEl = document.getElementById('alert-icon');
    const modalEl = document.getElementById('alert-modal');

    if (msgEl) msgEl.textContent = msg;
    if (iconEl) {
        if (isSuccess) {
            iconEl.textContent = '✅';
            iconEl.className = 'w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold';
        } else {
            iconEl.textContent = '⚠️';
            iconEl.className = 'w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold';
        }
    }
    if (modalEl) modalEl.classList.remove('hidden');
}

function closeAlert() {
    const modalEl = document.getElementById('alert-modal');
    if (modalEl) modalEl.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    // 綁定 Modal 關閉按鈕事件
    const closeBtn = document.getElementById('alert-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAlert);
    }

    // 自動轉址：若已登入則跳轉至運動員頁面
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = 'athletes.html';
        }
    });

    // 1. 原生 Email + 密碼 登入
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
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                    showAlert('Email 或密碼不正確，請重新檢查！');
                } else if (err.code === 'auth/invalid-email') {
                    showAlert('請輸入有效的 Email 格式！');
                } else {
                    showAlert('登入失敗：' + err.message);
                }
            }
        });
    }

    // 2. Google 快捷登入
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
