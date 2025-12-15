// ========================================
// SYSTÈME AUDIO GLOBAL AVEC TRANSITIONS
// ========================================
// ===============================
// SONS AU HOVER - FONDERON, FOUDRE, EAU (SEULEMENT SI MUSIQUE ON)
// ===============================

function setupHoverSound(selector, soundPath, maxVolume = 0.2, fadeDuration = 500) {
  const zone = document.querySelector(selector);
  if (!zone) {
    console.warn(`⚠️ ${selector} introuvable`);
    return;
  }

  const audio = new Audio(soundPath);
  audio.volume = 0;
  audio.loop = true;

  zone.addEventListener('mouseenter', async () => {
    if (!musicEnabled) return; // 🔒 Ne joue le son que si la musique est activée
    console.log("okjhdfg");
    
    audio.currentTime = 0;
    await audio.play().catch(() => {});
    await fadeIn(audio, maxVolume, fadeDuration);
  });

  zone.addEventListener('mouseleave', async () => {
    if (!musicEnabled) return; // 🔒 Idem pour le fade out
    await fadeOut(audio, fadeDuration);
    audio.pause();
    audio.currentTime = 0;
  });

  console.log(`🔊 Son prêt pour ${selector} (activé seulement si musique ON)`);
}

// === FORGERON ===
setupHoverSound('.zone-forgeron', '../../public/sounds/forge.mp3', 0.2, 500);

// === FOUDRE ===
setupHoverSound('.zone-foudre', '../../public/sounds/thunder.mp3', 0.3, 500);

// === EAU ===
setupHoverSound('.zone-water', '../../public/sounds/vague.wav', 0.4, 500);
setupHoverSound('.zone-chaine', '../../public/sounds/chaine4.mp3', 0.4, 500);

// Configuration des musiques
const musicConfig = {
  ambient: {
    path: '../../public/music/NujabesLuv.mp3',
    name: 'Musique Ambient'
  },
  battle: {
    path: '../../public/music/ChocDesTitan.mp3',
    name: 'Musique Bataille'
  }
};

// Création des audios
const audioTracks = {
  ambient: new Audio(musicConfig.ambient.path),
  battle: new Audio(musicConfig.battle.path)
};

// Config audio
Object.values(audioTracks).forEach(audio => {
  audio.loop = true;
  audio.volume = 0;
});

// États
let currentTrack = null;
let currentChapter = 1;
let isMusicPlaying = false;
let isTransitioning = false;
let musicEnabled = false;

// ========================================
// LOCAL STORAGE
// ========================================
function saveGlobalState() {
  localStorage.setItem('globalMusicEnabled', musicEnabled);
  localStorage.setItem('globalCurrentTrack', currentTrack || '');
  if (currentTrack) {
    localStorage.setItem('globalMusicTime', audioTracks[currentTrack].currentTime);
  }
}

function loadGlobalState() {
  return {
    wasEnabled: localStorage.getItem('globalMusicEnabled') === 'true',
    savedTrack: localStorage.getItem('globalCurrentTrack'),
    savedTime: parseFloat(localStorage.getItem('globalMusicTime')) || 0
  };
}

// ========================================
// FADE
// ========================================
function fadeIn(audio, target = 0.3, duration = 800) {
  audio.volume = 0;
  const step = target / (duration / 50);
  return new Promise(resolve => {
    const i = setInterval(() => {
      audio.volume = Math.min(audio.volume + step, target);
      if (audio.volume >= target) {
        clearInterval(i);
        resolve();
      }
    }, 50);
  });
}

function fadeOut(audio, duration = 800) {
  const step = audio.volume / (duration / 50);
  return new Promise(resolve => {
    const i = setInterval(() => {
      audio.volume = Math.max(audio.volume - step, 0);
      if (audio.volume <= 0) {
        clearInterval(i);
        resolve();
      }
    }, 50);
  });
}

// ========================================
// CROSSFADE
// ========================================
async function crossfade(from, to) {
  if (from === to || isTransitioning) return;
  isTransitioning = true;

  const oldAudio = audioTracks[from];
  const newAudio = audioTracks[to];

  newAudio.currentTime = 0;
  await newAudio.play();

  await Promise.all([
    fadeOut(oldAudio),
    fadeIn(newAudio)
  ]);

  oldAudio.pause();
  oldAudio.currentTime = 0;
  currentTrack = to;
  isTransitioning = false;
}

// ========================================
// PAGE / CHAPITRE
// ========================================
function getCurrentPageTrack() {
  const file = location.pathname.split('/').pop();

  if (file === '' || file === 'index.html' || file === 'homePage.html') {
    return 'ambient';
  }

  if (file === 'zeusPage.html') {
    return currentChapter === 1 ? 'ambient' : 'battle';
  }

  return 'ambient';
}

function handleChapterChange(chapter) {
  if (!musicEnabled || chapter === currentChapter) return;
  currentChapter = chapter;

  const nextTrack = chapter === 1 ? 'ambient' : 'battle';
  if (currentTrack !== nextTrack) {
    crossfade(currentTrack, nextTrack);
  }
}

// ========================================
// GSAP OBSERVER (ZEUS)
// ========================================
function setupScrollObserver() {
  if (!location.pathname.includes('zeusPage.html')) return;

  const octogones = document.querySelectorAll('.octogone');
  octogones.forEach((octo, i) => {
    new MutationObserver(() => {
      if (octo.classList.contains('selected')) {
        handleChapterChange(i + 1);
      }
    }).observe(octo, { attributes: true });
  });

  octogones.forEach((o, i) => {
    if (o.classList.contains('selected')) currentChapter = i + 1;
  });
}

// ========================================
// BOUTON SON
// ========================================
function initSoundButton() {
  const btns = document.querySelectorAll('#toggle-btn');
  const on = document.querySelector('.sound.on');
  const off = document.querySelector('.sound.off');

  if (!btns.length || !on || !off) return;

  const { wasEnabled } = loadGlobalState();
  on.style.display = wasEnabled ? 'block' : 'none';
  off.style.display = wasEnabled ? 'none' : 'block';

  async function toggle() {
    if (isMusicPlaying) {
      await fadeOut(audioTracks[currentTrack]);
      audioTracks[currentTrack].pause();
      isMusicPlaying = false;
      musicEnabled = false;
      on.style.display = 'none';
      off.style.display = 'block';
      saveGlobalState();
    } else {
      const track = getCurrentPageTrack();
      const audio = audioTracks[track];
      await audio.play();
      await fadeIn(audio);
      currentTrack = track;
      isMusicPlaying = true;
      musicEnabled = true;
      on.style.display = 'block';
      off.style.display = 'none';
      saveGlobalState();
    }
  }

  btns.forEach(b => b.addEventListener('click', toggle));
}

// ========================================
// TRANSITION DE PAGE (FIX PRINCIPAL)
// ========================================
async function handlePageTransition() {
  if (!isMusicPlaying || !currentTrack) return;

  localStorage.setItem('isPageTransition', 'true');

  await fadeOut(audioTracks[currentTrack]);
  audioTracks[currentTrack].pause();
  saveGlobalState();
}

function setupPageTransitions() {
  document.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('click', async e => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto')) return;

      if (isMusicPlaying) {
        e.preventDefault();
        await handlePageTransition();
        location.href = href;
      }
    });
  });
}

// ========================================
// RESTAURATION (BLOQUÉE APRÈS NAVIGATION)
// ========================================
async function restoreMusicOnPageLoad() {
  const isPageTransition = localStorage.getItem('isPageTransition') === 'true';
  localStorage.removeItem('isPageTransition');
  if (isPageTransition) return;

  const { wasEnabled } = loadGlobalState();
  if (!wasEnabled) return;

  const track = getCurrentPageTrack();
  const audio = audioTracks[track];
  await audio.play();
  await fadeIn(audio);
  currentTrack = track;
  isMusicPlaying = true;
  musicEnabled = true;

  document.querySelector('.sound.on')?.style.setProperty('display', 'block');
  document.querySelector('.sound.off')?.style.setProperty('display', 'none');
}

// ========================================
// INIT
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  initSoundButton();
  setupScrollObserver();
  setupPageTransitions();
  await restoreMusicOnPageLoad();
});

window.addEventListener('beforeunload', saveGlobalState);

// ========================================
// API PUBLIQUE
// ========================================
window.audioControls = {
  setChapter: handleChapterChange,
  stop: async () => {
    if (currentTrack) {
      await fadeOut(audioTracks[currentTrack]);
      audioTracks[currentTrack].pause();
    }
  }
};
