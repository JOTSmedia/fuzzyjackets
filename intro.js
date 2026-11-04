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
  let glassCanvas;

  function finish() {
    if (closed) return;
    closed = true;
    clearTimeout(deadline);
    clearTimeout(completionTimer);
    cancelAnimationFrame(frame);
    glassCanvas?.remove();
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

  // Bake the glass and its halo once. During the burst each draw only moves a sprite.
  function glassTexture(pink, bevel) {
    const tile = document.createElement('canvas');
    tile.width = 100;
    tile.height = 60;
    const ctx = tile.getContext('2d');
    const hue = pink ? 324 : 270;
    const skin = ctx.createLinearGradient(0, 23, 0, 37);
    skin.addColorStop(0, `hsl(${hue} 90% 67%)`);
    skin.addColorStop(0.35, '#fff0ff');
    skin.addColorStop(0.50, `hsl(${hue} 100% 70%)`);
    skin.addColorStop(1, `hsl(${hue} 86% 45%)`);
    ctx.shadowColor = `hsl(${hue} 100% 62%)`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(13, 32);
    ctx.lineTo(23 + bevel, 24);
    ctx.lineTo(88, 25);
    ctx.lineTo(79 - bevel, 36);
    ctx.lineTo(21, 35);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,245,255,.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(15, 32);
    ctx.lineTo(24 + bevel, 25);
    ctx.lineTo(86, 26);
    ctx.stroke();
    return tile;
  }

  function burstGlass() {
    if (closed) return;
    const sign = intro.querySelector('.sign');
    const transform = sign.getScreenCTM();
    const rect = sign.getBoundingClientRect();
    if (!transform || !rect.width) { finish(); return; }

    glassCanvas = document.createElement('canvas');
    glassCanvas.className = 'neon-glass';
    glassCanvas.setAttribute('aria-hidden', 'true');
    const ctx = glassCanvas.getContext('2d');
    if (!ctx) { finish(); return; }
    const width = innerWidth;
    const height = innerHeight;
    const pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
    glassCanvas.width = Math.ceil(width * pixelRatio);
    glassCanvas.height = Math.ceil(height * pixelRatio);
    document.body.append(glassCanvas);
    const tiles = [glassTexture(true, 0), glassTexture(true, 7), glassTexture(false, 0), glassTexture(false, 7)];
    const scale = Math.hypot(transform.a, transform.b);
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.58;
    const spread = Math.min(width, height) * 0.80;
    const shards = [];

    // Each sliver starts at the exact position and tangent of a piece of neon tube.
    for (const {path, length} of strokes) {
      let distance = 0;
      let from = path.getPointAtLength(0).matrixTransform(transform);
      while (distance < length) {
        distance = Math.min(length, distance + 8 + Math.random() * 18);
        const to = path.getPointAtLength(distance).matrixTransform(transform);
        const x = (from.x + to.x) * 0.5;
        const y = (from.y + to.y) * 0.5;
        const angle = Math.atan2(y - cy, x - cx) + (Math.random() - .5) * .65;
        const speed = (.22 + Math.random() * .75) * spread;
        const upper = y < rect.top + rect.height * .48;
        shards.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          angle: Math.atan2(to.y - from.y, to.x - from.x),
          spin: (Math.random() - .5) * 8, flip: 2 + Math.random() * 5,
          width: Math.max(4, Math.hypot(to.x - from.x, to.y - from.y) * 1.37),
          height: Math.max(9, scale * 21), tile: tiles[(upper ? 0 : 2) + Math.floor(Math.random() * 2)]
        });
        from = to;
      }
    }
    intro.classList.add('breaking');
    const start = performance.now();
    function scatter(now) {
      if (closed) return;
      const t = Math.min(1, (now - start) / 720);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (t >= 1) { finish(); return; }
      const travel = 1 - (1 - t) ** 1.6;
      ctx.globalAlpha = 1 - t ** 2;
      for (const shard of shards) {
        const angle = shard.angle + shard.spin * t;
        const c = Math.cos(angle) * pixelRatio;
        const s = Math.sin(angle) * pixelRatio;
        const x = shard.x + shard.vx * travel;
        const y = shard.y + shard.vy * travel + height * .18 * t * t;
        const h = shard.height * (.28 + .72 * Math.abs(Math.cos(shard.flip * t)));
        ctx.setTransform(c, s, -s, c, x * pixelRatio, y * pixelRatio);
        ctx.drawImage(shard.tile, -shard.width / 2, -h / 2, shard.width, h);
      }
      frame = requestAnimationFrame(scatter);
    }
    scatter(start);
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
      intro.classList.add('fully-lit');
      completionTimer = setTimeout(burstGlass, 1500);
    } else {
      frame = requestAnimationFrame(illuminate);
    }
  }
  frame = requestAnimationFrame(illuminate);
})();
