(() => {
    // Parametres audio map2 (boss)
    // Change MAP2_BGM_VOLUME entre 0.0 (mute) et 1.0 (max)
    const MAP2_BGM_SRC = "../assets/audio/Pieta, She of Blessed Renewal Battle - Lords of the Fallen OST.mp3";
    const MAP2_BGM_VOLUME = 0.16;
    const MAP2_BGM_TIME_KEY = "gravesong.map2.bgm.time";
    const MAP2_BGM_RESTART_KEY = "gravesong.map2.bgm.restartOnNextLoad";

    const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

    const bgm = new Audio(MAP2_BGM_SRC);
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.volume = clamp01(MAP2_BGM_VOLUME);

    const restartFromBeginning = sessionStorage.getItem(MAP2_BGM_RESTART_KEY) === "1";
    if (restartFromBeginning) {
        sessionStorage.removeItem(MAP2_BGM_TIME_KEY);
    }

    bgm.addEventListener("loadedmetadata", () => {
        if (restartFromBeginning) {
            bgm.currentTime = 0;
            sessionStorage.removeItem(MAP2_BGM_RESTART_KEY);
            return;
        }

        const savedTime = parseFloat(sessionStorage.getItem(MAP2_BGM_TIME_KEY));
        if (Number.isNaN(savedTime) || savedTime < 0) return;

        const maxTime = Math.max(0, bgm.duration - 0.25);
        bgm.currentTime = Math.min(savedTime, maxTime);
    });

    const saveTime = () => {
        sessionStorage.setItem(MAP2_BGM_TIME_KEY, String(bgm.currentTime || 0));
    };

    const markRestartOnNextLoad = () => {
        saveTime();
        sessionStorage.setItem(MAP2_BGM_RESTART_KEY, "1");
    };

    const stopNow = () => {
        saveTime();
        bgm.pause();
    };

    window.Map2Audio = {
        markRestartOnNextLoad,
        stopNow
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
