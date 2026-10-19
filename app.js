/* ============================================================
   ОФФТОП ПОСТ — логика номера
   1) Счётчик страниц и подсветка навигации
   2) Видеоплеер с главами (как на ютубе)
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

/* ------------------------------------------------------------
   1. СТРАНИЦЫ: счётчик + активный пункт навигации
------------------------------------------------------------ */
(function () {
  const pages = document.querySelectorAll('.page');
  const chips = document.querySelectorAll('#nav a');
  const pageno = document.getElementById('pageno');
  const total = pages.length;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const idx = [...pages].indexOf(e.target) + 1;
      pageno.textContent = `стр. ${idx} / ${total}`;
      chips.forEach((c) => {
        const active = c.getAttribute('href') === '#' + e.target.id;
        c.classList.toggle('active', active);
        if (active) {
          // подтягиваем чип в видимую часть ленты на мобильном
          c.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        }
      });
    });
  }, { rootMargin: '-45% 0px -45% 0px' });

  pages.forEach((p) => obs.observe(p));
})();

/* ------------------------------------------------------------
   2. ПЛЕЕР С ГЛАВАМИ
------------------------------------------------------------ */
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

  // Плашки глав
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
    // метки глав на полосе (кроме нулевой)
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
    // активная глава — последняя, чьё время уже началось
    let idx = 0;
    CHAPTERS.forEach((ch, i) => { if (video.currentTime + 0.15 >= ch.t) idx = i; });
    chips.forEach((c, i) => c.classList.toggle('active', i === idx));
  }

  video.addEventListener('loadedmetadata', () => {
    duration = video.duration;
    tDur.textContent = fmt(duration);
    buildMarks();
    // подписи времени на плашках
    chips.forEach((c, i) => {
      const next = CHAPTERS[i + 1] ? CHAPTERS[i + 1].t : duration;
      const span = Math.max(0, next - CHAPTERS[i].t);
      c.querySelector('[data-t]').textContent = fmt(span);
    });
  });

  video.addEventListener('timeupdate', refresh);
  video.addEventListener('seeked', refresh);

  // Клик по полосе — перемотка
  bar.addEventListener('click', (e) => {
    if (!duration) return;
    const r = bar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    video.currentTime = pct * duration;
  });

  // Файла нет — показываем «нет сигнала»
  video.addEventListener('error', () => {
    tv.classList.add('error');
    video.controls = false;
  });

  // Если видео не загрузилось на медленном хосте — проверим по таймауту
  setTimeout(() => {
    if (video.readyState === 0) {
      // ещё не начали грузить metadata (лениво) — не считаем ошибкой
    }
  }, 3000);
})();
