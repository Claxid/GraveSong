window.GameUtils = (() => {
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function formatElapsedTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function getRandomSpawnAroundPlayer(player, mapWidth, mapHeight, spawnRingMin, spawnRingMax) {
        const angle = Math.random() * Math.PI * 2;
        const radius = spawnRingMin + Math.random() * (spawnRingMax - spawnRingMin);
        const margin = 32;

        const rawX = player.x + Math.cos(angle) * radius;
        const rawY = player.y + Math.sin(angle) * radius;

        return {
            x: clamp(rawX, margin, mapWidth - margin),
            y: clamp(rawY, margin, mapHeight - margin)
        };
    }

    function pickWeightedEnemyType(weights, fallbackType = "orc") {
        const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
        if (totalWeight <= 0) return fallbackType;

        let roll = Math.random() * totalWeight;
        for (const entry of weights) {
            roll -= entry.weight;
            if (roll <= 0) return entry.type;
        }

        return weights[weights.length - 1]?.type || fallbackType;
    }

    function getMaxEnemyCount(now, gameStartAt, baseMaxEnemies, enemyGrowthEveryMs, enemiesPerGrowthStep, absoluteMaxEnemies) {
        const elapsed = now - gameStartAt;
        const growthSteps = Math.floor(elapsed / enemyGrowthEveryMs);
        return Math.min(absoluteMaxEnemies, baseMaxEnemies + growthSteps * enemiesPerGrowthStep);
    }

    function getSpawnInterval(now, gameStartAt, baseSpawnIntervalMs, minSpawnIntervalMs, spawnIntervalDecayEveryMs, spawnIntervalDecayMs) {
        const elapsed = now - gameStartAt;
        const decaySteps = Math.floor(elapsed / spawnIntervalDecayEveryMs);
        return Math.max(minSpawnIntervalMs, baseSpawnIntervalMs - decaySteps * spawnIntervalDecayMs);
    }

    function getSpawnBatchSize(now, gameStartAt, baseSpawnBatchSize, maxSpawnBatchSize, spawnBatchGrowthEveryMs) {
        const elapsed = now - gameStartAt;
        const growthSteps = Math.floor(elapsed / spawnBatchGrowthEveryMs);
        return Math.min(maxSpawnBatchSize, baseSpawnBatchSize + growthSteps);
    }

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

    return {
        clamp,
        formatElapsedTime,
        getRandomSpawnAroundPlayer,
        pickWeightedEnemyType,
        getMaxEnemyCount,
        getSpawnInterval,
        getSpawnBatchSize,
        getEntityHitbox,
        isRectOverlap
    };
})();
