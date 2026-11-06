// Players open from several controls. Animate the native dialog without delaying
// focus, media cleanup, or Escape.
(() => {
  const dialog = document.getElementById('dialog');
  if (!dialog || typeof dialog.animate !== 'function') return;

  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let entrance;

  function syncEntrance() {
    entrance?.cancel();
    if (dialog.open && motion.matches) {
      entrance = dialog.animate([
        { opacity: 0.88, transform: 'translateY(6px) scale(.992)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 185, easing: 'cubic-bezier(.2,.72,.24,1)' });
    }
  }

  new MutationObserver(syncEntrance).observe(dialog, {
    attributes: true,
    attributeFilter: ['open']
  });
  motion.addEventListener('change', () => { if (!motion.matches) entrance?.cancel(); });
})();
