import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // 檢查登入狀態
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = 'athletes.html';
        }
    });

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email')?.value;
            const password = document.getElementById('password')?.value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = 'athletes.html';
            } catch (error) {
                alert('登入失敗：' + error.message);
            }
        });
    }
});
