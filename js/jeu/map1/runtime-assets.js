function createTrackedImage(label, src) {
    if (window.GameImageUtils && typeof window.GameImageUtils.createTrackedImage === "function") {
        return window.GameImageUtils.createTrackedImage(label, src);
    }

    const image = new Image();
    window.GameRuntimeLogger?.trackImage(image, label, src);
    image.src = src;
    return image;
}

const potionSprite = createTrackedImage("Potion", "../assets/sprites/potion/healing_potion.png");
const bossHpUnderSprite = createTrackedImage("Boss HP Under", "../assets/sprites/mino_v1.1_free/bonus_mino_healthbar_UI/mino_health_under.png");
const bossHpProgressSprite = createTrackedImage("Boss HP Progress", "../assets/sprites/mino_v1.1_free/bonus_mino_healthbar_UI/mino_health_progress.png");
const bossHpOverSprite = createTrackedImage("Boss HP Over", "../assets/sprites/mino_v1.1_free/bonus_mino_healthbar_UI/mino_health_over.png");
const nightmareStatueSprite0 = createTrackedImage("Statue Cauchemar 0", "../assets/images/statue_cauchemar(0).png");
const nightmareStatueSprite1 = createTrackedImage("Statue Cauchemar 1", "../assets/images/statue_cauchemar(1).png");

function readUiStyles() {
    return window.GameUiUtils.readUiStyles(canvas);
}

function clamp(value, min, max) {
    return window.GameUiUtils.clamp(value, min, max);
}

function formatElapsedTime(ms) {
    return window.GameUiUtils.formatElapsedTime(ms);
}

function startDeathCinematic(onComplete) {
    window.GameCinematics.startDeath(deathCinematic, onComplete);
}

function updateDeathCinematic(now) {
    window.GameCinematics.updateDeath(deathCinematic, now, DEATH_CINEMATIC_DURATION_MS);
}

function startTeleportCinematic(targetHref) {
    window.GameCinematics.startTeleport(teleportCinematic, targetHref);
}

function updateTeleportCinematic(now) {
    window.GameCinematics.updateTeleport(teleportCinematic, now, TELEPORT_CINEMATIC_DURATION_MS);
}

function drawDeathCinematicOverlay(now) {
    window.GameCinematics.drawDeathOverlay(ctx, canvas, now, deathCinematic, {
        flashInMs: DEATH_FLASH_IN_MS,
        flashHoldMs: DEATH_FLASH_HOLD_MS,
        flashOutMs: DEATH_FLASH_OUT_MS,
        flashIntensity: DEATH_FLASH_INTENSITY,
        statueScale: DEATH_STATUE_SCALE,
        statue1OffsetX: DEATH_STATUE1_OFFSET_X,
        statue1OffsetY: DEATH_STATUE1_OFFSET_Y,
        sprite0: nightmareStatueSprite0,
        sprite1: nightmareStatueSprite1
    });
}

function drawTeleportCinematicOverlay(now) {
    window.GameCinematics.drawTeleportOverlay(ctx, canvas, now, teleportCinematic, {
        durationMs: TELEPORT_CINEMATIC_DURATION_MS,
        flashInMs: TELEPORT_FLASH_IN_MS,
        flashHoldMs: TELEPORT_FLASH_HOLD_MS,
        flashOutMs: TELEPORT_FLASH_OUT_MS,
        glowIntensity: TELEPORT_GLOW_INTENSITY
    });
}

function getRandomSpawnAroundPlayer(player) {
    return window.GameProgressionUtils.getRandomSpawnAroundPlayer(
        player,
        mapRenderer.MAP_WIDTH,
        mapRenderer.MAP_HEIGHT,
        SPAWN_RING_MIN,
        SPAWN_RING_MAX
    );
}

function pickWeightedEnemyType() {
    const totalWeight = ENEMY_SPAWN_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return "gobelin";

    let roll = Math.random() * totalWeight;
    for (const entry of ENEMY_SPAWN_WEIGHTS) {
        roll -= entry.weight;
        if (roll <= 0) {
            return entry.type;
        }
    }

    return ENEMY_SPAWN_WEIGHTS[ENEMY_SPAWN_WEIGHTS.length - 1].type;
}

function spawnEnemyNearPlayer() {
    const spawn = getRandomSpawnAroundPlayer(playerController.player);
    const enemyType = pickWeightedEnemyType();
    enemyControllers.push(createEnemyController(canvas, ctx, cameraController.camera, spawn.x, spawn.y, enemyType));
}

function spawnPnj(x, y) {
    pnjControllers.push(createpnjController(canvas, ctx, cameraController.camera, x, y));
}

function createBossController(startX, startY) {
    return window.Map1BossSystem.createBossController(startX, startY, ctx, cameraController.camera);
}

function spawnBossNearPlayer() {
    const spawn = getRandomSpawnAroundPlayer(playerController.player);
    enemyControllers.push(createBossController(spawn.x, spawn.y));
}

function activateDevBossTestMode() {
    if (!isMap1) return;

    if (typeof playerController.applyDevTestLoadout === "function") {
        playerController.applyDevTestLoadout();
    }

    let hasAliveBoss = false;
    for (let i = enemyControllers.length - 1; i >= 0; i--) {
        const enemy = enemyControllers[i].enemy;
        if (enemy && enemy.isBoss && enemy.hp > 0) {
            hasAliveBoss = true;
            continue;
        }
        if (enemy && !enemy.isBoss) {
            enemyControllers.splice(i, 1);
        }
    }

    if (!hasAliveBoss) {
        spawnBossNearPlayer();
    }

    bossSpawned = true;
    bossDefeated = false;
    lastSpawnAt = performance.now();
}

function activateDevMap2Loadout() {
    if (typeof playerController.applyDevTestLoadout === "function") {
        playerController.applyDevTestLoadout();
    }

    if (typeof playerController.savePersistentProgress === "function") {
        playerController.savePersistentProgress();
    }

    isChangingMap = true;
    window.location.href = "map2.html";
}

function getMaxEnemyCount(now) {
    return window.GameProgressionUtils.getMaxEnemyCount(
        now,
        gameStartAt,
        BASE_MAX_ENEMIES,
        ENEMY_GROWTH_EVERY_MS,
        ENEMIES_PER_GROWTH_STEP,
        ABSOLUTE_MAX_ENEMIES
    );
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
    window.Map1BossSystem.drawBossHealthBar(ctx, canvas, clamp, bossEnemy, {
        under: bossHpUnderSprite,
        progress: bossHpProgressSprite,
        over: bossHpOverSprite
    });
}

function getSpawnInterval(now) {
    return window.GameProgressionUtils.getSpawnInterval(
        now,
        gameStartAt,
        BASE_SPAWN_INTERVAL_MS,
        SPAWN_INTERVAL_DECAY_EVERY_MS,
        SPAWN_INTERVAL_DECAY_MS,
        MIN_SPAWN_INTERVAL_MS
    );
}

function getSpawnBatchSize(now) {
    return window.GameProgressionUtils.getSpawnBatchSize(
        now,
        gameStartAt,
        BASE_SPAWN_BATCH_SIZE,
        SPAWN_BATCH_GROWTH_EVERY_MS,
        MAX_SPAWN_BATCH_SIZE
    );
}

function givePlayerExp(amount) {
    window.GameProgressionUtils.givePlayerExp(playerController.player, amount);
}