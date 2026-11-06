(() => {
  const canTilt = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const jackets = document.querySelectorAll('#music .record-pic');
  let active;
  let frame = 0;
  let pointerX;
  let pointerY;

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!active) return;
    active.style.removeProperty('--jacket-pitch');
    active.style.removeProperty('--jacket-yaw');
    active = undefined;
  }

  function tilt() {
    frame = 0;
    const rect = active.getBoundingClientRect();
    const x = Math.min(1, Math.max(-1, (pointerX - rect.left) / rect.width * 2 - 1));
    const y = Math.min(1, Math.max(-1, (pointerY - rect.top) / rect.height * 2 - 1));
    active.style.setProperty('--jacket-pitch', (-y * 3).toFixed(2) + 'deg');
    active.style.setProperty('--jacket-yaw', (x * 4).toFixed(2) + 'deg');
  }

  for (const jacket of jackets) {
    jacket.addEventListener('pointermove', event => {
      if (!canTilt.matches || event.pointerType === 'touch') return;
      if (jacket !== active) reset();
      active = jacket;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = requestAnimationFrame(tilt);
    });
    jacket.addEventListener('pointerleave', reset);
    jacket.addEventListener('pointercancel', reset);
  }
  canTilt.addEventListener('change', reset);
})();
