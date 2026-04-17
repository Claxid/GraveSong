function loop() {
    const now = performance.now();
    updateDeathCinematic(now);
    updateTeleportCinematic(now);

    const canUpdateWorld = !playerController.hasPendingPerks() && !deathCinematic.active && !teleportCinematic.active;

    if (canUpdateWorld) {
        const enemies = isMap1 ? enemyControllers.map((c) => c.enemy) : [];
        playerController.update(enemies);
    }

    if (canUpdateWorld && isMap1) {
        updateMap1EnemiesAndBoss(now);
    }

    if (canUpdateWorld) {
        for (const pnj of pnjControllers) pnj.update();
    }

    if (playerController.player.level > lastProcessedLevel) {
        const gainedLevels = playerController.player.level - lastProcessedLevel;
        playerController.queuePerkChoices(gainedLevels);
        lastProcessedLevel = playerController.player.level;
    }

    const playerHitbox = getEntityHitbox(playerController.player);

    if (canUpdateWorld) {
        collectPlayerPotions(playerHitbox);
    }

    if (isVilleMap && !isChangingMap && isRectOverlap(playerHitbox, map1PortalZone)) {
        if (typeof playerController.savePersistentProgress === "function") {
            playerController.savePersistentProgress();
        }
        isChangingMap = true;
        window.location.href = "map1.html";
    }

    if (canUpdateWorld) {
        applyEnemyContactDamage(now);
    }

    handlePlayerDeath();

    cameraController.centerOn(playerController.player.x, playerController.player.y);

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    mapRenderer.draw(cameraController.camera);
    for (const pnj of pnjControllers) {
        pnj.draw();
    }

    playerController.draw();
    playerController.drawAttacks();

    drawPotionDrops();

    for (const enemyController of enemyControllers) {
        enemyController.draw();
    }

    if (window.drawCollidersOverlay) {
        window.drawCollidersOverlay(ctx, cameraController.camera, cameraController.camera.zoom);
    }
    drawMap1HudAndOverlays(now, playerHitbox);

    requestAnimationFrame(loop);
}
