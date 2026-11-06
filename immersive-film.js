(() => {
  const screen = document.querySelector('#watch .video-premiere');
  if (!screen || !window.IntersectionObserver) return;

  // The slight aperture opening runs once. The film is visible before the observer fires.
  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    if (matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      screen.classList.add('film-shutter-pass');
    }
    observer.disconnect();
  });
  observer.observe(screen);
})();
