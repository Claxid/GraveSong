window.GameUiUtils = (() => {
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function formatElapsedTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function getCssVar(canvas, name, fallback) {
        const value = getComputedStyle(canvas).getPropertyValue(name).trim();
        return value || fallback;
    }

    function getCssNumber(canvas, name, fallback) {
        const value = Number.parseFloat(getCssVar(canvas, name, String(fallback)));
        return Number.isFinite(value) ? value : fallback;
    }

    function readUiStyles(canvas) {
        return {
            hpBarWidth: getCssNumber(canvas, "--hud-hp-bar-width", 200),
            hpBarHeight: getCssNumber(canvas, "--hud-hp-bar-height", 20),
            hpOffsetLeft: getCssNumber(canvas, "--hud-hp-offset-left", 20),
            hpOffsetBottom: getCssNumber(canvas, "--hud-hp-offset-bottom", 40),
            barBorderPadding: getCssNumber(canvas, "--hud-bar-border-padding", 2),
            barBackgroundColor: getCssVar(canvas, "--hud-bar-background-color", "#555"),
            hpBorderColor: getCssVar(canvas, "--hud-hp-border-color", "#000"),
            hpFillColor: getCssVar(canvas, "--hud-hp-fill-color", "rgb(140, 16, 16)"),

            expBarWidth: getCssNumber(canvas, "--hud-exp-bar-width", 500),
            expBarHeight: getCssNumber(canvas, "--hud-exp-bar-height", 17),
            expOffsetTop: getCssNumber(canvas, "--hud-exp-offset-top", 10),
            expBorderColor: getCssVar(canvas, "--hud-exp-border-color", "#000"),
            expFillColor: getCssVar(canvas, "--hud-exp-fill-color", "rgb(196, 138, 31)"),

            levelTextColor: getCssVar(canvas, "--hud-level-text-color", "#fff"),
            levelFont: getCssVar(canvas, "--hud-level-font", "bold 11px Arial"),

            killTextColor: getCssVar(canvas, "--hud-kill-text-color", "#fff"),
            killFont: getCssVar(canvas, "--hud-kill-font", "bold 20px Arial"),
            killOffsetRight: getCssNumber(canvas, "--hud-kill-offset-right", 20),
            killOffsetTop: getCssNumber(canvas, "--hud-kill-offset-top", 20),

            timerTextColor: getCssVar(canvas, "--hud-timer-text-color", "#fff"),
            timerFont: getCssVar(canvas, "--hud-timer-font", "bold 18px Arial"),
            timerOffsetRight: getCssNumber(canvas, "--hud-timer-offset-right", 20),
            timerOffsetTop: getCssNumber(canvas, "--hud-timer-offset-top", 50),

            hitboxPlayerColor: getCssVar(canvas, "--hitbox-player-color", "#00ff00"),
            hitboxEnemyColor: getCssVar(canvas, "--hitbox-enemy-color", "#ff0000"),

            perkOverlayBackdrop: getCssVar(canvas, "--perk-overlay-backdrop", "rgba(0, 0, 0, 0.7)"),
            perkPanelBackground: getCssVar(canvas, "--perk-panel-background", "rgba(24, 24, 24, 0.95)"),
            perkPanelBorderColor: getCssVar(canvas, "--perk-panel-border-color", "#d4af37"),
            perkPanelBorderWidth: getCssNumber(canvas, "--perk-panel-border-width", 2),
            perkTitleColor: getCssVar(canvas, "--perk-title-color", "#f7e9ba"),
            perkTitleFont: getCssVar(canvas, "--perk-title-font", "bold 28px Arial"),

            perkPanelMaxWidth: getCssNumber(canvas, "--perk-panel-max-width", 900),
            perkPanelHeight: getCssNumber(canvas, "--perk-panel-height", 260),
            perkPanelSideMargin: getCssNumber(canvas, "--perk-panel-side-margin", 60),
            perkCardGap: getCssNumber(canvas, "--perk-card-gap", 16),
            perkCardTopOffset: getCssNumber(canvas, "--perk-card-top-offset", 70),
            perkCardHeight: getCssNumber(canvas, "--perk-card-height", 160),

            perkCardBackground: getCssVar(canvas, "--perk-card-background", "#2b2b2b"),
            perkCardBorderColor: getCssVar(canvas, "--perk-card-border-color", "#8f7b3f"),
            perkNumberColor: getCssVar(canvas, "--perk-number-color", "#f5d26a"),
            perkNumberFont: getCssVar(canvas, "--perk-number-font", "bold 22px Arial"),
            perkNameColor: getCssVar(canvas, "--perk-name-color", "#fff"),
            perkNameFont: getCssVar(canvas, "--perk-name-font", "bold 18px Arial"),
            perkDescriptionColor: getCssVar(canvas, "--perk-description-color", "#d1d1d1"),
            perkDescriptionFont: getCssVar(canvas, "--perk-description-font", "15px Arial"),
            perkHintColor: getCssVar(canvas, "--perk-hint-color", "#c0b080"),
            perkHintFont: getCssVar(canvas, "--perk-hint-font", "bold 14px Arial")
        };
    }

    return {
        clamp,
        formatElapsedTime,
        getCssVar,
        getCssNumber,
        readUiStyles
    };
})();
