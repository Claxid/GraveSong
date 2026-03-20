const AUDIO_TIME_KEY = 'gravesong_audio_time';

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

if (playButton) {
	playButton.addEventListener('click', () => {
		saveAudioTime();
		window.location.href = 'ville.html';
	});
}

if (loreButton) {
	loreButton.addEventListener('click', () => {
		saveAudioTime();
		window.location.href = 'lore.html';
	});
}