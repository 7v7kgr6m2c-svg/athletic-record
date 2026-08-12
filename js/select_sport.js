document.addEventListener('DOMContentLoaded', () => {
    const athleteName = localStorage.getItem('current_athlete_name');
    if (athleteName) {
        document.getElementById('athlete-greeting').textContent = `你好，${athleteName}`;
    }
});

window.goToSport = function(page) {
    window.location.href = page;
};
