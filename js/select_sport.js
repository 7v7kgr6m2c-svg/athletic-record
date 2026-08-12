document.addEventListener('DOMContentLoaded', () => {
  const athleteName = localStorage.getItem('current_athlete_name');
  const greetingEl = document.getElementById('athlete-greeting');

  if (greetingEl && athleteName) {
    greetingEl.textContent = `${athleteName} 的記錄項目`;
  }

  document.getElementById('btn-sport-track')?.addEventListener('click', () => {
    window.location.href = 'main_a.html';
  });

  document.getElementById('btn-sport-swim')?.addEventListener('click', () => {
    window.location.href = 'main_s.html';
  });

  document.getElementById('btn-back-athletes')?.addEventListener('click', () => {
    window.location.href = 'athletes.html';
  });
});
