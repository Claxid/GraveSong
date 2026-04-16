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

let gameStartAt = performance.now();
let lastProcessedLevel = playerController.player.level;
let isChangingMap = false;
let uiStyles = window.GameUI.readUiStyles(canvas);

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
    const canUpdateWorld = !playerController.hasPendingPerks();

    if (canUpdateWorld) {
        const enemies = isMap1 ? enemyControllers.map((c) => c.enemy) : [];
        playerController.update(enemies);
    }

    encounterSystem.updateSpawnsAndEnemies(canUpdateWorld, performance.now());

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
        if (!isVilleMap && !isChangingMap) {
            isChangingMap = true;
            window.location.href = "ville.html";
            return;
        }
        playerController.player.x = playerController.player.spawnX;
        playerController.player.y = playerController.player.spawnY;
        playerController.player.hp = playerController.player.maxHp;
        encounterSystem.resetContactCooldown();
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

    const perkChoices = playerController.getCurrentPerkChoices();
    if (perkChoices) {
        window.GameUI.drawPerkOverlay(ctx, canvas, uiStyles, perkChoices);
    }

    requestAnimationFrame(loop);
}

loop();