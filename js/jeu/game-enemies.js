// Logique de spawn des ennemis et PNJ
// Gestion du spawn dynamique et statique

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getRandomSpawnAroundPlayer(player) {
    const angle = Math.random() * Math.PI * 2;
    const radius = SPAWN_RING_MIN + Math.random() * (SPAWN_RING_MAX - SPAWN_RING_MIN);

    const rawX = player.x + Math.cos(angle) * radius;
    const rawY = player.y + Math.sin(angle) * radius;
    const margin = 32;

    return {
        x: clamp(rawX, margin, mapRenderer.MAP_WIDTH - margin),
        y: clamp(rawY, margin, mapRenderer.MAP_HEIGHT - margin)
    };
}

function pickWeightedEnemyType() {
    const totalWeight = ENEMY_SPAWN_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return "orc";

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

function getMaxEnemyCount(now) {
    const elapsed = now - gameStartAt;
    const growthSteps = Math.floor(elapsed / ENEMY_GROWTH_EVERY_MS);
    return Math.min(ABSOLUTE_MAX_ENEMIES, BASE_MAX_ENEMIES + growthSteps * ENEMIES_PER_GROWTH_STEP);
}

function getSpawnInterval(now) {
    const elapsed = now - gameStartAt;
    const decaySteps = Math.floor(elapsed / SPAWN_INTERVAL_DECAY_EVERY_MS);
    return Math.max(MIN_SPAWN_INTERVAL_MS, BASE_SPAWN_INTERVAL_MS - decaySteps * SPAWN_INTERVAL_DECAY_MS);
}

function getSpawnBatchSize(now) {
    const elapsed = now - gameStartAt;
    const growthSteps = Math.floor(elapsed / SPAWN_BATCH_GROWTH_EVERY_MS);
    return Math.min(MAX_SPAWN_BATCH_SIZE, BASE_SPAWN_BATCH_SIZE + growthSteps);
}

function givePlayerExp(amount) {
    playerController.player.exp += amount;
    while (playerController.player.exp >= playerController.player.maxExp) {
        playerController.player.exp -= playerController.player.maxExp;
        playerController.player.level += 1;
        playerController.player.maxExp += playerController.player.maxExp * 0.2;
    }
}

function initSpawns() {
    // SPAWN INITIAL DES ENNEMIS
    for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
        if (!isMap1) break;
        spawnEnemyNearPlayer();
    }

    // SPAWN DES PNJ statiques (uniquement dans la ville)
    if (isVilleMap) {
        spawnPnj(1700, 2000);
        spawnPnj(2200, 1250);
        spawnPnj(2200, 2250);
        spawnPnj(1975, 2500);
        spawnPnj(1350, 2375);
        spawnPnj(3150, 1225);
        spawnPnj(2875, 2950);
    }
}