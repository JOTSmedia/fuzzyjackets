import * as THREE from './assets/vendor/three.module.min.js';

const art = document.querySelector('.art');
const still = document.getElementById('hero-art');
const motion = matchMedia('(prefers-reduced-motion: reduce)');

// The original sleeve remains available while this sculpted interpretation loads.
try {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.className = 'candy-canvas';
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'A rotating ruby-red glass candy with a bitten edge and a plush pink center, inspired by the TASTY. sleeve.');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0.04, 4.6);

  const studio = document.createElement('canvas');
  studio.width = 512;
  studio.height = 256;
  const paint = studio.getContext('2d');
  paint.fillStyle = '#24111f';
  paint.fillRect(0, 0, 512, 256);
  const softbox = paint.createLinearGradient(0, 0, 0, 256);
  softbox.addColorStop(0, '#b66389');
  softbox.addColorStop(0.28, '#fff3ed');
  softbox.addColorStop(0.59, '#ffffff');
  softbox.addColorStop(1, '#200b17');
  paint.fillStyle = softbox;
  paint.fillRect(56, 26, 66, 176);
  paint.fillStyle = '#fca5cc';
  paint.fillRect(331, 37, 18, 120);
  paint.fillStyle = '#dd335a';
  paint.fillRect(201, 98, 35, 115);
  const environment = new THREE.CanvasTexture(studio);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  environment.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studioMap = pmrem.fromEquirectangular(environment);
  scene.environment = studioMap.texture;
  environment.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffe6ed, 0x310013, 1.2));
  const key = new THREE.DirectionalLight(0xffede9, 2.5);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff2780, 2.5);
  rim.position.set(3, 1, -2);
  scene.add(rim);

  const candy = new THREE.Group();
  scene.add(candy);
  const radius = 1;
  const biteRadius = 0.87;
  const distance = 1.08;
  const axis = new THREE.Vector3(0.52, 0.54, 0.82).normalize();
  const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  const cutHeight = (radius * radius - biteRadius * biteRadius + distance * distance) / (2 * distance);
  const cutAngle = Math.acos(cutHeight / radius);
  const biteAngle = Math.acos((cutHeight - distance) / biteRadius);
  const center = axis.clone().multiplyScalar(distance);

  const scratches = document.createElement('canvas');
  scratches.width = scratches.height = 256;
  const scratchPaint = scratches.getContext('2d');
  scratchPaint.fillStyle = '#808080';
  scratchPaint.fillRect(0, 0, 256, 256);
  let seed = 1948;
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < 240; i++) {
    const x = random() * 256;
    const y = random() * 256;
    scratchPaint.strokeStyle = `rgba(255,255,255,${0.05 + random() * 0.18})`;
    scratchPaint.lineWidth = 0.3;
    scratchPaint.beginPath();
    scratchPaint.moveTo(x, y);
    scratchPaint.lineTo(x + 6 + random() * 42, y + random() * 2);
    scratchPaint.stroke();
  }
  const scratchMap = new THREE.CanvasTexture(scratches);
  scratchMap.wrapS = scratchMap.wrapT = THREE.RepeatWrapping;
  scratchMap.repeat.set(3, 2);
  const sleeve = new Image();
  sleeve.src = 'assets/tasty.webp';
  await sleeve.decode();
  const candyTexture = document.createElement('canvas');
  candyTexture.width = candyTexture.height = 512;
  candyTexture.getContext('2d').drawImage(sleeve, 265, 520, 330, 270, 0, 0, 512, 512);
  const shellTexture = new THREE.CanvasTexture(candyTexture);
  shellTexture.colorSpace = THREE.SRGBColorSpace;
  shellTexture.wrapS = shellTexture.wrapT = THREE.MirroredRepeatWrapping;
  const shell = new THREE.MeshPhysicalMaterial({
    map: shellTexture, color: 0xff8290, metalness: 0.04, roughness: 0.19,
    clearcoat: 1, clearcoatRoughness: 0.08,
    transmission: 0.18, thickness: 0.9, ior: 1.48,
    bumpMap: scratchMap, bumpScale: 0.013,
    attenuationColor: new THREE.Color(0xc40024), attenuationDistance: 0.65
  });
  const outside = new THREE.SphereGeometry(radius, 112, 72, 0, Math.PI * 2, cutAngle, Math.PI - cutAngle);
  outside.applyQuaternion(orientation);
  candy.add(new THREE.Mesh(outside, shell));

  // Inverted cutter surface forms a concave, fur-lined bite that turns with the shell.
  const inside = new THREE.SphereGeometry(biteRadius, 96, 48, 0, Math.PI * 2, biteAngle, Math.PI - biteAngle);
  inside.applyQuaternion(orientation);
  inside.translate(center.x, center.y, center.z);
  const normals = inside.attributes.normal;
  for (let i = 0; i < normals.count; i++) {
    normals.setXYZ(i, -normals.getX(i), -normals.getY(i), -normals.getZ(i));
  }
  const triangles = inside.index.array;
  for (let i = 0; i < triangles.length; i += 3) {
    [triangles[i], triangles[i + 2]] = [triangles[i + 2], triangles[i]];
  }
  const cavityColors = [];
  const point = new THREE.Vector3();
  const cavityColor = new THREE.Color();
  for (let i = 0; i < inside.attributes.position.count; i++) {
    point.fromBufferAttribute(inside.attributes.position, i).sub(center);
    const depth = (point.dot(axis) / biteRadius + 1) / (Math.cos(biteAngle) + 1);
    cavityColor.setHSL(0.9, 0.92, 0.055 + depth * 0.19);
    cavityColors.push(cavityColor.r, cavityColor.g, cavityColor.b);
  }
  inside.setAttribute('color', new THREE.Float32BufferAttribute(cavityColors, 3));
  const plush = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  candy.add(new THREE.Mesh(inside, plush));

  const positions = [];
  const colors = [];
  const pink = new THREE.Color();
  const strandCount = innerWidth < 650 ? 9500 : 17000;
  for (let i = 0; i < strandCount; i++) {
    const y = -1 + random() * (Math.cos(biteAngle) + 1);
    const phi = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    const outward = new THREE.Vector3(ring * Math.cos(phi), y, ring * Math.sin(phi)).applyQuaternion(orientation);
    const root = outward.clone().multiplyScalar(biteRadius).add(center);
    const normal = outward.negate();
    const tangent = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).cross(normal).normalize();
    const length = 0.03 + random() * 0.075;
    const middle = root.clone().addScaledVector(normal, length * 0.56).addScaledVector(tangent, length * 0.23);
    const tip = root.clone().addScaledVector(normal, length).addScaledVector(tangent, length * (random() - 0.1));
    positions.push(...root, ...middle, ...middle, ...tip);
    const edgeLight = (y + 1) / (Math.cos(biteAngle) + 1);
    pink.setHSL(0.88 + random() * 0.035, 0.7 + random() * 0.28, 0.06 + edgeLight * 0.22 + random() * 0.1);
    for (let v = 0; v < 4; v++) colors.push(pink.r, pink.g, pink.b);
  }
  const furGeometry = new THREE.BufferGeometry();
  furGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  furGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  candy.add(new THREE.LineSegments(furGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.87 })));

  const rimOrientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
  const rimRadius = Math.sqrt(1 - cutHeight * cutHeight);
  const glassEdge = new THREE.Mesh(new THREE.TorusGeometry(rimRadius, 0.012, 5, 96), shell);
  glassEdge.quaternion.copy(rimOrientation);
  glassEdge.position.copy(axis).multiplyScalar(cutHeight);
  candy.add(glassEdge);
  const chipGeometry = new THREE.IcosahedronGeometry(0.028, 0);
  for (let i = 0; i < 22; i++) {
    const angle = i * Math.PI * 2 / 22;
    const chip = new THREE.Mesh(chipGeometry, shell);
    chip.position.set(rimRadius * Math.cos(angle), rimRadius * Math.sin(angle), 0);
    chip.position.applyQuaternion(rimOrientation).addScaledVector(axis, cutHeight);
    chip.rotation.set(random(), random() * Math.PI, random());
    chip.scale.set(0.6 + random(), 0.5 + random(), 0.5 + random());
    candy.add(chip);
  }

  art.append(renderer.domElement);
  const pause = document.createElement('button');
  pause.className = 'candy-toggle';
  pause.textContent = 'Pause rotation';
  pause.setAttribute('aria-pressed', 'false');
  pause.hidden = motion.matches;
  document.querySelector('.hero-stage').append(pause);
  let paused = false;
  let visible = true;
  let frame = 0;
  let previous = 0;

  function render() {
    renderer.render(scene, camera);
  }
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden || paused || motion.matches || document.documentElement.classList.contains('intro-active')) return;
    if (previous) candy.rotation.y += Math.min(now - previous, 50) * (Math.PI * 2 / 40000);
    previous = now;
    render();
    frame = requestAnimationFrame(tick);
  }
  function syncAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (visible && !document.hidden && !paused && !motion.matches && !document.documentElement.classList.contains('intro-active')) frame = requestAnimationFrame(tick);
    render();
  }
  function resize() {
    const { width, height } = art.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 1 ? 4.6 / camera.aspect : 4.6;
    camera.updateProjectionMatrix();
    render();
  }
  new ResizeObserver(resize).observe(art);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncAnimation(); }).observe(art);
  document.addEventListener('visibilitychange', syncAnimation);
  new MutationObserver(syncAnimation).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  motion.addEventListener('change', () => {
    pause.hidden = motion.matches;
    if (motion.matches) candy.rotation.y = 0;
    syncAnimation();
  });
  pause.onclick = () => {
    paused = !paused;
    pause.textContent = paused ? 'Resume rotation' : 'Pause rotation';
    pause.setAttribute('aria-pressed', String(paused));
    syncAnimation();
  };
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    art.classList.remove('candy-ready');
    pause.hidden = true;
  });
  resize();
  art.classList.add('candy-ready');
  still.setAttribute('aria-hidden', 'true');
  syncAnimation();
} catch {
  // Keep the original cover detail visible when 3D rendering is unavailable.
}
