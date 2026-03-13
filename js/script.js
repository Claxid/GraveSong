// Cle de sauvegarde du temps.
const AUDIO_TIME_KEY = 'gravesong_audio_time';

// True si on est deja sur loading.
const isLoadingPage = window.location.pathname.replace(/\\/g, '/').endsWith('/template/loading.html');

const audio = document.getElementById('myAudio');

// Fonction vide si pas d'audio.
let saveAudioTime = () => {};

if (audio) {
  // Volume de base.
  audio.volume = 0.4;

  // Active le son au premier clic.
  document.addEventListener('click', () => {
    audio.muted = false;
  }, { once: true });

  // Reprend la musique au dernier temps.
  audio.addEventListener('loadedmetadata', () => {
    const savedTime = parseFloat(sessionStorage.getItem(AUDIO_TIME_KEY));
    if (!Number.isNaN(savedTime) && savedTime >= 0) {
      const maxTime = Math.max(0, audio.duration - 0.25);
      audio.currentTime = Math.min(savedTime, maxTime);
    }
  });

  // Sauvegarde du temps actuel.
  saveAudioTime = () => {
    sessionStorage.setItem(AUDIO_TIME_KEY, String(audio.currentTime || 0));
  };

  audio.addEventListener('timeupdate', saveAudioTime);
  window.addEventListener('beforeunload', saveAudioTime);
  window.addEventListener('pagehide', saveAudioTime);
}

function pageSuivante() {
  // Sauvegarde puis redirection.
  saveAudioTime();
  window.location.href = 'template/loading.html';
}

if (!isLoadingPage) {
  // Sur index: clic = page loading.
  document.addEventListener('click', pageSuivante);


    pageSuivante();
  });
}





  