function loop() {
    const now = performance.now();
    updateDeathCinematic(now);
    updateTeleportCinematic(now);

    const canUpdateWorld = !playerController.hasPendingPerks() && !deathCinematic.active && !teleportCinematic.active;

    // Helper function for clamping values
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    if (canUpdateWorld) {
        const enemies = isMap1 ? enemyControllers.map((controller) => controller.enemy) : [];
        if (fireKnightBoss && fireKnightBoss.boss && fireKnightBoss.boss.hp > 0) {
            enemies.push(fireKnightBoss.boss);
        }
        playerController.update(enemies);
        
        // Update Fire Knight Boss on Map 2
        if (fireKnightBoss && fireKnightBoss.boss.hp > 0) {
            fireKnightBoss.update(playerController.player);
        }
    }

    if (canUpdateWorld && isMap1) {
        const now = performance.now();
        const progressionCap = getMaxEnemyCount(now);
        const warmupCap = getMap2WarmupEnemyCap(now);
        const maxEnemies = Math.min(progressionCap, warmupCap);
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

            const deadEnemy = enemyControllers[i].enemy;
            const potionDropChance = deadEnemy.type === "flower-wolf"
                ? ORC3_POTION_DROP_CHANCE
                : GOBELIN_POTION_DROP_CHANCE;

            if (Math.random() < potionDropChance) {
                potions.push({
                    x: deadEnemy.x,
                    y: deadEnemy.y,
                    w: 32,
                    h: 32,
                    healAmount: POTION_HEAL_AMOUNT
                });
            }

            enemyControllers.splice(i, 1);
            killCount += 1;
            givePlayerExp(ENEMY_KILL_EXP);
        }

        // Handle Fire Knight Boss defeat
        if (fireKnightBoss && fireKnightBoss.boss.hp <= 0 && !bossDefeated) {
            bossDefeated = true;
            const BOSS_KILL_EXP = 850;
            givePlayerExp(BOSS_KILL_EXP);
            
            // Drop healing potions
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 * i) / 3;
                potions.push({
                    x: fireKnightBoss.boss.x + Math.cos(angle) * 100,
                    y: fireKnightBoss.boss.y + Math.sin(angle) * 100,
                    w: 32,
                    h: 32,
                    healAmount: 25
                });
            }
            runtimeLogger.success("Fire Knight Boss defeated!");
        }
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

    if (isVilleMap && !isChangingMap && isRectOverlap(playerHitbox, map2PortalZone)) {
        if (typeof playerController.savePersistentProgress === "function") {
            playerController.savePersistentProgress();
        }
        isChangingMap = true;
        window.location.href = "map2.html";
    }

    if (canUpdateWorld) {
        let touchingEnemy = false;
        let contactDamage = CONTACT_DAMAGE;
        const playerRadius = Math.max(playerController.player.hitW || 24, playerController.player.hitH || 35) / 2;
        
        // Check contact with boss
        if (fireKnightBoss && fireKnightBoss.boss.hp > 0) {
            const boss = fireKnightBoss.boss;
            const bossRadius = Math.max(boss.hitW || 30, boss.hitH || 30) / 2;
            const dx = boss.x - playerController.player.x;
            const dy = boss.y - playerController.player.y;
            const distanceSq = dx * dx + dy * dy;
            const contactRange = playerRadius + bossRadius + 8;

            if (distanceSq <= contactRange * contactRange) {
                touchingEnemy = true;
                contactDamage = Math.max(contactDamage, 8);
            }
        }
        
        for (const enemyController of enemyControllers) {
            const enemy = enemyController.enemy;
            const enemyRadius = Math.max(enemy.hitW || 30, enemy.hitH || 30) / 2;
            const dx = enemy.x - playerController.player.x;
            const dy = enemy.y - playerController.player.y;
            const distanceSq = dx * dx + dy * dy;
            const contactRange = playerRadius + enemyRadius + 6;

            if (distanceSq > contactRange * contactRange) continue;
            touchingEnemy = true;
            contactDamage = Math.max(contactDamage, enemy.contactDamage || CONTACT_DAMAGE);
        }

        if (touchingEnemy) {
            const now = performance.now();
            if (now - lastContactDamageAt >= DAMAGE_COOLDOWN_MS) {
                playerController.player.hp = Math.max(0, playerController.player.hp - contactDamage);
                lastContactDamageAt = now;
            }
        }
    }

    if (playerController.player.hp <= 0 && !deathCinematic.active && !isChangingMap) {
        startDeathCinematic(() => {
            if (!isVilleMap && !isChangingMap) {
                if (typeof playerController.clearPersistentProgress === "function") {
                    playerController.clearPersistentProgress();
                }
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

if (fireKnightBoss && fireKnightBoss.boss.hp > 0) {
        fireKnightBoss.draw();
    }

    for (const enemyController of enemyControllers) {
        enemyController.draw();
    }

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
    ctx.fillText(`${Math.floor(playerController.player.hp)}/${Math.floor(playerController.player.maxHp)}`, barX + barWidth / 2, barY + barHeight / 2);

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

    // Draw Fire Knight Boss health bar
    if (fireKnightBoss) {
        window.Map2BossSystem.drawBossHealthBar(ctx, canvas, clamp, fireKnightBoss.boss, bossHealthBarSprites);
    }

    drawDeathCinematicOverlay(now);
    drawTeleportCinematicOverlay(now);

    requestAnimationFrame(loop);
}
