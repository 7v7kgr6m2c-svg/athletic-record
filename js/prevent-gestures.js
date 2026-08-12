document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('gesturechange', function (e) { e.preventDefault(); });
document.addEventListener('gestureend', function (e) { e.preventDefault(); });

document.addEventListener('touchstart', function (e) {
  if (e.touches.length > 1) { e.preventDefault(); }
}, { passive: false });

document.addEventListener('touchmove', function (e) {
  if (e.touches.length > 1) { e.preventDefault(); }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', function (e) {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) { e.preventDefault(); }
  lastTouchEnd = now;
}, false);
