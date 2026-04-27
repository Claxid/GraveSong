const AUDIO_TIME_KEY = 'gravesong_audio_time';

const audio = document.getElementById('myAudio');

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

	const saveAudioTime = () => {
		sessionStorage.setItem(AUDIO_TIME_KEY, String(audio.currentTime || 0));
	};

	audio.addEventListener('timeupdate', saveAudioTime);
	window.addEventListener('beforeunload', saveAudioTime);
	window.addEventListener('pagehide', saveAudioTime);
}

function pageSuivante() {
	if (typeof saveAudioTime === 'function') {
		saveAudioTime();
	}
	window.location.href = 'template/loading.html';
}

document.addEventListener('click', pageSuivante);

document.addEventListener('keydown', (e) => {
	if (e.key === 'F11') return;
	pageSuivante();
});