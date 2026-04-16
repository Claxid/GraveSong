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
        if (!bossSpawned && !bossDefeated && now - gameStartAt >= BOSS_SPAWN_DELAY_MS) {
            spawnBossNearPlayer();
            bossSpawned = true;

            for (let i = enemyControllers.length - 1; i >= 0; i--) {
                if (enemyControllers[i].enemy.isBoss) continue;
                enemyControllers.splice(i, 1);
            }
        }

        const maxEnemies = getMaxEnemyCount(now);
        const spawnInterval = getSpawnInterval(now);
        const spawnBatchSize = getSpawnBatchSize(now);

        if (!bossSpawned && enemyControllers.length < maxEnemies && now - lastSpawnAt >= spawnInterval) {
            const availableSlots = maxEnemies - enemyControllers.length;
            const spawnCount = Math.min(spawnBatchSize, availableSlots);
            for (let i = 0; i < spawnCount; i++) spawnEnemyNearPlayer();
            lastSpawnAt = now;
        }

        for (const ec of enemyControllers) ec.update(playerController.player);

        let bossDiedThisFrame = false;
        for (let i = enemyControllers.length - 1; i >= 0; i--) {
            if (enemyControllers[i].enemy.hp > 0) continue;

            const deadEnemy = enemyControllers[i].enemy;
            if (deadEnemy.isBoss) {
                bossDiedThisFrame = true;
            } else {
                const deadX = deadEnemy.x;
                const deadY = deadEnemy.y;
                const potionDropChance = deadEnemy.type === "orc3"
                    ? ORC3_POTION_DROP_CHANCE
                    : ORC_POTION_DROP_CHANCE;

                if (Math.random() < potionDropChance) {
                    potions.push({
                        x: deadX,
                        y: deadY,
                        w: 32,
                        h: 32,
                        healAmount: POTION_HEAL_AMOUNT
                    });
                }
            }
            enemyControllers.splice(i, 1);
            killCount += 1;
            givePlayerExp(ENEMY_KILL_EXP);
        }

        if (bossDiedThisFrame) {
            bossSpawned = false;
            bossDefeated = true;
            lastSpawnAt = now;
            if (!isChangingMap) {
                isChangingMap = true;
                startTeleportCinematic("map2.html");
            }
        }
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
        for (let i = potions.length - 1; i >= 0; i--) {
            const potion = potions[i];
            const potionHitbox = {
                x: potion.x - potion.w / 2,
                y: potion.y - potion.h / 2,
                w: potion.w,
                h: potion.h
            };

            if (!isRectOverlap(playerHitbox, potionHitbox)) continue;

            playerController.player.hp = Math.min(
                playerController.player.maxHp,
                playerController.player.hp + potion.healAmount
            );
            potions.splice(i, 1);
        }
    }

    if (isVilleMap && !isChangingMap && isRectOverlap(playerHitbox, map1PortalZone)) {
        isChangingMap = true;
        window.location.href = "map1.html";
    }

    if (canUpdateWorld) {
        let touchingEnemy = false;
        let contactDamage = CONTACT_DAMAGE;
        for (const ec of enemyControllers) {
            if (ec.enemy.isBoss) continue;
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

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    mapRenderer.draw(cameraController.camera);
    for (const pnj of pnjControllers) {
        pnj.draw();
    }

    playerController.draw();
    playerController.drawAttacks();

    for (const potion of potions) {
        const size = 55 * cameraController.camera.zoom;
        const drawX = (potion.x - cameraController.camera.x) * cameraController.camera.zoom - size / 2;
        const drawY = (potion.y - cameraController.camera.y) * cameraController.camera.zoom - size / 2;

        if (potionSprite.complete) {
            ctx.drawImage(potionSprite, drawX, drawY, size, size);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(drawX, drawY, size, size);
        }
    }

    for (const enemyController of enemyControllers) {
        enemyController.draw();
    }

    if (window.drawCollidersOverlay) {
        window.drawCollidersOverlay(ctx, cameraController.camera, cameraController.camera.zoom);
    }
    drawMap1HudAndOverlays(now, playerHitbox);

    requestAnimationFrame(loop);
}
