// Illuminate the original sign as the first screen's images and type finish loading.
(() => {
  const intro = document.getElementById('intro');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return;

  const behind = [...document.querySelectorAll('body > header, body > main, body > footer, body > .skip')];
  const skip = document.getElementById('skip-intro');
  const number = document.getElementById('watts');
  const startFocus = document.activeElement;
  let closed = false;
  let target = 0;
  let displayed = 0;
  const minimumDuration = 5000;
  const started = performance.now();
  let last = started;
  let frame;
  let completionTimer;

  function finish() {
    if (closed) return;
    closed = true;
    clearTimeout(deadline);
    clearTimeout(completionTimer);
    cancelAnimationFrame(frame);
    intro.hidden = true;
    behind.forEach(el => { el.inert = false; });
    document.documentElement.classList.remove('intro-active');
    motion.removeEventListener('change', finish);
    if (document.activeElement === skip || startFocus === document.body) {
      document.querySelector('.brand').focus({preventScroll:true});
    }
  }

  const deadline = setTimeout(finish, 8500);
  intro.hidden = false;
  document.documentElement.classList.add('intro-active');
  behind.forEach(el => { el.inert = true; });
  skip.focus({preventScroll:true});
  skip.onclick = finish;
  intro.onkeydown = event => {
    if (event.key === 'Escape') finish();
    if (event.key === 'Tab') { event.preventDefault(); skip.focus(); }
  };
  motion.addEventListener('change', finish);
  const jobs = [
    document.querySelector('.brand img').decode(),
    document.getElementById('hero-art').decode(),
    document.fonts.load('italic 800 1em Bodoni'),
    ...['ink-rays.svg','grain.png'].map(name => {
      const image = new Image();
      image.src = 'assets/' + name;
      return image.decode();
    })
  ];
  for (const job of jobs) {
    Promise.resolve(job).catch(() => {}).then(() => { target += 100 / jobs.length; });
  }

  // Use the paths only as shutters over the original artwork.
  const strokes = [...intro.querySelectorAll('#tube-reveal path')].map(path => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = length + ' ' + (length + 1);
    return { path, length };
  });
  const totalLength = strokes.reduce((sum, stroke) => sum + stroke.length, 0);
  const tip = intro.querySelector('.current-tip');
  let strokeIndex = 0;
  let completedLength = 0;

  function traceSign(progress) {
    const distance = totalLength * progress / 100;
    while (strokeIndex < strokes.length) {
      const { path, length } = strokes[strokeIndex];
      const drawn = Math.max(0, Math.min(length, distance - completedLength));
      path.style.visibility = drawn > 0 ? 'visible' : 'hidden';
      path.style.strokeDashoffset = length - drawn;
      if (drawn < length && progress < 100) {
        const head = path.getPointAtLength(drawn);
        tip.setAttribute('cx', head.x);
        tip.setAttribute('cy', head.y);
        tip.setAttribute('opacity', drawn > 0 ? '1' : '0');
        return;
      }
      completedLength += length;
      strokeIndex++;
    }
    tip.setAttribute('opacity', '0');
  }

  function illuminate(now) {
    if (closed) return;
    displayed = Math.min(target, 100 * (now - started) / minimumDuration, displayed + Math.max(0, now - last) * 0.12);
    last = now;
    traceSign(displayed);
    const percent = Math.min(100, Math.floor(displayed));
    number.textContent = String(percent).padStart(2, '0');
    intro.style.setProperty('--power', percent + '%');
    if (percent === 100) {
      completionTimer = setTimeout(() => {
        intro.classList.add('charged');
        completionTimer = setTimeout(finish, 260);
      }, 1500);
    } else {
      frame = requestAnimationFrame(illuminate);
    }
  }
  frame = requestAnimationFrame(illuminate);
})();
