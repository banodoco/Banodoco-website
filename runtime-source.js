// Development import map; serve.py substitutes this for runtime-release.js.
(() => {
  const base = './';
  window.__runtimeBase = base;
  const map = document.createElement('script');
  map.type = 'importmap';
  map.textContent = JSON.stringify({ imports: {
    './main.js': base + 'main.js',
    './organism/hero-spores.js': base + 'organism/hero-spores.js',
    'three': base + 'vendor/three/three.module.js',
    'three/addons/': base + 'vendor/three/addons/',
  } });
  document.head.appendChild(map);
})();
