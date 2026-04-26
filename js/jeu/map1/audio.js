(() => {
    // Parametres audio map1 (donjon)
    // Change MAP1_BGM_VOLUME entre 0.0 (mute) et 1.0 (max)
    const MAP1_BGM_SRC = "../assets/audio/Bloodborne Soundtrack OST - Cleric Beast.mp3";
    const MAP1_BGM_VOLUME = 0.16;
    const MAP1_BGM_TIME_KEY = "gravesong.map1.bgm.time";
    const MAP1_BGM_RESTART_KEY = "gravesong.map1.bgm.restartOnNextLoad";

    const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

    const bgm = new Audio(MAP1_BGM_SRC);
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.volume = clamp01(MAP1_BGM_VOLUME);

    const restartFromBeginning = sessionStorage.getItem(MAP1_BGM_RESTART_KEY) === "1";
    if (restartFromBeginning) {
        sessionStorage.removeItem(MAP1_BGM_TIME_KEY);
    }

    bgm.addEventListener("loadedmetadata", () => {
        if (restartFromBeginning) {
            bgm.currentTime = 0;
            sessionStorage.removeItem(MAP1_BGM_RESTART_KEY);
            return;
        }

        const savedTime = parseFloat(sessionStorage.getItem(MAP1_BGM_TIME_KEY));
        if (Number.isNaN(savedTime) || savedTime < 0) return;

        const maxTime = Math.max(0, bgm.duration - 0.25);
        bgm.currentTime = Math.min(savedTime, maxTime);
    });

    const saveTime = () => {
        sessionStorage.setItem(MAP1_BGM_TIME_KEY, String(bgm.currentTime || 0));
    };

    const tryPlay = () => {
        bgm.play().catch(() => {
            // Browser autoplay policies can block until user interaction.
        });
    };

    window.addEventListener("beforeunload", saveTime);
    window.addEventListener("pagehide", saveTime);
    bgm.addEventListener("timeupdate", saveTime);

    document.addEventListener("pointerdown", tryPlay, { once: true });
    document.addEventListener("keydown", tryPlay, { once: true });

    // Attempt playback immediately for browsers that allow it.
    tryPlay();
})();
