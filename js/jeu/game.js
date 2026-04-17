const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

const mapRenderer = createMapRenderer(canvas, ctx);
const cameraController = createCameraController(canvas, mapRenderer.MAP_WIDTH, mapRenderer.MAP_HEIGHT);
const playerController = createPlayerController(canvas, ctx, cameraController.camera, {
    width: mapRenderer.MAP_WIDTH,
    height: mapRenderer.MAP_HEIGHT
});
const enemyControllers = [];
const pnjControllers = [];

const isMap1 = window.location.pathname.replace(/\\/g, "/").endsWith("/template/map1.html");
const isVilleMap = window.location.pathname.replace(/\\/g, "/").endsWith("/template/ville.html");
const map1PortalZone = { x: 2270, y: 895, w: 39, h: 56 };
const SHOW_HITBOXES = false;
const DEV_TEST_COMBO_KEY = "b";
const DEATH_CINEMATIC_DURATION_MS = 3200;
const DEATH_FLASH_IN_MS = 420;
const DEATH_FLASH_HOLD_MS = 280;
const DEATH_FLASH_OUT_MS = 900;
const DEATH_FLASH_INTENSITY = 0.62;
const DEATH_STATUE_SCALE = 0.78;
const DEATH_STATUE1_OFFSET_X = 0;
const DEATH_STATUE1_OFFSET_Y = -0.04;
const TELEPORT_CINEMATIC_DURATION_MS = 1350;
const TELEPORT_FLASH_IN_MS = 220;
const TELEPORT_FLASH_HOLD_MS = 260;
const TELEPORT_FLASH_OUT_MS = 520;
const TELEPORT_GLOW_INTENSITY = 0.7;

let gameStartAt = performance.now();
let lastProcessedLevel = playerController.player.level;
let isChangingMap = false;
let uiStyles = window.GameUI.readUiStyles(canvas);
let hadAliveBossThisRun = false;
const nightmareStatueSprite0 = new Image();
nightmareStatueSprite0.src = "../assets/images/statue_cauchemar(0).png";
const nightmareStatueSprite1 = new Image();
nightmareStatueSprite1.src = "../assets/images/statue_cauchemar(1).png";
let deathCinematic = {
    active: false,
    startAt: 0,
    onComplete: null
};
let teleportCinematic = {
    active: false,
    startAt: 0,
    targetHref: null
};

const potionSystem = window.PotionSystem.createPotionSystem({
    ctx,
    cameraController,
    potions: []
});

const bossManager = window.BossSystem.createBossManager({
    canvas,
    ctx,
    cameraController,
    enemyControllers,
    playerController,
    gameStartAt,
    getRandomSpawnAroundPlayer: (player) => window.GameUtils.getRandomSpawnAroundPlayer(
        player,
        mapRenderer.MAP_WIDTH,
        mapRenderer.MAP_HEIGHT,
        window.EncounterSystem.DEFAULTS.spawnRingMin,
        window.EncounterSystem.DEFAULTS.spawnRingMax
    )
});

const encounterSystem = window.EncounterSystem.createEncounterSystem({
    canvas,
    ctx,
    mapRenderer,
    cameraController,
    playerController,
    enemyControllers,
    potionSystem,
    bossManager,
    gameStartAt,
    isMap1
});

function spawnPnj(x, y) {
    pnjControllers.push(createpnjController(canvas, ctx, cameraController.camera, x, y));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function startDeathCinematic(onComplete) {
    if (deathCinematic.active) return;

    deathCinematic.active = true;
    deathCinematic.startAt = performance.now();
    deathCinematic.onComplete = onComplete;
}

function updateDeathCinematic(now) {
    if (!deathCinematic.active) return;

    const elapsed = now - deathCinematic.startAt;
    if (elapsed < DEATH_CINEMATIC_DURATION_MS) return;

    const callback = deathCinematic.onComplete;
    deathCinematic.active = false;
    deathCinematic.onComplete = null;
    if (typeof callback === "function") {
        callback();
    }
}

function startTeleportCinematic(targetHref) {
    if (teleportCinematic.active) return;

    teleportCinematic.active = true;
    teleportCinematic.startAt = performance.now();
    teleportCinematic.targetHref = targetHref;
}

function updateTeleportCinematic(now) {
    if (!teleportCinematic.active) return;

    const elapsed = now - teleportCinematic.startAt;
    if (elapsed < TELEPORT_CINEMATIC_DURATION_MS) return;

    const targetHref = teleportCinematic.targetHref;
    teleportCinematic.active = false;
    teleportCinematic.targetHref = null;

    if (targetHref) {
        window.location.href = targetHref;
    }
}

function drawDeathCinematicOverlay(now) {
    if (!deathCinematic.active) return;

    const elapsed = now - deathCinematic.startAt;
    const flashStartAt = 1200;
    const flashPhase1 = flashStartAt + DEATH_FLASH_IN_MS;
    const flashPhase2 = flashPhase1 + DEATH_FLASH_HOLD_MS;
    const flashPhase3 = flashPhase2 + DEATH_FLASH_OUT_MS;

    let whiteAlpha = 0;
    if (elapsed >= flashStartAt && elapsed <= flashPhase1) {
        whiteAlpha = clamp((elapsed - flashStartAt) / Math.max(1, DEATH_FLASH_IN_MS), 0, 1);
    } else if (elapsed <= flashPhase2) {
        whiteAlpha = 1;
    } else if (elapsed <= flashPhase3) {
        const fadeT = (elapsed - flashPhase2) / Math.max(1, DEATH_FLASH_OUT_MS);
        whiteAlpha = 1 - clamp(fadeT, 0, 1);
    }

    const statue0BaseAlpha = clamp(elapsed / 520, 0, 1);
    const statue1FadeIn = clamp((elapsed - flashPhase2) / 760, 0, 1);
    const statue0Alpha = statue0BaseAlpha * (1 - statue1FadeIn);
    const statue1Alpha = statue1FadeIn;
    const darkness = clamp((elapsed - 500) / 1200, 0, 1) * 0.45;

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${darkness.toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function drawFittedImage(image, alpha, offsetXRatio = 0, offsetYRatio = 0) {
        if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || alpha <= 0.001) {
            return;
        }

        const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * DEATH_STATUE_SCALE;
        const drawW = image.naturalWidth * scale;
        const drawH = image.naturalHeight * scale;
        const drawX = (canvas.width - drawW) / 2 + offsetXRatio * canvas.width;
        const drawY = (canvas.height - drawH) / 2 + offsetYRatio * canvas.height;
        ctx.globalAlpha = alpha;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, drawX, drawY, drawW, drawH);
    }

    drawFittedImage(nightmareStatueSprite0, statue0Alpha);
    drawFittedImage(nightmareStatueSprite1, statue1Alpha, DEATH_STATUE1_OFFSET_X, DEATH_STATUE1_OFFSET_Y);

    if (whiteAlpha > 0.001) {
        ctx.globalAlpha = whiteAlpha * DEATH_FLASH_INTENSITY;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
}

function drawTeleportCinematicOverlay(now) {
    if (!teleportCinematic.active) return;

    const elapsed = now - teleportCinematic.startAt;
    const flashStartAt = 180;
    const flashPhase1 = flashStartAt + TELEPORT_FLASH_IN_MS;
    const flashPhase2 = flashPhase1 + TELEPORT_FLASH_HOLD_MS;
    const flashPhase3 = flashPhase2 + TELEPORT_FLASH_OUT_MS;

    let glowAlpha = 0;
    if (elapsed >= flashStartAt && elapsed <= flashPhase1) {
        glowAlpha = clamp((elapsed - flashStartAt) / Math.max(1, TELEPORT_FLASH_IN_MS), 0, 1);
    } else if (elapsed <= flashPhase2) {
        glowAlpha = 1;
    } else if (elapsed <= flashPhase3) {
        const fadeT = (elapsed - flashPhase2) / Math.max(1, TELEPORT_FLASH_OUT_MS);
        glowAlpha = 1 - clamp(fadeT, 0, 1);
    }

    const outerAlpha = clamp((elapsed - 80) / 420, 0, 1) * 0.4;
    const pulseT = clamp(elapsed / TELEPORT_CINEMATIC_DURATION_MS, 0, 1);
    const pulseSize = 0.18 + pulseT * 0.42;

    ctx.save();
    ctx.fillStyle = `rgba(150, 220, 255, ${outerAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.5,
        Math.min(canvas.width, canvas.height) * 0.05,
        canvas.width * 0.5,
        canvas.height * 0.5,
        Math.min(canvas.width, canvas.height) * pulseSize
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, glowAlpha * 1.1)})`);
    gradient.addColorStop(0.35, `rgba(170, 235, 255, ${glowAlpha * 0.95})`);
    gradient.addColorStop(0.7, `rgba(75, 180, 255, ${glowAlpha * 0.45})`);
    gradient.addColorStop(1, "rgba(75, 180, 255, 0)");

    ctx.globalCompositeOperation = "screen";
    ctx.filter = `blur(${12 + glowAlpha * 18}px)`;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(canvas.width * 0.5, canvas.height * 0.5, Math.min(canvas.width, canvas.height) * pulseSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.filter = `blur(${4 + glowAlpha * 8}px)`;
    ctx.fillStyle = `rgba(230, 250, 255, ${glowAlpha * TELEPORT_GLOW_INTENSITY})`;
    ctx.beginPath();
    ctx.arc(canvas.width * 0.5, canvas.height * 0.5, Math.min(canvas.width, canvas.height) * (0.14 + pulseT * 0.2), 0, Math.PI * 2);
    ctx.fill();

    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
}

function getAliveBossEnemy() {
    for (const enemyController of enemyControllers) {
        const enemy = enemyController.enemy;
        if (!enemy || !enemy.isBoss || enemy.hp <= 0) continue;
        return enemy;
    }
    return null;
}

function drawBossHealthBar(bossEnemy) {
    if (!bossEnemy) return;

    const hpRatio = clamp(bossEnemy.hp / Math.max(1, bossEnemy.maxhp || bossEnemy.hp), 0, 1);
    const barWidth = Math.min(canvas.width * 0.32, 420);
    const barHeight = 24;
    const x = (canvas.width - barWidth) / 2;
    const y = 14;

    ctx.fillStyle = "rgba(20, 12, 12, 0.9)";
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "rgba(196, 56, 56, 0.95)";
    ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
    ctx.strokeStyle = "rgba(240, 205, 120, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
}

encounterSystem.spawnInitialEnemies();
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
    if (e.key !== "1" && e.key !== "2" && e.key !== "3") return;
    const applied = playerController.applyPerkByIndex(Number(e.key) - 1);
    if (applied) e.preventDefault();
});

window.addEventListener("keydown", (e) => {
    const key = String(e.key || "").toLowerCase();
    if (!(e.ctrlKey && e.shiftKey && key === DEV_TEST_COMBO_KEY)) return;

    e.preventDefault();
    if (typeof playerController.applyDevTestLoadout === "function") {
        playerController.applyDevTestLoadout();
    }
});

canvas.addEventListener("click", (e) => {
    const choices = playerController.getCurrentPerkChoices();
    if (!choices) return;

    const canvasRect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - canvasRect.left) * (canvas.width / canvasRect.width);
    const clickY = (e.clientY - canvasRect.top) * (canvas.height / canvasRect.height);
    const layout = window.GameUI.getPerkOverlayLayout(canvas, uiStyles, choices.length);
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
    uiStyles = window.GameUI.readUiStyles(canvas);
});

function loop() {
    const now = performance.now();
    updateDeathCinematic(now);
    updateTeleportCinematic(now);

    const canUpdateWorld = !playerController.hasPendingPerks() && !deathCinematic.active && !teleportCinematic.active;

    if (canUpdateWorld) {
        const enemies = isMap1 ? enemyControllers.map((c) => c.enemy) : [];
        playerController.update(enemies);
    }

    encounterSystem.updateSpawnsAndEnemies(canUpdateWorld, now);

    const aliveBoss = getAliveBossEnemy();
    if (isMap1 && aliveBoss) {
        hadAliveBossThisRun = true;
    }
    if (isMap1 && hadAliveBossThisRun && !aliveBoss && !isChangingMap) {
        isChangingMap = true;
        startTeleportCinematic("map2.html");
    }

    if (canUpdateWorld) {
        for (const pnj of pnjControllers) pnj.update();
    }

    if (playerController.player.level > lastProcessedLevel) {
        const gainedLevels = playerController.player.level - lastProcessedLevel;
        playerController.queuePerkChoices(gainedLevels);
        lastProcessedLevel = playerController.player.level;
    }

    const playerHitbox = window.GameUtils.getEntityHitbox(playerController.player);
    if (canUpdateWorld) {
        potionSystem.collectPotions(playerHitbox, window.GameUtils.isRectOverlap, playerController);
    }

    if (isVilleMap && !isChangingMap && window.GameUtils.isRectOverlap(playerHitbox, map1PortalZone)) {
        isChangingMap = true;
        window.location.href = "map1.html";
        return;
    }

    encounterSystem.applyContactDamage(canUpdateWorld, playerHitbox);

    if (playerController.player.hp <= 0) {
        startDeathCinematic(() => {
            if (!isVilleMap && !isChangingMap) {
                isChangingMap = true;
                window.location.href = "ville.html";
                return;
            }

            playerController.player.x = playerController.player.spawnX;
            playerController.player.y = playerController.player.spawnY;
            playerController.player.hp = playerController.player.maxHp;
            encounterSystem.resetContactCooldown();
        });
    }

    cameraController.centerOn(playerController.player.x, playerController.player.y);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    mapRenderer.draw(cameraController.camera);
    for (const pnj of pnjControllers) pnj.draw();
    playerController.draw();
    playerController.drawAttacks();
    potionSystem.draw();
    for (const enemyController of enemyControllers) enemyController.draw();

    if (window.drawCollidersOverlay) {
        window.drawCollidersOverlay(ctx, cameraController.camera, cameraController.camera.zoom);
    }
    if (SHOW_HITBOXES) {
        window.GameUI.drawHitboxes(ctx, cameraController.camera, playerHitbox, enemyControllers, uiStyles, window.GameUtils.getEntityHitbox);
    }

    const elapsed = window.GameUtils.formatElapsedTime(performance.now() - gameStartAt);
    window.GameUI.drawHud(ctx, canvas, uiStyles, playerController, encounterSystem.getKillCount(), elapsed, isMap1);
    if (isMap1) {
        drawBossHealthBar(getAliveBossEnemy());
    }

    const perkChoices = playerController.getCurrentPerkChoices();
    if (perkChoices) {
        window.GameUI.drawPerkOverlay(ctx, canvas, uiStyles, perkChoices);
    }

    drawDeathCinematicOverlay(now);
    drawTeleportCinematicOverlay(now);

    requestAnimationFrame(loop);
}

loop();