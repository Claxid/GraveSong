window.Map2LoopUpdate = {
    updateActorsAndEncounters(now, canUpdateWorld, bossDeathAnimRunning) {
        const fireKnightBoss = window.fireKnightBoss;
        const bossSpawned = window.bossSpawned;
        const bossDefeated = window.bossDefeated;

        if (canUpdateWorld) {
            const enemies = isMap1 ? enemyControllers.map((controller) => controller.enemy) : [];
            if (fireKnightBoss && fireKnightBoss.boss && fireKnightBoss.boss.hp > 0) {
                enemies.push(fireKnightBoss.boss);
            }
            playerController.update(enemies);

            if (fireKnightBoss && (fireKnightBoss.boss.hp > 0 || bossDeathAnimRunning)) {
                fireKnightBoss.update(playerController.player);
            }
        }

        if (!canUpdateWorld || !isMap1) {
            return;
        }

        if (!bossSpawned && !bossDefeated && now - window.gameStartAt >= MAP2_BOSS_SPAWN_DELAY_MS) {
            window.spawnBossNearPlayer();
        }

        const isBossAlive = Boolean(fireKnightBoss && fireKnightBoss.boss && fireKnightBoss.boss.hp > 0);
        const nowTick = performance.now();
        const progressionCap = getMaxEnemyCount(nowTick);
        const warmupCap = window.getMap2WarmupEnemyCap(nowTick);
        const maxEnemies = Math.min(progressionCap, warmupCap);
        const spawnInterval = getSpawnInterval(nowTick);
        const spawnBatchSize = getSpawnBatchSize(nowTick);

        if (!isBossAlive && enemyControllers.length < maxEnemies && nowTick - window.lastSpawnAt >= spawnInterval) {
            const availableSlots = maxEnemies - enemyControllers.length;
            const spawnCount = Math.min(spawnBatchSize, availableSlots);
            for (let i = 0; i < spawnCount; i++) {
                window.spawnEnemyNearPlayer();
            }
            window.lastSpawnAt = nowTick;
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
                potions.push({ x: deadEnemy.x, y: deadEnemy.y, w: 32, h: 32, healAmount: POTION_HEAL_AMOUNT });
            }

            enemyControllers.splice(i, 1);
            window.killCount += 1;
            givePlayerExp(ENEMY_KILL_EXP);
        }

        if (fireKnightBoss && fireKnightBoss.boss.hp <= 0 && !bossDefeated) {
            window.bossDefeated = true;
            bossDefeatedAt = performance.now();
            bossDeathAnimationCompletedAt = 0;
            enemyControllers.length = 0;
            potions.length = 0;
            if (typeof fireKnightBoss.startDeathAnimation === "function") {
                fireKnightBoss.startDeathAnimation();
            }
            runtimeLogger.success("Fire Demon Boss defeated - game finished");
        }

        const bossDeathDone = Boolean(
            bossDefeated &&
            fireKnightBoss &&
            typeof fireKnightBoss.isDeathAnimationFinished === "function" &&
            fireKnightBoss.isDeathAnimationFinished()
        );

        if (bossDeathDone && bossDeathAnimationCompletedAt <= 0) {
            bossDeathAnimationCompletedAt = performance.now();
        }

        const canStartEndCinematic = Boolean(
            bossDeathDone &&
            bossDeathAnimationCompletedAt > 0 &&
            now - bossDeathAnimationCompletedAt >= BOSS_DEATH_TO_END_CINEMATIC_DELAY_MS
        );

        if (canStartEndCinematic && !deathCinematic.active && !gameFinished) {
            startDeathCinematic(() => {
                gameFinished = true;
                gameFinishedAt = performance.now();
            });
        }
    }
};