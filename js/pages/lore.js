/* lore.js
 * Gère l'audio du lore + navigation vers le menu.
 */

const AUDIO_TIME_KEY = 'gravesong_audio_time';

const initLorePage = () => {
	const audio = document.getElementById('menuAudio');
	const menuButton = document.getElementById('menuButton');

	let saveAudioTime = () => {};

	if (audio) {
		audio.volume = 0.4;

		// Déverrouille le son au premier clic (autoplay bloqué par certains navigateurs).
		document.addEventListener('click', () => {
			audio.muted = false;
		}, { once: true });

		// Restaurer la position audio sauvegardée.
		audio.addEventListener('loadedmetadata', () => {
			const savedTime = parseFloat(sessionStorage.getItem(AUDIO_TIME_KEY));
			if (!Number.isNaN(savedTime) && savedTime >= 0) {
				const maxTime = Math.max(0, audio.duration - 0.25);
				audio.currentTime = Math.min(savedTime, maxTime);
			}
		});

		saveAudioTime = () => {
			sessionStorage.setItem(AUDIO_TIME_KEY, String(audio.currentTime || 0));
		};

		audio.addEventListener('timeupdate', saveAudioTime);
		window.addEventListener('beforeunload', saveAudioTime);
		window.addEventListener('pagehide', saveAudioTime);
	}

	if (menuButton) {
		menuButton.addEventListener('click', () => {
			saveAudioTime();
			window.location.href = 'menu.html';
		});
	}
};

// Le <script> est déjà chargé à la fin du <body>, donc le DOM est prêt.
initLorePage();
