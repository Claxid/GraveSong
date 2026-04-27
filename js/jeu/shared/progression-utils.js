window.GameProgressionUtils = (() => {
    function getRandomSpawnAroundPlayer(player, mapWidth, mapHeight, ringMin, ringMax) {
        const angle = Math.random() * Math.PI * 2;
        const radius = ringMin + Math.random() * (ringMax - ringMin);
        const rawX = player.x + Math.cos(angle) * radius;
        const rawY = player.y + Math.sin(angle) * radius;
        const margin = 32;

        return {
            x: Math.max(margin, Math.min(mapWidth - margin, rawX)),
            y: Math.max(margin, Math.min(mapHeight - margin, rawY))
        };
    }

    function getMaxEnemyCount(now, gameStartAt, baseMax, growthEveryMs, perStep, absoluteMax) {
        const elapsed = now - gameStartAt;
        const growthSteps = Math.floor(elapsed / growthEveryMs);
        return Math.min(absoluteMax, baseMax + growthSteps * perStep);
    }

    function getSpawnInterval(now, gameStartAt, baseIntervalMs, decayEveryMs, decayMs, minIntervalMs) {
        const elapsed = now - gameStartAt;
        const decaySteps = Math.floor(elapsed / decayEveryMs);
        return Math.max(minIntervalMs, baseIntervalMs - decaySteps * decayMs);
    }

    function getSpawnBatchSize(now, gameStartAt, baseBatch, growthEveryMs, maxBatch) {
        const elapsed = now - gameStartAt;
        const growthSteps = Math.floor(elapsed / growthEveryMs);
        return Math.min(maxBatch, baseBatch + growthSteps);
    }

    function givePlayerExp(player, amount) {
        player.exp += amount;
        while (player.exp >= player.maxExp) {
            player.exp -= player.maxExp;
            player.level += 1;
            player.maxExp += player.maxExp * 0.2;
        }
    }

    return {
        getRandomSpawnAroundPlayer,
        getMaxEnemyCount,
        getSpawnInterval,
        getSpawnBatchSize,
        givePlayerExp
    };
})();
