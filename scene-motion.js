(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = document.getElementById('dialog');
  for (const video of document.querySelectorAll('.scene-video')) {
    const toggle = video.closest('article').querySelector('.scene-motion');
    let visible = false;
    let paused = false;
    video.muted = true;
    function sync() {
      toggle.hidden = reduced.matches;
      if (reduced.matches || paused || !visible || document.hidden || dialog.open) {
        video.pause();
      } else {
        video.play().catch(() => { toggle.hidden = true; });
      }
    }
    toggle.onclick = () => {
      paused = !paused;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.querySelector('use').setAttribute('href', paused ? '#ui-play' : '#ui-pause');
      toggle.querySelector('span').textContent = paused ? 'Resume motion' : 'Pause motion';
      sync();
    };
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(video);
    new MutationObserver(sync).observe(dialog, { attributes: true, attributeFilter: ['open'] });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    video.addEventListener('error', () => { toggle.hidden = true; });
    sync();
  }
})();
