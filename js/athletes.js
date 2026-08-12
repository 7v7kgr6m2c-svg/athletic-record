// 在 js/athletes.js 檔案底部：
let isAuthChecking = false;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 綁定所有 DOM 按鈕事件... (保留原本綁定的程式碼)

    // 2. 監聽 Firebase 登入狀態 (修正跳轉問題)
    onAuthStateChanged(auth, async (user) => {
        if (isAuthChecking) return;
        isAuthChecking = true;

        if (!user) {
            // 未登入，重定向回登入頁
            window.location.replace('index.html');
            return;
        }

        currentUser = user;
        checkUserProviders(user);
        setTodayAsDefault();
        renderColorPicker();
        await fetchAthletes();
        
        isAuthChecking = false;
    });
});
