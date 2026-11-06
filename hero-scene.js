(() => {
  const video = document.querySelector('.hero-film .hero-video');
  if (!video) return;

  const film = video.closest('.hero-film');
  const stage = film.closest('.hero-stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const original = video.src;
  const packed = new URL('assets/hero-bench-packed.mp4', document.baseURI).href;
  const poster = new Image();
  poster.src = 'assets/hero-bench-poster.webp';
  poster.alt = '';
  poster.className = 'hero-scene-poster';
  poster.hidden = true;
  const openingPoster = new Image();
  openingPoster.src = 'assets/hero-bench-opening.webp';
  openingPoster.alt = '';
  openingPoster.className = 'hero-scene-poster hero-opening-poster';
  openingPoster.hidden = true;
  film.prepend(poster, openingPoster);

  let canvas;
  let background;
  let render;
  let pixelRenderer = false;
  let failed = false;
  let callback;
  let openingPending = !reduced.matches;
  let openingFade = false;
  let waitingForNative = false;
  let nativeFadeTimer;
  let holdTimer;
  let loadDeadline;
  film.toggleAttribute('data-scene-hold', openingPending);
  const nativeFrameCallback = typeof video.requestVideoFrameCallback === 'function';

  function cancelFrame() {
    if (callback == null) return;
    if (nativeFrameCallback) video.cancelVideoFrameCallback(callback);
    else cancelAnimationFrame(callback);
    callback = undefined;
  }

  function showPoster(image = poster) {
    film.classList.add('has-hero-scene', 'hero-scene-still');
    poster.hidden = image !== poster;
    openingPoster.hidden = image !== openingPoster;
    canvas?.remove();
    background?.remove();
  }

  function finishNativeFade() {
    clearTimeout(nativeFadeTimer);
    nativeFadeTimer = undefined;
    waitingForNative = false;
    film.classList.remove('hero-native-entering');
    openingPoster.hidden = true;
  }

  function startNativeFadeWhenReady() {
    if (!waitingForNative || !film.hasAttribute('data-scene-eligible') ||
        video.currentSrc !== original || video.readyState < 2) return;
    waitingForNative = false;
    film.classList.remove('has-hero-scene', 'hero-scene-still');
    film.classList.add('hero-native-entering');
    nativeFadeTimer = setTimeout(finishNativeFade, 900);
  }

  function fadeToNative() {
    if (!openingFade || reduced.matches || !openingPoster.naturalWidth) return;
    openingFade = false;
    waitingForNative = true;
    showPoster(openingPoster);
    startNativeFadeWhenReady();
  }

  function endOpening(fade) {
    clearTimeout(holdTimer);
    clearTimeout(loadDeadline);
    holdTimer = loadDeadline = undefined;
    openingPending = false;
    openingFade = fade;
    film.removeAttribute('data-scene-hold');
    if (failed) {
      openingPoster.hidden = true;
      film.classList.remove('has-hero-scene', 'hero-scene-still');
      fadeToNative();
    }
  }

  function syncOpening() {
    if (!openingPending) return;
    if (reduced.matches) { endOpening(false); return; }
    if (openingPoster.naturalWidth) showPoster(openingPoster);
    if (!film.hasAttribute('data-scene-eligible')) {
      clearTimeout(holdTimer);
      clearTimeout(loadDeadline);
      holdTimer = loadDeadline = undefined;
      return;
    }
    if (!openingPoster.naturalWidth) {
      loadDeadline ??= setTimeout(() => endOpening(false), 1800);
      return;
    }
    clearTimeout(loadDeadline);
    loadDeadline = undefined;
    holdTimer ??= setTimeout(() => endOpening(true), 450);
  }

  // RGB fills the upper half of the video. The lower half is a grayscale
  // matte, sampled at precisely the same moment and spatial coordinates.
  function newForeground() {
    canvas?.remove();
    canvas = document.createElement('canvas');
    canvas.className = 'hero-scene';
    canvas.setAttribute('aria-hidden', 'true');
  }

  function createRenderer() {
    newForeground();
    background = document.createElement('canvas');
    background.className = 'hero-scene-background';
    background.setAttribute('aria-hidden', 'true');
    const scenery = background.getContext('2d', { alpha: false });
    if (!scenery) throw new Error('Canvas unavailable');

    let paint;
    try {
      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, depth: false, antialias: false });
      if (!gl) throw new Error('WebGL unavailable');
      paint = createGpuPainter(gl);
    } catch (error) {
      paint = createPixelPainter();
    }
    return mediaTime => {
      const width = video.videoWidth;
      const height = video.videoHeight / 2;
      if (!width || !height || Math.abs(width / height - 16 / 9) > .02) throw new Error('Invalid packed frame');
      try {
        if (!paint(mediaTime, width, height)) return;
      } catch (error) {
        if (pixelRenderer) throw error;
        paint = createPixelPainter();
        paint(mediaTime, width, height);
      }
      if (background.width !== canvas.width || background.height !== canvas.height) {
        background.width = canvas.width;
        background.height = canvas.height;
      }
      const opacity = sceneryOpacity(mediaTime);
      background.style.opacity = String(opacity);
      if (opacity > 0) scenery.drawImage(video, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
    };
  }

  // Read one small RGB/matte pair for each displayed frame on devices without
  // WebGL. Reuse the RGB portion in-place rather than allocating another copy.
  function createPixelPainter() {
    newForeground();
    pixelRenderer = true;
    const width = 640;
    const height = 360;
    canvas.width = width;
    canvas.height = height;
    const output = canvas.getContext('2d');
    const buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height * 2;
    const input = buffer.getContext('2d', { willReadFrequently: true });
    if (!output || !input) throw new Error('Canvas unavailable');
    const alpha = Uint8ClampedArray.from({ length: 256 }, (_, value) => (value - 2) / .984);
    const bytes = width * height * 4;
    let lastFrame = -1;

    return mediaTime => {
      const frame = Math.floor(mediaTime * 16);
      if (frame === lastFrame && !video.paused) return false;
      lastFrame = frame;
      input.drawImage(video, 0, 0, width, height * 2);
      const pixels = input.getImageData(0, 0, width, height * 2).data;
      for (let i = 0; i < bytes; i += 4) pixels[i + 3] = alpha[pixels[bytes + i]];
      output.putImageData(new ImageData(pixels.subarray(0, bytes), width, height), 0, 0);
      return true;
    };
  }

  function createGpuPainter(gl) {
    const program = gl.createProgram();
    const sources = [
      [gl.VERTEX_SHADER, `
        attribute vec2 point;
        varying vec2 uv;
        void main(){
          uv = vec2(point.x * .5 + .5, .5 - point.y * .5);
          gl_Position = vec4(point, 0., 1.);
        }`],
      [gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 uv;
        uniform sampler2D frame;
        uniform float rowInset;
        void main(){
          float y = mix(rowInset, .5 - rowInset, uv.y);
          vec3 rgb = texture2D(frame, vec2(uv.x, y)).rgb;
          float matte = texture2D(frame, vec2(uv.x, .5 + y)).r;
          float alpha = clamp((matte - .008) / .984, 0., 1.);
          gl_FragColor = vec4(rgb * alpha, alpha);
        }`]
    ];
    for (const [type, source] of sources) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader unavailable');
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program unavailable');
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const point = gl.getAttribLocation(program, 'point');
    gl.enableVertexAttribArray(point);
    gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const inset = gl.getUniformLocation(program, 'rowInset');
    return (_time, width, height) => {
      if (gl.isContextLost()) throw new Error('WebGL context lost');
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform1f(inset, .5 / video.videoHeight);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    };
  }

  // Two 560ms sweeps reveal the real park around the pose changes.
  function flash(time, center, strength) {
    const offset = Math.abs(time - center) / .28;
    return offset < 1 ? strength * (1 + Math.cos(Math.PI * offset)) / 2 : 0;
  }

  function sceneryOpacity(time) {
    const pulse = flash(time, 26 / 24, .36) + flash(time, 52 / 24, .52);
    if (!openingFade) return pulse;
    if (time >= 1.6 || film.hidden) {
      openingFade = false;
      return pulse;
    }
    const fraction = time < .9 ? time / .9 : (1.6 - time) / .7;
    const opening = .52 * (1 - Math.cos(Math.PI * fraction)) / 2;
    return Math.max(pulse, opening);
  }

  function fallback() {
    failed = true;
    cancelFrame();
    canvas?.remove();
    background?.remove();
    film.classList.remove('has-hero-scene', 'hero-scene-still');
    poster.hidden = openingPoster.hidden = true;
    if (video.src === packed) video.src = original;
    if (reduced.matches && poster.naturalWidth) showPoster();
    else if (openingPending && openingPoster.naturalWidth) showPoster(openingPoster);
    else fadeToNative();
  }

  function draw(time = video.currentTime) {
    if (openingPending || failed || reduced.matches || document.hidden || film.hidden || video.readyState < 2 || video.currentSrc !== packed) return;
    try {
      render(time);
    } catch {
      fallback();
      return;
    }
    if (!canvas.isConnected) {
      stage.prepend(background);
      film.prepend(canvas);
    }
    film.classList.add('has-hero-scene');
    film.classList.remove('hero-scene-still');
    poster.hidden = openingPoster.hidden = true;
  }

  function queueFrame() {
    if (callback != null || failed || reduced.matches || document.hidden || film.hidden || video.paused || video.currentSrc !== packed) return;
    const tick = (_now, metadata) => {
      callback = undefined;
      draw(metadata?.mediaTime ?? video.currentTime);
      queueFrame();
    };
    callback = nativeFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  }

  function sync() {
    cancelFrame();
    syncOpening();
    if (reduced.matches) {
      openingFade = false;
      finishNativeFade();
      if (poster.naturalWidth) showPoster();
      return;
    }
    if (openingPending && !openingPoster.naturalWidth) return;
    if (film.hidden) openingFade = false;
    if (failed) {
      if (film.hidden) finishNativeFade();
      if (waitingForNative || nativeFadeTimer !== undefined) {
        startNativeFadeWhenReady();
        return;
      }
      if (!openingPending) {
        film.classList.remove('has-hero-scene', 'hero-scene-still');
        poster.hidden = openingPoster.hidden = true;
      }
      return;
    }
    if (!render) {
      try { render = createRenderer(); } catch { fallback(); return; }
    }
    if (video.src !== packed) {
      // The hero owns playback. Its canplay handler checks pause, visibility,
      // the intro and the opening hold again after this source replacement.
      if (openingPending && openingPoster.naturalWidth) showPoster(openingPoster);
      else if (poster.naturalWidth) showPoster();
      video.src = packed;
    }
    draw();
    queueFrame();
  }

  openingPoster.decode().then(sync).catch(() => { endOpening(false); sync(); });
  poster.decode().then(sync).catch(() => {});
  for (const event of ['loadeddata', 'seeked', 'playing', 'pause']) {
    video.addEventListener(event, () => {
      cancelFrame();
      if (failed) { startNativeFadeWhenReady(); return; }
      if (video.currentSrc !== packed || !render) return;
      draw();
      queueFrame();
    });
  }
  video.addEventListener('error', () => { if (video.src === packed) fallback(); });
  new MutationObserver(sync).observe(film, { attributes: true, attributeFilter: ['hidden', 'data-scene-eligible'] });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
})();
