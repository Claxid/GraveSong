// Interface utilisateur du jeu
// HUD, système de perks, gestion des interactions

function getCssVar(name, fallback) {
    const value = getComputedStyle(canvas).getPropertyValue(name).trim();
    return value || fallback;
}

function getCssNumber(name, fallback) {
    const value = Number.parseFloat(getCssVar(name, String(fallback)));
    return Number.isFinite(value) ? value : fallback;
}

function readUiStyles() {
    return {
        hpBarWidth: getCssNumber("--hud-hp-bar-width", 200),
        hpBarHeight: getCssNumber("--hud-hp-bar-height", 20),
        hpOffsetLeft: getCssNumber("--hud-hp-offset-left", 20),
        hpOffsetBottom: getCssNumber("--hud-hp-offset-bottom", 40),
        barBorderPadding: getCssNumber("--hud-bar-border-padding", 2),
        barBackgroundColor: getCssVar("--hud-bar-background-color", "#555"),
        hpBorderColor: getCssVar("--hud-hp-border-color", "#000"),
        hpFillColor: getCssVar("--hud-hp-fill-color", "rgb(140, 16, 16)"),

        expBarWidth: getCssNumber("--hud-exp-bar-width", 500),
        expBarHeight: getCssNumber("--hud-exp-bar-height", 17),
        expOffsetTop: getCssNumber("--hud-exp-offset-top", 10),
        expBorderColor: getCssVar("--hud-exp-border-color", "#000"),
        expFillColor: getCssVar("--hud-exp-fill-color", "rgb(196, 138, 31)"),

        levelTextColor: getCssVar("--hud-level-text-color", "#fff"),
        levelFont: getCssVar("--hud-level-font", "bold 11px Arial"),

        killTextColor: getCssVar("--hud-kill-text-color", "#fff"),
        killFont: getCssVar("--hud-kill-font", "bold 20px Arial"),
        killOffsetRight: getCssNumber("--hud-kill-offset-right", 20),
        killOffsetTop: getCssNumber("--hud-kill-offset-top", 20),

        hitboxPlayerColor: getCssVar("--hitbox-player-color", "#00ff00"),
        hitboxEnemyColor: getCssVar("--hitbox-enemy-color", "#ff0000"),

        perkOverlayBackdrop: getCssVar("--perk-overlay-backdrop", "rgba(0, 0, 0, 0.7)"),
        perkPanelBackground: getCssVar("--perk-panel-background", "rgba(24, 24, 24, 0.95)"),
        perkPanelBorderColor: getCssVar("--perk-panel-border-color", "#d4af37"),
        perkPanelBorderWidth: getCssNumber("--perk-panel-border-width", 2),
        perkTitleColor: getCssVar("--perk-title-color", "#f7e9ba"),
        perkTitleFont: getCssVar("--perk-title-font", "bold 28px Arial"),

        perkPanelMaxWidth: getCssNumber("--perk-panel-max-width", 900),
        perkPanelHeight: getCssNumber("--perk-panel-height", 260),
        perkPanelSideMargin: getCssNumber("--perk-panel-side-margin", 60),
        perkCardGap: getCssNumber("--perk-card-gap", 16),
        perkCardTopOffset: getCssNumber("--perk-card-top-offset", 70),
        perkCardHeight: getCssNumber("--perk-card-height", 160),

        perkCardBackground: getCssVar("--perk-card-background", "#2b2b2b"),
        perkCardBorderColor: getCssVar("--perk-card-border-color", "#8f7b3f"),
        perkNumberColor: getCssVar("--perk-number-color", "#f5d26a"),
        perkNumberFont: getCssVar("--perk-number-font", "bold 22px Arial"),
        perkNameColor: getCssVar("--perk-name-color", "#fff"),
        perkNameFont: getCssVar("--perk-name-font", "bold 18px Arial"),
        perkDescriptionColor: getCssVar("--perk-description-color", "#d1d1d1"),
        perkDescriptionFont: getCssVar("--perk-description-font", "15px Arial"),
        perkHintColor: getCssVar("--perk-hint-color", "#c0b080"),
        perkHintFont: getCssVar("--perk-hint-font", "bold 14px Arial")
    };
}

let uiStyles = readUiStyles();

function getPerkOverlayLayout(choiceCount) {
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

function drawPerkOverlay(choices) {
    const layout = getPerkOverlayLayout(choices.length);
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

function drawHUD() {
    // HUD (HP)
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

    // HUD (EXP)
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

    // HUD (Kills)
    ctx.fillStyle = uiStyles.killTextColor;
    ctx.font = uiStyles.killFont;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`Kills : ${killCount}`, canvas.width - uiStyles.killOffsetRight, uiStyles.killOffsetTop);
}

function drawHitboxes(playerHitbox) {
    if (!SHOW_HITBOXES) return;

    ctx.save();
    ctx.lineWidth = 2;

    const pX = (playerHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
    const pY = (playerHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
    const pW = playerHitbox.w * cameraController.camera.zoom;
    const pH = playerHitbox.h * cameraController.camera.zoom;
    ctx.strokeStyle = uiStyles.hitboxPlayerColor;
    ctx.strokeRect(pX, pY, pW, pH);

    ctx.strokeStyle = uiStyles.hitboxEnemyColor;
    for (const enemyController of enemyControllers) {
        const enemyHitbox = getEntityHitbox(enemyController.enemy);
        const eX = (enemyHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
        const eY = (enemyHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
        const eW = enemyHitbox.w * cameraController.camera.zoom;
        const eH = enemyHitbox.h * cameraController.camera.zoom;
        ctx.strokeRect(eX, eY, eW, eH);
    }

    ctx.restore();
}

function initUI() {
    // Gestion des événements pour les perks
    window.addEventListener("keydown", (e) => {
        if (!playerController.hasPendingPerks()) return;

        if (e.key === "1" || e.key === "2" || e.key === "3") {
            const perkIndex = Number(e.key) - 1;
            const applied = playerController.applyPerkByIndex(perkIndex);
            if (applied) {
                e.preventDefault();
            }
        }
    });

    canvas.addEventListener("click", (e) => {
        const choices = playerController.getCurrentPerkChoices();
        if (!choices) return;

        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        const clickX = (e.clientX - canvasRect.left) * scaleX;
        const clickY = (e.clientY - canvasRect.top) * scaleY;

        const layout = getPerkOverlayLayout(choices.length);
        if (!layout) return;

        for (let i = 0; i < layout.cards.length; i++) {
            const card = layout.cards[i];
            const insideX = clickX >= card.x && clickX <= card.x + card.w;
            const insideY = clickY >= card.y && clickY <= card.y + card.h;
            if (!insideX || !insideY) continue;

            const applied = playerController.applyPerkByIndex(i);
            if (applied) e.preventDefault();
            break;
        }
    });

    window.addEventListener("resize", () => {
        resizeCanvas();
        cameraController.clamp();
        uiStyles = readUiStyles();
    });
}