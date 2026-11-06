(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const door = document.querySelector('.music-door');
  const sign = document.querySelector('.closing-sign');
  let queued = false;
  function update() {
    queued = false;
    if (reduced.matches) {
      door.style.removeProperty('--word-shift');
      door.style.removeProperty('--word-width');
      sign.style.removeProperty('--sign-shift');
      return;
    }
    const viewport = innerHeight;
    for (const [element, name, distance] of [[door, '--word-shift', 38], [sign, '--sign-shift', 22]]) {
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < viewport) {
        const progress = Math.max(-1, Math.min(1, (bounds.top + bounds.height / 2 - viewport / 2) / viewport));
        element.style.setProperty(name, (progress * distance).toFixed(2) + 'px');
        if (element === door) door.style.setProperty('--word-width', (95 + progress * 10).toFixed(2));
      }
    }
  }
  function requestUpdate() {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }
  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', requestUpdate);
  reduced.addEventListener('change', requestUpdate);
  requestUpdate();
})();
