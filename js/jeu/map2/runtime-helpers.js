function readUiStyles() {
    return window.GameUiUtils.readUiStyles(canvas);
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
        statue1OffsetY: DEATH_STATUE1_OFFSET_Y
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