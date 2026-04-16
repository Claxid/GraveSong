function loop() {
    const now = performance.now();
    updateDeathCinematic(now);
    updateTeleportCinematic(now);

    const canUpdateWorld = !playerController.hasPendingPerks() && !deathCinematic.active && !teleportCinematic.active;

    if (canUpdateWorld) {
        const enemies = isMap1 ? enemyControllers.map((controller) => controller.enemy) : [];
        playerController.update(enemies);
    }

    if (canUpdateWorld && isMap1) {
        const now = performance.now();
        const maxEnemies = getMaxEnemyCount(now);
        const spawnInterval = getSpawnInterval(now);
        const spawnBatchSize = getSpawnBatchSize(now);

        if (enemyControllers.length < maxEnemies && now - lastSpawnAt >= spawnInterval) {
            const availableSlots = maxEnemies - enemyControllers.length;
            const spawnCount = Math.min(spawnBatchSize, availableSlots);
            for (let i = 0; i < spawnCount; i++) {
                spawnEnemyNearPlayer();
            }
            lastSpawnAt = now;
        }

        for (const enemyController of enemyControllers) {
            enemyController.update(playerController.player);
        }

        for (let i = enemyControllers.length - 1; i >= 0; i--) {
            if (enemyControllers[i].enemy.hp > 0) continue;
            enemyControllers.splice(i, 1);
            killCount += 1;
            givePlayerExp(ENEMY_KILL_EXP);
        }
    }

    if (playerController.player.level > lastProcessedLevel) {
        const gainedLevels = playerController.player.level - lastProcessedLevel;
        playerController.queuePerkChoices(gainedLevels);
        lastProcessedLevel = playerController.player.level;
    }

    const playerHitbox = getEntityHitbox(playerController.player);

    if (isVilleMap && !isChangingMap && isRectOverlap(playerHitbox, map2PortalZone)) {
        isChangingMap = true;
        window.location.href = "map2.html";
    }

    if (canUpdateWorld) {
        let touchingEnemy = false;
        for (const enemyController of enemyControllers) {
            const enemyHitbox = getEntityHitbox(enemyController.enemy);
            if (isRectOverlap(playerHitbox, enemyHitbox)) {
                touchingEnemy = true;
                break;
            }
        }

        if (touchingEnemy) {
            const now = performance.now();
            if (now - lastContactDamageAt >= DAMAGE_COOLDOWN_MS) {
                playerController.player.hp = Math.max(0, playerController.player.hp - CONTACT_DAMAGE);
                lastContactDamageAt = now;
            }
        }
    }

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
            lastContactDamageAt = performance.now();
        });
    }

    cameraController.centerOn(playerController.player.x, playerController.player.y);

    mapRenderer.draw(cameraController.camera);
    playerController.draw();
    playerController.drawAttacks();

    for (const enemyController of enemyControllers) {
        enemyController.draw();
    }

    if (window.drawCollidersOverlay) {
        window.drawCollidersOverlay(ctx, cameraController.camera, cameraController.camera.zoom);
    }

    if (SHOW_HITBOXES) {
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

    const hudBottomY = canvas.height - uiStyles.expOffsetTop;
    const expBarHeight = uiStyles.expBarHeight;
    const barX = uiStyles.hpOffsetLeft;
    const barY = hudBottomY - expBarHeight;
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
    const expBarX = (canvas.width / 2) - (expBarWidth / 2);
    const expBarY = hudBottomY - expBarHeight;
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

    const perkChoices = playerController.getCurrentPerkChoices();
    if (perkChoices) {
        drawPerkOverlay(perkChoices);
    }

    drawDeathCinematicOverlay(now);
    drawTeleportCinematicOverlay(now);

    requestAnimationFrame(loop);
}
