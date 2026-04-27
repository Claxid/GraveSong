// Chaos aura spell module used by player controller.
(function initChaosAuraSpellModule(globalScope) {
    const root = globalScope;
    root.PlayerSpells = root.PlayerSpells || {};

    root.PlayerSpells.createChaosAuraSpell = function createChaosAuraSpell({ ctx, camera, player, applyEnemyDamage }) {
        const state = {
            active: false,
            radius: 75,
            damage: 22,
            cooldown: 2000,
            sizeMultiplier: 1,
            damageMultiplier: 1,
            cooldownMultiplier: 1,
            nextPulseAt: 0,
            frames: [],
            frameIndex: 0,
            pulseAnimActive: false,
            pulseAnimStartAt: 0,
            pulseAnimDurationMs: 700,
            knockbackDistance: 18,
            devMinCooldownMs: null,
            knockbackAppliedEnemies: new WeakSet()
        };

        for (let i = 1; i <= 12; i++) {
            const frame = new Image();
            frame.src = `../assets/sprites/Zone/frames/BloodMage_skill2_frame${i}.png`;
            state.frames.push(frame);
        }

        function setActive(isActive, now = performance.now()) {
            state.active = !!isActive;
            if (state.active && state.nextPulseAt <= 0) {
                state.nextPulseAt = now + Math.round(getCooldownMs() * 1.5);
            }
            if (!state.active) {
                state.pulseAnimActive = false;
                state.frameIndex = 0;
                state.nextPulseAt = 0;
                state.knockbackAppliedEnemies = new WeakSet();
            }
        }

        function getRadius() {
            return state.radius * state.sizeMultiplier;
        }

        function getDamage() {
            return Math.max(1, Math.round(state.damage * state.damageMultiplier));
        }

        function getCooldownMs() {
            const minCooldown = Number.isFinite(state.devMinCooldownMs)
                ? Math.max(20, state.devMinCooldownMs)
                : 250;
            return Math.max(minCooldown, Math.round(state.cooldown * state.cooldownMultiplier));
        }

        function update(enemies, now) {
            if (!state.active) {
                return;
            }

            if (state.pulseAnimActive) {
                const elapsed = now - state.pulseAnimStartAt;
                const progress = elapsed / Math.max(1, state.pulseAnimDurationMs);
                if (progress >= 1) {
                    state.pulseAnimActive = false;
                    state.frameIndex = 0;
                } else {
                    const frameCount = Math.max(1, state.frames.length);
                    state.frameIndex = Math.min(frameCount - 1, Math.floor(progress * frameCount));
                }
            }

            const auraCooldown = getCooldownMs();
            if (state.nextPulseAt <= 0) {
                state.nextPulseAt = now + auraCooldown;
            }

            if (now < state.nextPulseAt) {
                return;
            }

            const auraRadius = getRadius();
            const auraDamage = getDamage();

            for (const enemy of enemies) {
                if (!enemy || enemy.hp <= 0) continue;

                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const enemyRadius = Math.max(enemy.hitW || 0, enemy.hitH || 0) / 2;
                const hitDistance = auraRadius + enemyRadius;
                if ((dx * dx + dy * dy) > hitDistance * hitDistance) continue;

                if (typeof applyEnemyDamage === "function") {
                    applyEnemyDamage(enemy, auraDamage, "Aura du chaos");
                } else {
                    enemy.hp = Math.max(0, enemy.hp - auraDamage);
                }

                if (!state.knockbackAppliedEnemies.has(enemy)) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0.0001) {
                        const pushX = (dx / dist) * state.knockbackDistance;
                        const pushY = (dy / dist) * state.knockbackDistance;
                        enemy.x += pushX;
                        enemy.y += pushY;
                    }
                    state.knockbackAppliedEnemies.add(enemy);
                }
            }

            state.pulseAnimActive = true;
            state.pulseAnimStartAt = now;
            state.frameIndex = 0;
            state.nextPulseAt = now + auraCooldown;
        }

        function draw() {
            if (!state.active) {
                return;
            }

            const auraRadius = getRadius();
            const auraSize = auraRadius * 2 * camera.zoom;
            const centerX = (player.x - camera.x) * camera.zoom;
            const centerY = (player.y - camera.y) * camera.zoom;
            const auraFrame = state.frames[state.frameIndex];

            if (auraFrame && auraFrame.complete && auraFrame.naturalWidth > 0) {
                ctx.save();
                ctx.globalAlpha = state.pulseAnimActive ? 0.82 : 0.42;
                ctx.drawImage(
                    auraFrame,
                    centerX - auraSize / 2,
                    centerY - auraSize / 2,
                    auraSize,
                    auraSize
                );
                ctx.restore();
            } else {
                ctx.save();
                ctx.fillStyle = "rgba(156, 40, 24, 0.18)";
                ctx.strokeStyle = "rgba(255, 120, 60, 0.75)";
                ctx.lineWidth = Math.max(2, camera.zoom * 2);
                ctx.beginPath();
                ctx.arc(centerX, centerY, auraRadius * camera.zoom, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }

        return {
            state,
            setActive,
            getRadius,
            getDamage,
            getCooldownMs,
            update,
            draw
        };
    };
})(window);
