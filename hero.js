(() => {
  const hero = document.querySelector('.hero');
  const stage = hero.querySelector('.hero-stage');
  const art = hero.querySelector('.art');
  const copy = hero.querySelector('.hero-copy');
  const heading = document.getElementById('hero-title');
  const tagline = document.getElementById('tagline');
  const still = document.getElementById('hero-art');
  const audio = document.getElementById('audio');
  const sleeve = document.getElementById('sleeve');
  const progress = document.getElementById('progress');
  const date = hero.querySelector('.release-date');
  const tastyActions = hero.querySelector('.hero-actions');
  const dateParts = [...date.children];
  const feature = window.bandContent.feature;
  const premiere = window.bandContent.videos.find(item => item.section === 'premiere');
  const single = window.bandContent.releases.find(item => item.title === premiere?.title);
  if (!premiere || !single) return;

  hero.classList.add('hero-carousel');
  hero.dataset.feature = 'video';
  hero.setAttribute('aria-roledescription', 'carousel');
  const tone = document.createElement('div');
  tone.className = 'hero-film-tone';
  tone.setAttribute('aria-hidden', 'true');
  stage.prepend(tone);

  const film = document.createElement('button');
  film.className = 'hero-film';
  film.hidden = true;
  film.setAttribute('aria-label', 'Watch ' + premiere.title + ' official music video');
  film.innerHTML = `<video class="hero-video" muted loop playsinline preload="auto" width="1280" height="720" poster="assets/${premiere.thumb}" aria-hidden="true" src="assets/${premiere.preview}"></video><span class="hero-film-play" aria-hidden="true">${uiIcon('play')}</span>`;
  art.append(film);
  const video = film.querySelector('video');
  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;

  const videoStatus = document.createElement('span');
  videoStatus.className = 'hero-video-status';
  videoStatus.textContent = premiere.type;
  videoStatus.hidden = true;
  date.append(videoStatus);
  const videoActions = document.createElement('div');
  videoActions.className = 'hero-actions hero-video-actions';
  videoActions.hidden = true;
  videoActions.innerHTML = `<button class="button bright">${uiIcon('play')} Watch now</button><a class="button outline" href="https://open.spotify.com/album/${single.spotify}">Listen now ${uiIcon('arrow-out')}</a>`;
  tastyActions.after(videoActions);
  function watchVideo() {
    openDialog(premiere.title + ' — ' + premiere.type, `<iframe class="video" src="https://www.youtube-nocookie.com/embed/${premiere.id}?autoplay=1" title="${premiere.title} official music video" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe><a href="https://www.youtube.com/watch?v=${premiere.id}">Watch on YouTube ${uiIcon('arrow-out')}</a>`);
  }
  film.onclick = watchVideo;
  videoActions.querySelector('button').onclick = watchVideo;

  const controls = document.createElement('div');
  controls.className = 'hero-switcher';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Featured releases');
  controls.innerHTML = `<button class="hero-choice" data-feature="video" aria-pressed="true" aria-label="Show ${premiere.title} video out now">${premiere.title}</button><button class="hero-choice" data-feature="tasty" aria-pressed="false" aria-label="Show ${feature.title} new single">${feature.title}</button><button class="hero-auto" aria-label="Pause featured releases">${uiIcon('pause')}</button>`;
  copy.append(controls);
  const choices = [...controls.querySelectorAll('.hero-choice')];
  const autoButton = controls.querySelector('.hero-auto');
  const announcement = document.createElement('span');
  announcement.className = 'sr';
  announcement.setAttribute('role', 'status');
  controls.append(announcement);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 'video';
  let manualPause = false;
  let visible = true;
  let timer;
  let switching;
  let entering;

  function syncVideo() {
    const eligible = current === 'video' && !manualPause && visible && !document.hidden && !document.documentElement.classList.contains('intro-active') && !reduced.matches && !document.getElementById('dialog').open;
    film.toggleAttribute('data-scene-eligible', eligible);
    const shouldPlay = eligible && !film.hasAttribute('data-scene-hold');
    video.autoplay = shouldPlay;
    video.muted = true;
    if (shouldPlay) {
      video.play().catch(() => {});
    } else video.pause();
  }
  function updateAutoButton() {
    autoButton.hidden = reduced.matches;
    autoButton.setAttribute('aria-label', manualPause ? 'Resume featured releases' : 'Pause featured releases');
    autoButton.querySelector('use').setAttribute('href', manualPause ? '#ui-play' : '#ui-pause');
  }
  function schedule() {
    clearTimeout(timer);
    if (manualPause || reduced.matches || !visible || document.hidden || document.documentElement.classList.contains('intro-active')) return;
    timer = setTimeout(() => {
      const activeActions = current === 'video' ? videoActions : tastyActions;
      if (!controls.matches(':hover') && !activeActions.matches(':hover') && !hero.contains(document.activeElement) && audio.paused && !document.getElementById('dialog').open) {
        show(current === 'tasty' ? 'video' : 'tasty', false);
      } else schedule();
    }, 9000);
  }
  function setTitle(title) {
    const parts = document.createDocumentFragment();
    let index = 0;
    for (const word of title.split(' ')) {
      if (parts.childNodes.length) parts.append(' ');
      const group = document.createElement('span');
      group.className = 'hero-word';
      group.setAttribute('aria-hidden', 'true');
      for (const character of word) {
        const letter = document.createElement('span');
        letter.className = 'hero-letter';
        letter.setAttribute('aria-hidden', 'true');
        letter.style.setProperty('--letter-index', String(index));
        letter.style.setProperty('--letter-delay', Math.min(index, 8) * 18 + 'ms');
        letter.textContent = character;
        group.append(letter);
        index++;
      }
      parts.append(group);
    }
    heading.setAttribute('aria-label', title);
    heading.replaceChildren(parts);
  }

  function paint(animate = false) {
    const isVideo = current === 'video';
    hero.dataset.feature = current;
    setTitle(isVideo ? premiere.title : feature.title);
    tagline.textContent = isVideo ? 'OUT NOW' : feature.tagline;
    for (const part of dateParts) part.hidden = isVideo;
    videoStatus.hidden = !isVideo;
    tastyActions.hidden = isVideo;
    videoActions.hidden = !isVideo;
    still.hidden = isVideo;
    film.hidden = !isVideo;
    sleeve.hidden = isVideo;
    progress.hidden = isVideo || audio.currentTime === 0;
    hero.classList.remove('hero-switching');
    hero.classList.toggle('hero-entering', animate);
    if (animate) entering = setTimeout(() => hero.classList.remove('hero-entering'), 650);
    syncVideo();
  }
  function show(next, manual) {
    if (manual) {
      announcement.textContent = next === 'video' ? premiere.title + ' official music video, out now.' : feature.title + ' new single, ' + feature.dateLabel + '.';
    }
    if (next !== current) {
      clearTimeout(switching);
      clearTimeout(entering);
      hero.classList.remove('hero-entering');
      current = next;
      audio.pause();
      for (const button of choices) button.setAttribute('aria-pressed', String(button.dataset.feature === current));
      if (reduced.matches) paint();
      else if (hero.dataset.feature === current) paint(true);
      else {
        hero.classList.add('hero-switching');
        switching = setTimeout(() => paint(true), 220);
      }
    }
    schedule();
  }
  for (const button of choices) button.onclick = () => show(button.dataset.feature, true);
  autoButton.onclick = () => { manualPause = !manualPause; updateAutoButton(); syncVideo(); schedule(); };
  for (const event of ['pointerenter', 'pointerleave', 'focusin', 'focusout']) hero.addEventListener(event, schedule);
  for (const event of ['play', 'pause']) audio.addEventListener(event, schedule);
  for (const event of ['loadeddata', 'canplay']) video.addEventListener(event, syncVideo);
  new MutationObserver(syncVideo).observe(film, { attributes: true, attributeFilter: ['data-scene-hold'] });
  addEventListener('pageshow', syncVideo);
  document.addEventListener('visibilitychange', () => { syncVideo(); schedule(); });
  new MutationObserver(() => { syncVideo(); schedule(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(() => { syncVideo(); schedule(); }).observe(document.getElementById('dialog'), { attributes: true, attributeFilter: ['open'] });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncVideo(); schedule(); }).observe(hero);
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      clearTimeout(switching);
      clearTimeout(entering);
      paint();
    }
    updateAutoButton();
    syncVideo();
    schedule();
  });
  paint();
  updateAutoButton();
  schedule();
})();
