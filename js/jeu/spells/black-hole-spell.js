// Black hole spell module used by player controller.
(function initBlackHoleSpellModule(globalScope) {
    const root = globalScope;
    root.PlayerSpells = root.PlayerSpells || {};

    root.PlayerSpells.createBlackHoleSpell = function createBlackHoleSpell({ ctx, camera, player, worldBounds }) {
        const state = {
            active: false,
            count: 0,
            cooldown: 9000,
            cooldownMultiplier: 1,
            lastSpawnAt: 0,
            searchRadius: 760,
            pullRadius: 140,
            pullStrength: 2.1,
            bossPullResistance: 3.6,
            damageMultiplier: 1,
            size: 240,
            minEnemyCount: 3,
            lifetimeMs: 5000,
            startDurationMs: 800,
            loopDurationMs: 3400,
            endDurationMs: 800,
            loopFrameDurationMs: 85,
            damageTickMs: 500,
            damagePerTick: 2,
            startFrames: [],
            loopFrames: [],
            endFrames: []
        };

        for (let i = 1; i <= 8; i++) {
            const frame = new Image();
            frame.src = `../assets/sprites/Trou-noir/part1(start)/frames/BloodMage_skill1_start_frame${i}.png`;
            state.startFrames.push(frame);
        }
        for (let i = 1; i <= 5; i++) {
            const frame = new Image();
            frame.src = `../assets/sprites/Trou-noir/part2(loop)/frames/BloodMage_skill1_loop_frame${i}.png`;
            state.loopFrames.push(frame);
        }
        for (let i = 1; i <= 6; i++) {
            const frame = new Image();
            frame.src = `../assets/sprites/Trou-noir/part3(end)/frames/BloodMage_skill1_end_frame${i}.png`;
            state.endFrames.push(frame);
        }

        const blackHoles = [];

        function setCount(count) {
            state.count = Math.max(0, Number(count) || 0);
            state.active = state.count > 0;
            if (!state.active) {
                blackHoles.length = 0;
            }
        }

        function getCooldownMs() {
            return Math.max(1800, Math.round(state.cooldown * state.cooldownMultiplier));
        }

        function getPullRadius() {
            return state.pullRadius;
        }

        function getPullStrength() {
            return state.pullStrength;
        }

        function getDamagePerTick() {
            return Math.max(1, Math.round(state.damagePerTick * Math.max(1, state.damageMultiplier)));
        }

        function getRenderSize() {
            return state.size;
        }

        function reset() {
            state.lastSpawnAt = 0;
            blackHoles.length = 0;
        }

        function clampEnemyToWorldBounds(enemy) {
            if (!enemy || !worldBounds || !Number.isFinite(worldBounds.width) || !Number.isFinite(worldBounds.height)) return;
            const halfW = (Number(enemy.hitW) || 30) / 2;
            const halfH = (Number(enemy.hitH) || 30) / 2;
            enemy.x = Math.max(halfW, Math.min(worldBounds.width - halfW, enemy.x));
            enemy.y = Math.max(halfH, Math.min(worldBounds.height - halfH, enemy.y));
        }

        function clampPointToWorldBounds(x, y) {
            if (!worldBounds || !Number.isFinite(worldBounds.width) || !Number.isFinite(worldBounds.height)) {
                return { x, y };
            }

            const margin = getRenderSize() * 0.55;
            return {
                x: Math.max(margin, Math.min(worldBounds.width - margin, x)),
                y: Math.max(margin, Math.min(worldBounds.height - margin, y))
            };
        }

        function getPullRadiusForEnemy(enemy) {
            const enemyRadius = Math.max(enemy.hitW || 0, enemy.hitH || 0) / 2;
            return getPullRadius() + enemyRadius;
        }

        function getPullStep(distance, affectRadius, enemy) {
            const distanceFactor = Math.max(0.85, 1 - (distance / Math.max(1, affectRadius)));
            const speed = Math.max(0.1, Number(enemy.speed) || 1);
            const baseResistance = 1 + (speed * 0.9);
            const bossResistance = enemy && enemy.isBoss ? Math.max(1, state.bossPullResistance) : 1;
            const resistance = baseResistance * bossResistance;
            return (getPullStrength() * distanceFactor) / resistance;
        }

        function jitterCenter(x, y) {
            const jitter = Math.min(60, getPullRadius() * 0.42);
            return {
                x: x + (Math.random() * 2 - 1) * jitter,
                y: y + (Math.random() * 2 - 1) * jitter
            };
        }

        function findTargets(enemies, maxTargets) {
            const alive = enemies.filter((enemy) => {
                if (!enemy || enemy.hp <= 0) return false;
                if (enemy.isBoss) return true;
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                return (dx * dx + dy * dy) <= (state.searchRadius * state.searchRadius);
            });

            if (alive.length === 0) return [];

            const hasBoss = alive.some((enemy) => enemy.isBoss);
            if (!hasBoss && alive.length < state.minEnemyCount) return [];

            const clusterRadius = getPullRadius() * 1.25;
            const minCenterDistance = getPullRadius() * 0.9;
            const candidates = [];

            for (const seed of alive) {
                const group = alive.filter((enemy) => {
                    const dx = enemy.x - seed.x;
                    const dy = enemy.y - seed.y;
                    return (dx * dx + dy * dy) <= (clusterRadius * clusterRadius);
                });

                let sumX = 0;
                let sumY = 0;
                for (const enemy of group) {
                    sumX += enemy.x;
                    sumY += enemy.y;
                }

                candidates.push({
                    score: group.length,
                    x: sumX / Math.max(1, group.length),
                    y: sumY / Math.max(1, group.length)
                });
            }

            candidates.sort((a, b) => b.score - a.score);

            const selected = [];
            for (const candidate of candidates) {
                if (selected.length >= maxTargets) break;

                const tooClose = selected.some((existing) => {
                    const dx = candidate.x - existing.x;
                    const dy = candidate.y - existing.y;
                    return (dx * dx + dy * dy) < (minCenterDistance * minCenterDistance);
                });
                if (tooClose) continue;
                selected.push(candidate);
            }

            return selected.map((candidate) => ({ x: candidate.x, y: candidate.y }));
        }

        function spreadTargetsChaotically(targets) {
            const spread = [];
            const minGap = getRenderSize() * 0.78;

            for (const target of targets) {
                let selectedPoint = null;

                for (let attempt = 0; attempt < 20; attempt++) {
                    const angle = Math.random() * Math.PI * 2;
                    const randomRadius = 22 + Math.random() * getPullRadius() * 0.92;
                    const chaoticOffsetX = Math.cos(angle) * randomRadius + (Math.random() * 2 - 1) * 30;
                    const chaoticOffsetY = Math.sin(angle) * randomRadius + (Math.random() * 2 - 1) * 30;
                    const candidate = clampPointToWorldBounds(target.x + chaoticOffsetX, target.y + chaoticOffsetY);

                    const overlaps = spread.some((p) => {
                        const dx = candidate.x - p.x;
                        const dy = candidate.y - p.y;
                        return (dx * dx + dy * dy) < (minGap * minGap);
                    });

                    if (!overlaps) {
                        selectedPoint = candidate;
                        break;
                    }
                }

                if (!selectedPoint) {
                    selectedPoint = clampPointToWorldBounds(target.x, target.y);
                }

                spread.push(selectedPoint);
            }

            return spread;
        }

        function spawn(x, y, now) {
            blackHoles.push({
                x,
                y,
                spawnedAt: now,
                lastDamageAt: now
            });
        }

        function getFrame(blackHole, now) {
            const elapsed = now - blackHole.spawnedAt;
            const startEnd = state.startDurationMs;
            const loopEnd = startEnd + state.loopDurationMs;

            if (elapsed < startEnd) {
                const frames = state.startFrames;
                if (frames.length === 0) return null;
                const phaseProgress = elapsed / Math.max(1, state.startDurationMs);
                const frameIndex = Math.min(frames.length - 1, Math.max(0, Math.floor(phaseProgress * frames.length)));
                return frames[frameIndex] || null;
            }

            if (elapsed < loopEnd) {
                const frames = state.loopFrames;
                if (frames.length === 0) return null;
                const loopElapsed = elapsed - startEnd;
                const frameIndex = Math.floor(loopElapsed / Math.max(1, state.loopFrameDurationMs)) % frames.length;
                return frames[frameIndex] || null;
            }

            const frames = state.endFrames;
            if (frames.length === 0) return null;
            const phaseProgress = (elapsed - loopEnd) / Math.max(1, state.endDurationMs);
            const frameIndex = Math.min(frames.length - 1, Math.max(0, Math.floor(phaseProgress * frames.length)));
            return frames[frameIndex] || null;
        }

        function update(enemies, now) {
            if (!state.active) {
                return;
            }

            if (enemies.length > 0 && now - state.lastSpawnAt >= getCooldownMs()) {
                const blackHoleCount = Math.max(1, Math.min(16, state.count));
                const targets = findTargets(enemies, blackHoleCount);

                if (targets.length > 0) {
                    const spreadTargets = spreadTargetsChaotically(targets);
                    for (const target of spreadTargets) {
                        const jittered = jitterCenter(target.x, target.y);
                        const bounded = clampPointToWorldBounds(jittered.x, jittered.y);
                        spawn(bounded.x, bounded.y, now);
                    }
                    state.lastSpawnAt = now;
                }
            }

            for (let i = blackHoles.length - 1; i >= 0; i--) {
                const blackHole = blackHoles[i];
                const elapsed = now - blackHole.spawnedAt;

                if (elapsed >= state.lifetimeMs) {
                    blackHoles.splice(i, 1);
                    continue;
                }

                for (const enemy of enemies) {
                    if (!enemy || enemy.hp <= 0) continue;

                    const dx = blackHole.x - enemy.x;
                    const dy = blackHole.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                    const affectRadius = getPullRadiusForEnemy(enemy);
                    if (dist > affectRadius) continue;

                    const nx = dx / dist;
                    const ny = dy / dist;
                    const pullStep = getPullStep(dist, affectRadius, enemy);

                    enemy.x += nx * pullStep;
                    enemy.y += ny * pullStep;
                    clampEnemyToWorldBounds(enemy);
                }

                if (now - blackHole.lastDamageAt >= state.damageTickMs) {
                    const damagePerTick = getDamagePerTick();

                    for (const enemy of enemies) {
                        if (!enemy || enemy.hp <= 0) continue;

                        const dx = enemy.x - blackHole.x;
                        const dy = enemy.y - blackHole.y;
                        const affectRadius = getPullRadiusForEnemy(enemy);
                        if ((dx * dx + dy * dy) > (affectRadius * affectRadius)) continue;

                        enemy.hp = Math.max(0, enemy.hp - damagePerTick);
                    }
                    blackHole.lastDamageAt = now;
                }
            }
        }

        function draw() {
            if (!state.active) {
                return;
            }

            const now = performance.now();
            const renderSize = getRenderSize() * camera.zoom;

            for (const blackHole of blackHoles) {
                const centerX = (blackHole.x - camera.x) * camera.zoom;
                const centerY = (blackHole.y - camera.y) * camera.zoom;
                const frame = getFrame(blackHole, now);

                if (frame && frame.complete && frame.naturalWidth > 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.92;
                    ctx.drawImage(
                        frame,
                        centerX - renderSize / 2,
                        centerY - renderSize / 2,
                        renderSize,
                        renderSize
                    );
                    ctx.restore();
                } else {
                    ctx.save();
                    const gradient = ctx.createRadialGradient(centerX, centerY, renderSize * 0.1, centerX, centerY, renderSize * 0.6);
                    gradient.addColorStop(0, "rgba(0, 0, 0, 0.85)");
                    gradient.addColorStop(0.5, "rgba(34, 9, 54, 0.5)");
                    gradient.addColorStop(1, "rgba(86, 14, 120, 0.05)");
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, renderSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        return {
            state,
            setCount,
            getCooldownMs,
            getPullRadius,
            getPullStrength,
            getDamagePerTick,
            getRenderSize,
            reset,
            update,
            draw
        };
    };
})(window);
