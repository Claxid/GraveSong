function getEntityHitbox(entity) {
    return window.GameCollisionUtils.getEntityHitbox(entity);
}

function isRectOverlap(a, b) {
    return window.GameCollisionUtils.isRectOverlap(a, b);
}

function setupMap1Runtime() {
    for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
        if (!isMap1) break;
        spawnEnemyNearPlayer();
    }

    if (isVilleMap) {
        spawnPnj(1700, 2000);
        spawnPnj(2200, 1250);
        spawnPnj(2200, 2250);
        spawnPnj(1975, 2500);
        spawnPnj(1350, 2375);
        spawnPnj(3150, 1225);
        spawnPnj(2875, 2950);
    }

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

    window.addEventListener("keydown", (e) => {
        const key = String(e.key || "").toLowerCase();
        if (!(e.ctrlKey && e.shiftKey && key === DEV_TEST_COMBO_KEY)) return;

        e.preventDefault();
        activateDevBossTestMode();
    });

    window.addEventListener("keydown", (e) => {
        const key = String(e.key || "").toLowerCase();
        if (!(e.ctrlKey && e.shiftKey && key === DEV_MAP2_LOADOUT_COMBO_KEY)) return;

        e.preventDefault();
        activateDevMap2Loadout();
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