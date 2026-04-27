window.GameUI = (() => {
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

    function drawHitboxes(ctx, camera, playerHitbox, enemyControllers, uiStyles, getEntityHitbox) {
        ctx.save();
        ctx.lineWidth = 2;

        const pX = (playerHitbox.x - camera.x) * camera.zoom;
        const pY = (playerHitbox.y - camera.y) * camera.zoom;
        const pW = playerHitbox.w * camera.zoom;
        const pH = playerHitbox.h * camera.zoom;
        ctx.strokeStyle = uiStyles.hitboxPlayerColor;
        ctx.strokeRect(pX, pY, pW, pH);

        ctx.strokeStyle = uiStyles.hitboxEnemyColor;
        for (const enemyController of enemyControllers) {
            const enemyHitbox = getEntityHitbox(enemyController.enemy);
            const eX = (enemyHitbox.x - camera.x) * camera.zoom;
            const eY = (enemyHitbox.y - camera.y) * camera.zoom;
            const eW = enemyHitbox.w * camera.zoom;
            const eH = enemyHitbox.h * camera.zoom;
            ctx.strokeRect(eX, eY, eW, eH);
        }

        ctx.restore();
    }

    function drawHud(ctx, canvas, uiStyles, playerController, killCount, elapsedTime, showTimer) {
        const barX = uiStyles.hpOffsetLeft;
        const barY = canvas.height - uiStyles.hpOffsetBottom;
        const barWidth = uiStyles.hpBarWidth;
        const barHeight = uiStyles.hpBarHeight;
        const hpRatio = playerController.player.hp / playerController.player.maxHp;

        ctx.fillStyle = uiStyles.hpBorderColor;
        ctx.fillRect(
            barX - uiStyles.barBorderPadding,
            barY - uiStyles.barBorderPadding,
            barWidth + uiStyles.barBorderPadding * 2,
            barHeight + uiStyles.barBorderPadding * 2
        );
        ctx.fillStyle = uiStyles.barBackgroundColor;
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = uiStyles.hpFillColor;
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        ctx.fillStyle = uiStyles.levelTextColor;
        ctx.font = uiStyles.levelFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${playerController.player.hp}/${playerController.player.maxHp}`, barX + barWidth / 2, barY + barHeight / 2);

        const expBarWidth = uiStyles.expBarWidth;
        const expBarHeight = uiStyles.expBarHeight;
        const expBarX = (canvas.width / 2) - (expBarWidth / 2);
        const expBarY = uiStyles.expOffsetTop;
        const expRatio = playerController.player.exp / playerController.player.maxExp;

        ctx.fillStyle = uiStyles.expBorderColor;
        ctx.fillRect(
            expBarX - uiStyles.barBorderPadding,
            expBarY - uiStyles.barBorderPadding,
            expBarWidth + uiStyles.barBorderPadding * 2,
            expBarHeight + uiStyles.barBorderPadding * 2
        );
        ctx.fillStyle = uiStyles.barBackgroundColor;
        ctx.fillRect(expBarX, expBarY, expBarWidth, expBarHeight);
        ctx.fillStyle = uiStyles.expFillColor;
        ctx.fillRect(expBarX, expBarY, expBarWidth * expRatio, expBarHeight);

        ctx.fillStyle = uiStyles.levelTextColor;
        ctx.font = uiStyles.levelFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`level : ${playerController.player.level}`, canvas.width / 2, expBarY + expBarHeight / 2);

        ctx.fillStyle = uiStyles.killTextColor;
        ctx.font = uiStyles.killFont;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(`Kills : ${killCount}`, canvas.width - uiStyles.killOffsetRight, uiStyles.killOffsetTop);

        if (showTimer) {
            ctx.fillStyle = uiStyles.timerTextColor;
            ctx.font = uiStyles.timerFont;
            ctx.textAlign = "right";
            ctx.textBaseline = "top";
            ctx.fillText(`Temps : ${elapsedTime}`, canvas.width - uiStyles.timerOffsetRight, uiStyles.timerOffsetTop);
        }
    }

    function getPerkOverlayLayout(canvas, uiStyles, choiceCount) {
        if (!choiceCount || choiceCount <= 0) return null;

        const panelWidth = Math.min(uiStyles.perkPanelMaxWidth, canvas.width - uiStyles.perkPanelSideMargin);
        const panelHeight = uiStyles.perkPanelHeight;
        const panelX = (canvas.width - panelWidth) / 2;
        const panelY = (canvas.height - panelHeight) / 2;

        const gap = uiStyles.perkCardGap;
        const cardY = panelY + uiStyles.perkCardTopOffset;
        const cardHeight = uiStyles.perkCardHeight;
        const cardWidth = (panelWidth - (gap * (choiceCount + 1))) / choiceCount;
        const cards = [];

        for (let i = 0; i < choiceCount; i++) {
            cards.push({
                x: panelX + gap + i * (cardWidth + gap),
                y: cardY,
                w: cardWidth,
                h: cardHeight
            });
        }

        return {
            panelX,
            panelY,
            panelWidth,
            panelHeight,
            cards
        };
    }

    function drawPerkOverlay(ctx, canvas, uiStyles, choices) {
        const layout = getPerkOverlayLayout(canvas, uiStyles, choices.length);
        if (!layout) return;

        const panelWidth = layout.panelWidth;
        const panelHeight = layout.panelHeight;
        const panelX = layout.panelX;
        const panelY = layout.panelY;

        ctx.save();

        ctx.fillStyle = uiStyles.perkOverlayBackdrop;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = uiStyles.perkPanelBackground;
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = uiStyles.perkPanelBorderColor;
        ctx.lineWidth = uiStyles.perkPanelBorderWidth;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        ctx.fillStyle = uiStyles.perkTitleColor;
        ctx.font = uiStyles.perkTitleFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("Choisis un perk", canvas.width / 2, panelY + 18);

        for (let i = 0; i < choices.length; i++) {
            const card = layout.cards[i];
            const cardX = card.x;
            const cardY = card.y;
            const cardWidth = card.w;
            const cardHeight = card.h;
            const perk = choices[i];

            ctx.fillStyle = uiStyles.perkCardBackground;
            ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
            ctx.strokeStyle = uiStyles.perkCardBorderColor;
            ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

            ctx.fillStyle = uiStyles.perkNumberColor;
            ctx.font = uiStyles.perkNumberFont;
            ctx.textAlign = "left";
            ctx.fillText(`${i + 1}`, cardX + 12, cardY + 10);

            ctx.fillStyle = uiStyles.perkNameColor;
            ctx.font = uiStyles.perkNameFont;
            ctx.fillText(perk.name, cardX + 12, cardY + 46);

            ctx.fillStyle = uiStyles.perkDescriptionColor;
            ctx.font = uiStyles.perkDescriptionFont;
            ctx.fillText(perk.description, cardX + 12, cardY + 82);

            ctx.fillStyle = uiStyles.perkHintColor;
            ctx.font = uiStyles.perkHintFont;
            ctx.fillText(`Touche ${i + 1}`, cardX + 12, cardY + 124);
        }

        ctx.restore();
    }

    return {
        readUiStyles,
        drawHitboxes,
        drawHud,
        getPerkOverlayLayout,
        drawPerkOverlay
    };
})();
