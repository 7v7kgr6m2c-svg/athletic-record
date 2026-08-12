export class IOSDatePicker {
  constructor({ wheelYear, wheelMonth, wheelDay, onSelect }) {
    this.wheelYear = document.getElementById(wheelYear);
    this.wheelMonth = document.getElementById(wheelMonth);
    this.wheelDay = document.getElementById(wheelDay);
    this.onSelect = onSelect;
    this.selectedYear = new Date().getFullYear();
    this.selectedMonth = new Date().getMonth() + 1;
    this.selectedDay = new Date().getDate();
  }

  init() {
    this.renderYears();
    this.renderMonths();
    this.renderDays();
    this.bindEvents();
  }

  renderYears() {
    const currentYear = new Date().getFullYear();
    this.wheelYear.innerHTML = '';
    for (let y = currentYear; y >= currentYear - 80; y--) {
      const item = document.createElement('div');
      item.className = `picker-item ${y === this.selectedYear ? 'selected' : ''}`;
      item.dataset.value = y;
      item.textContent = `${y}年`;
      this.wheelYear.appendChild(item);
    }
  }

  renderMonths() {
    this.wheelMonth.innerHTML = '';
    for (let m = 1; m <= 12; m++) {
      const item = document.createElement('div');
      item.className = `picker-item ${m === this.selectedMonth ? 'selected' : ''}`;
      item.dataset.value = m;
      item.textContent = `${m}月`;
      this.wheelMonth.appendChild(item);
    }
  }

  renderDays() {
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    this.wheelDay.innerHTML = '';
    if (this.selectedDay > daysInMonth) this.selectedDay = daysInMonth;

    for (let d = 1; d <= daysInMonth; d++) {
      const item = document.createElement('div');
      item.className = `picker-item ${d === this.selectedDay ? 'selected' : ''}`;
      item.dataset.value = d;
      item.textContent = `${d}日`;
      this.wheelDay.appendChild(item);
    }
  }

  bindEvents() {
    const handleScroll = (container, callback) => {
      container.addEventListener('scroll', () => {
        const items = container.querySelectorAll('.picker-item');
        const containerCenter = container.getBoundingClientRect().top + container.clientHeight / 2;
        let closest = null;
        let minDiff = Infinity;

        items.forEach(item => {
          const rect = item.getBoundingClientRect();
          const itemCenter = rect.top + rect.height / 2;
          const diff = Math.abs(containerCenter - itemCenter);
          if (diff < minDiff) {
            minDiff = diff;
            closest = item;
          }
        });

        if (closest) {
          items.forEach(i => i.classList.remove('selected'));
          closest.classList.add('selected');
          callback(parseInt(closest.dataset.value, 10));
        }
      }, { passive: true });
    };

    handleScroll(this.wheelYear, (val) => {
      this.selectedYear = val;
      this.renderDays();
    });

    handleScroll(this.wheelMonth, (val) => {
      this.selectedMonth = val;
      this.renderDays();
    });

    handleScroll(this.wheelDay, (val) => {
      this.selectedDay = val;
    });
  }

  getSelectedDate() {
    const m = String(this.selectedMonth).padStart(2, '0');
    const d = String(this.selectedDay).padStart(2, '0');
    return `${this.selectedYear}-${m}-${d}`;
  }
}
