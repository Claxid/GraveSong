window.EncounterSystem = (() => {
    const DEFAULTS = {
        spawnRingMin: 500,
        spawnRingMax: 700,
        baseSpawnIntervalMs: 2200,
        minSpawnIntervalMs: 500,
        spawnIntervalDecayMs: 170,
        spawnIntervalDecayEveryMs: 15000,
        baseSpawnBatchSize: 1,
        maxSpawnBatchSize: 4,
        spawnBatchGrowthEveryMs: 30000,
        initialEnemyCount: 4,
        baseMaxEnemies: 7,
        enemyGrowthEveryMs: 20000,
        enemiesPerGrowthStep: 3,
        absoluteMaxEnemies: 300,
        enemyKillExp: 30,
        enemySpawnWeights: [
            { type: "orc", weight: 95 },
            { type: "orc3", weight: 5 }
        ],
        contactDamage: 5,
        damageCooldownMs: 500
    };

    function createEncounterSystem({
        canvas,
        ctx,
        mapRenderer,
        cameraController,
        playerController,
        enemyControllers,
        potionSystem,
        bossManager,
        gameStartAt,
        isMap1,
        config = {}
    }) {
        const cfg = { ...DEFAULTS, ...config };
        let lastSpawnAt = gameStartAt;
        let lastContactDamageAt = 0;
        let killCount = 0;

        function spawnEnemyNearPlayer() {
            const spawn = window.GameUtils.getRandomSpawnAroundPlayer(
                playerController.player,
                mapRenderer.MAP_WIDTH,
                mapRenderer.MAP_HEIGHT,
                cfg.spawnRingMin,
                cfg.spawnRingMax
            );
            const enemyType = window.GameUtils.pickWeightedEnemyType(cfg.enemySpawnWeights);
            enemyControllers.push(createEnemyController(canvas, ctx, cameraController.camera, spawn.x, spawn.y, enemyType));
        }

        function spawnInitialEnemies() {
            if (!isMap1) return;
            for (let i = 0; i < cfg.initialEnemyCount; i++) {
                spawnEnemyNearPlayer();
            }
        }

        function givePlayerExp(amount) {
            playerController.player.exp += amount;
            while (playerController.player.exp >= playerController.player.maxExp) {
                playerController.player.exp -= playerController.player.maxExp;
                playerController.player.level += 1;
                playerController.player.maxExp += playerController.player.maxExp * 0.2;
            }
        }

        function updateSpawnsAndEnemies(canUpdateWorld, now) {
            if (!canUpdateWorld || !isMap1) return;

            bossManager.update(now);

            const maxEnemies = window.GameUtils.getMaxEnemyCount(
                now,
                gameStartAt,
                cfg.baseMaxEnemies,
                cfg.enemyGrowthEveryMs,
                cfg.enemiesPerGrowthStep,
                cfg.absoluteMaxEnemies
            );
            const spawnInterval = window.GameUtils.getSpawnInterval(
                now,
                gameStartAt,
                cfg.baseSpawnIntervalMs,
                cfg.minSpawnIntervalMs,
                cfg.spawnIntervalDecayEveryMs,
                cfg.spawnIntervalDecayMs
            );
            const spawnBatchSize = window.GameUtils.getSpawnBatchSize(
                now,
                gameStartAt,
                cfg.baseSpawnBatchSize,
                cfg.maxSpawnBatchSize,
                cfg.spawnBatchGrowthEveryMs
            );

            if (bossManager.canSpawnRegularEnemies() && enemyControllers.length < maxEnemies && now - lastSpawnAt >= spawnInterval) {
                const availableSlots = maxEnemies - enemyControllers.length;
                const spawnCount = Math.min(spawnBatchSize, availableSlots);
                for (let i = 0; i < spawnCount; i++) spawnEnemyNearPlayer();
                lastSpawnAt = now;
            }

            for (const ec of enemyControllers) ec.update(playerController.player);

            for (let i = enemyControllers.length - 1; i >= 0; i--) {
                if (enemyControllers[i].enemy.hp > 0) continue;

                const deadEnemy = enemyControllers[i].enemy;
                potionSystem.maybeDropPotion(deadEnemy);
                bossManager.handleEnemyDeath(deadEnemy);
                enemyControllers.splice(i, 1);
                killCount += 1;
                givePlayerExp(cfg.enemyKillExp);
            }
        }

        function applyContactDamage(canUpdateWorld, playerHitbox) {
            if (!canUpdateWorld) return;

            let touchingEnemy = false;
            let damage = cfg.contactDamage;

            for (const ec of enemyControllers) {
                if (ec.enemy.isBoss) continue;
                if (!window.GameUtils.isRectOverlap(playerHitbox, window.GameUtils.getEntityHitbox(ec.enemy))) continue;
                touchingEnemy = true;
                damage = Math.max(damage, ec.enemy.contactDamage || cfg.contactDamage);
            }

            if (!touchingEnemy) return;

            const now = performance.now();
            if (now - lastContactDamageAt < cfg.damageCooldownMs) return;

            playerController.player.hp = Math.max(0, playerController.player.hp - damage);
            playerController.triggerHurt();
            lastContactDamageAt = now;
        }

        function resetContactCooldown() {
            lastContactDamageAt = performance.now();
        }

        function getKillCount() {
            return killCount;
        }

        return {
            spawnInitialEnemies,
            updateSpawnsAndEnemies,
            applyContactDamage,
            resetContactCooldown,
            getKillCount
        };
    }

    return {
        DEFAULTS,
        createEncounterSystem
    };
})();
