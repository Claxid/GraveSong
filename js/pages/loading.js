// Page de chargement
// Elle attend 5 secondes pour simuler un chargement, puis va au menu.

const AUDIO_TIME_KEY = 'gravesong_audio_time';

// Afficher la page de chargement pendant 5 secondes
window.addEventListener('load', function() {
    // Attendre 5 secondes avant de rediriger
    setTimeout(function() {
        // Rediriger vers la page principale (index.html)
        window.location.href = 'menu.html';
    }, 3000);
});


const audio = document.getElementById('menuAudio');
const playButton = document.getElementById('playButton');

let saveAudioTime = () => {};

if (audio) {
	audio.volume = 0.4;

	document.addEventListener('click', () => {
		audio.muted = false;
	}, { once: true });

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