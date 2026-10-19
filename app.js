/* ============================================================
   ОФФТОП ПОСТ — логика номера
   1) Книга: листание разворотов (стрелки, колесо, клавиатура, чипы)
   2) Масштаб разворота под экран
   3) Видеоплеер с главами (как на ютубе)
   ============================================================ */

/* ------------------------------------------------------------
   ВИДЕОГЛАВЫ ВЫПУСКА №1
   Подставь свои тайминги в секундах. Имена глав — любые.
   Пример: эфир 8 минут = 480 секунд.
------------------------------------------------------------ */
const CHAPTERS = [
  { t: 0,   title: 'Начало' },
  { t: 40,  title: 'Сам выпуск' },
  { t: 330, title: 'Новость дня' },
  { t: 460, title: 'Музыкальная пауза' },
];
const VIDEO_FILE = 'video/vypusk-1.mp4'; // путь к файлу на хосте

/* ============================================================
   1+2. КНИГА: листание и масштаб
============================================================ */
(function () {
  const spreads = [...document.querySelectorAll('.spread')];
  const total = spreads.length;
  const pageno = document.getElementById('pageno');
  const chips = [...document.querySelectorAll('#nav a')];
  const dotsBox = document.getElementById('dots');
  if (!spreads.length) return;

  let idx = 0;

  // точки-навигация
  const dots = spreads.map((_, i) => {
    const d = document.createElement('i');
    d.title = 'Разворот ' + (i + 1);
    d.addEventListener('click', () => go(i));
    dotsBox.appendChild(d);
    return d;
  });

  function render() {
    spreads.forEach((s, i) => {
      s.classList.toggle('on', i === idx);
      s.classList.toggle('before', i < idx);
    });
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    pageno.textContent = `разворот ${idx + 1} / ${total}`;
    chips.forEach((c) => {
      const target = parseInt(c.dataset.s, 10);
      c.classList.toggle('active', target === idx);
    });
  }

  function go(i) {
    idx = Math.max(0, Math.min(total - 1, i));
    render();
    if (history.replaceState) history.replaceState(null, '', '#' + spreads[idx].id);
  }
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('prevBtn').addEventListener('click', prev);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    if (e.key === 'Home') go(0);
    if (e.key === 'End') go(total - 1);
  });

  // колесо мыши / тачпад — с задержкой, чтобы листалось по одному
  let wheelLock = false;
  window.addEventListener('wheel', (e) => {
    if (window.innerWidth < 1100) return; // на мобильном — обычный скролл
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < 24) return;
    wheelLock = true;
    setTimeout(() => (wheelLock = false), 650);
    if (e.deltaY > 0) next(); else prev();
  }, { passive: true });

  // чипы навигации → развороты
  chips.forEach((c) => {
    c.addEventListener('click', (e) => {
      e.preventDefault();
      go(parseInt(c.dataset.s, 10) || 0);
    });
  });

  // масштаб разворота под экран
  function fit() {
    const s = Math.min((window.innerWidth - 130) / 1300, (window.innerHeight - 92) / 810, 1.15);
    document.documentElement.style.setProperty('--s', Math.max(s, 0.3));
  }
  window.addEventListener('resize', fit);
  fit();

  // стартовый разворот из хеша (#s3 и т.п.)
  function fromHash() {
    const id = location.hash.slice(1);
    const i = spreads.findIndex((s) => s.id === id);
    if (i >= 0) { idx = i; render(); }
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
  render();
})();

/* ============================================================
   3. ПЛЕЕР С ГЛАВАМИ
============================================================ */
(function () {
  const tv = document.getElementById('player');
  const video = document.getElementById('video');
  if (!tv || !video) return;

  const bar = document.getElementById('bar');
  const fill = document.getElementById('fill');
  const chaptersBox = document.getElementById('chapters');
  const tCur = document.getElementById('t-cur');
  const tDur = document.getElementById('t-dur');

  let duration = 0;
  let marksBuilt = false;

  const fmt = (s) => {
    if (!isFinite(s)) return '--:--';
    s = Math.max(0, Math.round(s));
    const m = Math.floor(s / 60), sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };

  const chips = CHAPTERS.map((ch, i) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.innerHTML = `${ch.title}<span class="t" data-t></span>`;
    b.addEventListener('click', () => { video.currentTime = ch.t; video.play().catch(() => {}); });
    chaptersBox.appendChild(b);
    return b;
  });

  function buildMarks() {
    if (marksBuilt || !duration) return;
    marksBuilt = true;
    CHAPTERS.slice(1).forEach((ch) => {
      const m = document.createElement('div');
      m.className = 'mark';
      m.style.left = (ch.t / duration * 100) + '%';
      m.dataset.ch = ch.title;
      bar.appendChild(m);
    });
  }

  function refresh() {
    const pct = duration ? (video.currentTime / duration * 100) : 0;
    fill.style.width = pct + '%';
    tCur.textContent = fmt(video.currentTime);
    let idx = 0;
    CHAPTERS.forEach((ch, i) => { if (video.currentTime + 0.15 >= ch.t) idx = i; });
    chips.forEach((c, i) => c.classList.toggle('active', i === idx));
  }

  video.addEventListener('loadedmetadata', () => {
    duration = video.duration;
    tDur.textContent = fmt(duration);
    buildMarks();
    chips.forEach((c, i) => {
      const next = CHAPTERS[i + 1] ? CHAPTERS[i + 1].t : duration;
      const span = Math.max(0, next - CHAPTERS[i].t);
      c.querySelector('[data-t]').textContent = fmt(span);
    });
  });

  video.addEventListener('timeupdate', refresh);
  video.addEventListener('seeked', refresh);

  bar.addEventListener('click', (e) => {
    if (!duration) return;
    const r = bar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    video.currentTime = pct * duration;
  });

  video.addEventListener('error', () => {
    tv.classList.add('error');
    video.controls = false;
  });
})();
