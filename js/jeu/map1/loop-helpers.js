function updateMap1EnemiesAndBoss(now) {
    if (!isMap1) return;

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
        for (let i = 0; i < spawnCount; i++) {
            spawnEnemyNearPlayer();
        }
        lastSpawnAt = now;
    }

    for (const enemyController of enemyControllers) {
        enemyController.update(playerController.player);
    }

    let bossDiedThisFrame = false;
    for (let i = enemyControllers.length - 1; i >= 0; i--) {
        if (enemyControllers[i].enemy.hp > 0) continue;

        const deadEnemy = enemyControllers[i].enemy;
        if (deadEnemy.isBoss) {
            bossDiedThisFrame = true;
        } else {
            const potionDropChance = deadEnemy.type === "orc3"
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
            if (typeof playerController.savePersistentProgress === "function") {
                playerController.savePersistentProgress();
            }
            isChangingMap = true;
            startTeleportCinematic("map2.html");
        }
    }
}

function collectPlayerPotions(playerHitbox) {
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

function applyEnemyContactDamage(now) {
    let touchingEnemy = false;
    let contactDamage = CONTACT_DAMAGE;
    const playerRadius = Math.max(playerController.player.hitW || 24, playerController.player.hitH || 35) / 2;

    for (const enemyController of enemyControllers) {
        if (enemyController.enemy.isBoss) continue;

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

    if (!touchingEnemy || now - lastContactDamageAt < DAMAGE_COOLDOWN_MS) return;

    playerController.player.hp = Math.max(0, playerController.player.hp - contactDamage);
    playerController.triggerHurt();
    lastContactDamageAt = now;
}

function handlePlayerDeath() {
    if (playerController.player.hp > 0) return;

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

function drawPotionDrops() {
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
}
