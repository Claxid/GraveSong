window.Map2LoopPlayerState = {
    queuePerksOnLevelGain() {
        if (playerController.player.level <= lastProcessedLevel) return;

        const gainedLevels = playerController.player.level - lastProcessedLevel;
        playerController.queuePerkChoices(gainedLevels);
        lastProcessedLevel = playerController.player.level;
    },

    collectPotions(canUpdateWorld, playerHitbox) {
        if (!canUpdateWorld) return;

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
    },

    handlePortalTransition(playerHitbox) {
        if (!isVilleMap || isChangingMap || !isRectOverlap(playerHitbox, map2PortalZone)) return;

        if (typeof playerController.savePersistentProgress === "function") {
            playerController.savePersistentProgress();
        }
        isChangingMap = true;
        window.location.href = "map2.html";
    },

    applyContactDamage(canUpdateWorld) {
        if (!canUpdateWorld) return;

        const fireKnightBoss = window.fireKnightBoss;
        let touchingEnemy = false;
        let contactDamage = CONTACT_DAMAGE;
        const playerRadius = Math.max(playerController.player.hitW || 24, playerController.player.hitH || 35) / 2;

        if (fireKnightBoss && fireKnightBoss.boss.hp > 0) {
            const boss = fireKnightBoss.boss;
            const bossRadius = Math.max(boss.hitW || 30, boss.hitH || 30) / 2;
            const dx = boss.x - playerController.player.x;
            const dy = boss.y - playerController.player.y;
            const distanceSq = dx * dx + dy * dy;
            const contactRange = playerRadius + bossRadius + 8;

            if (distanceSq <= contactRange * contactRange) {
                touchingEnemy = true;
                contactDamage = Math.max(contactDamage, 6);
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
            if (now - window.lastContactDamageAt >= DAMAGE_COOLDOWN_MS) {
                playerController.player.hp = Math.max(0, playerController.player.hp - contactDamage);
                window.lastContactDamageAt = now;
            }
        }
    },

    handlePlayerDeath() {
        if (playerController.player.hp > 0 || deathCinematic.active || isChangingMap) {
            return;
        }

        startDeathCinematic(() => {
            if (!isVilleMap && !isChangingMap) {
                if (window.Map2Audio && typeof window.Map2Audio.markRestartOnNextLoad === "function") {
                    window.Map2Audio.markRestartOnNextLoad();
                }
                if (window.Map2Audio && typeof window.Map2Audio.stopNow === "function") {
                    window.Map2Audio.stopNow();
                }
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
            window.lastContactDamageAt = performance.now();
        });
    }
};