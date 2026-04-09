// Boucle principale du jeu
// Gestion des updates, rendu et logique de jeu

function getEntityHitbox(entity) {
    return {
        x: entity.x - entity.hitW / 2,
        y: entity.y - entity.hitH / 2,
        w: entity.hitW,
        h: entity.hitH
    };
}

function isRectOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

// Boucle du jeu
function loop() {
    const canUpdateWorld = !playerController.hasPendingPerks();

    // ── UPDATES ──────────────────────────────────────────
    if (canUpdateWorld) {
        const enemies = isMap1 ? enemyControllers.map((c) => c.enemy) : [];
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
            for (let i = 0; i < spawnCount; i++) spawnEnemyNearPlayer();
            lastSpawnAt = now;
        }

        for (const ec of enemyControllers) ec.update(playerController.player);

        for (let i = enemyControllers.length - 1; i >= 0; i--) {
            if (enemyControllers[i].enemy.hp > 0) continue;
            enemyControllers.splice(i, 1);
            killCount += 1;
            givePlayerExp(ENEMY_KILL_EXP);
        }
    }

    // UPDATE des PNJ (pas de draw ici !)
    if (canUpdateWorld) {
        for (const pnj of pnjControllers) pnj.update();
    }

    if (playerController.player.level > lastProcessedLevel) {
        const gainedLevels = playerController.player.level - lastProcessedLevel;
        playerController.queuePerkChoices(gainedLevels);
        lastProcessedLevel = playerController.player.level;
    }

    const playerHitbox = getEntityHitbox(playerController.player);

    if (isVilleMap && !isChangingMap && isRectOverlap(playerHitbox, map1PortalZone)) {
        isChangingMap = true;
        window.location.href = "map1.html";
        return;
    }

    if (canUpdateWorld) {
        let touchingEnemy = false;
        let contactDamage = CONTACT_DAMAGE;
        for (const ec of enemyControllers) {
            if (!isRectOverlap(playerHitbox, getEntityHitbox(ec.enemy))) continue;
            touchingEnemy = true;
            contactDamage = Math.max(contactDamage, ec.enemy.contactDamage || CONTACT_DAMAGE);
        }
        if (touchingEnemy) {
            const now = performance.now();
            if (now - lastContactDamageAt >= DAMAGE_COOLDOWN_MS) {
                playerController.player.hp = Math.max(0, playerController.player.hp - contactDamage);
                playerController.triggerHurt();
                lastContactDamageAt = now;
            }
        }
    }

    if (playerController.player.hp <= 0) {
        if (!isVilleMap && !isChangingMap) {
            isChangingMap = true;
            window.location.href = "ville.html";
            return;
        }
        playerController.player.x = playerController.player.spawnX;
        playerController.player.y = playerController.player.spawnY;
        playerController.player.hp = playerController.player.maxHp;
        lastContactDamageAt = performance.now();
    }

    // CAMERA
    cameraController.centerOn(playerController.player.x, playerController.player.y);

    // Nettoyer le canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // FOND = MAP
    mapRenderer.draw(cameraController.camera);

    // PNJ
    for (const pnj of pnjControllers) {
        pnj.draw();
    }

    // JOUEUR
    playerController.draw();

    // ATTAQUES
    playerController.drawAttacks();

    // ENNEMIS
    for (const enemyController of enemyControllers) {
        enemyController.draw();
    }

    if (window.drawCollidersOverlay) {
        window.drawCollidersOverlay(ctx, cameraController.camera, cameraController.camera.zoom);
    }

    // HUD
    drawHUD();

    // HITBOXES (debug)
    drawHitboxes(playerHitbox);

    // PERKS
    const perkChoices = playerController.getCurrentPerkChoices();
    if (perkChoices) {
        drawPerkOverlay(perkChoices);
    }

    requestAnimationFrame(loop);
}