// iOS 日期滾輪與選單滾動控制邏輯
export function initPicker(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const column = container.querySelector('.picker-column');
    if (!column) return;

    // 監聽滾動以更新選取狀態
    column.addEventListener('scroll', () => {
        const items = column.querySelectorAll('.picker-item');
        const containerRect = column.getBoundingClientRect();
        const center = containerRect.top + containerRect.height / 2;

        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            const itemCenter = rect.top + rect.height / 2;
            const distance = Math.abs(center - itemCenter);

            if (distance < 20) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    });
}
