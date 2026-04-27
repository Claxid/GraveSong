window.Map2FireKnightBossCombat = (() => {
    function createFireKnightBossCombat(boss, frames) {
        function normalizeAngle(angle) {
            while (angle > Math.PI) angle -= Math.PI * 2;
            while (angle < -Math.PI) angle += Math.PI * 2;
            return angle;
        }

        function getAttackAnchor() {
            return {
                x: boss.attackLockX + boss.attackAnchorOffsetX,
                y: boss.attackLockY + boss.attackAnchorOffsetY
            };
        }

        function generateHazardZones(pattern) {
            const zones = [];
            const baseX = boss.attackOriginX;
            const baseY = boss.attackOriginY;

            for (let i = 0; i < pattern.hazardCount; i++) {
                const angle = boss.lockedAttackAngle - pattern.halfAngle +
                    ((i + 1) / (pattern.hazardCount + 1)) * (pattern.halfAngle * 2);
                const distance = 26 + i * 22;

                zones.push({
                    x: baseX + Math.cos(angle) * distance,
                    y: baseY + Math.sin(angle) * distance,
                    radius: pattern.hazardRadius,
                    color: pattern.hazardColor,
                    spawnedAt: performance.now(),
                    duration: pattern.durationMs + 200,
                    armDelayMs: pattern.hazardArmDelayMs ?? 550,
                    damagePerTick: pattern.hazardDamage ?? 6,
                    lastDamageAt: 0,
                    damageCooldownMs: pattern.hazardDamageCooldownMs ?? 600
                });
            }

            return zones;
        }

        function getRandomAttackPattern() {
            const phaseIndex = Math.max(0, Math.min(2, boss.phase - 1));
            const candidates = boss.attackPatterns.filter((pattern) => {
                if (!boss.lastAttackType) return true;
                if (boss.attackPatterns.length <= 1) return true;
                return pattern.type !== boss.lastAttackType;
            });

            const pool = candidates.length > 0 ? candidates : boss.attackPatterns;
            let totalWeight = 0;
            for (const pattern of pool) {
                const phaseBias = Array.isArray(pattern.phaseBias) ? (pattern.phaseBias[phaseIndex] ?? 1) : 1;
                totalWeight += Math.max(0.001, pattern.probability * phaseBias);
            }

            let roll = Math.random() * totalWeight;
            for (const pattern of pool) {
                const phaseBias = Array.isArray(pattern.phaseBias) ? (pattern.phaseBias[phaseIndex] ?? 1) : 1;
                roll -= Math.max(0.001, pattern.probability * phaseBias);
                if (roll <= 0) {
                    return pattern;
                }
            }

            return pool[pool.length - 1] || boss.attackPatterns[0];
        }

        function updatePhase() {
            const hpRatio = boss.hp / boss.maxhp;
            let newPhase = 1;
            let newAggressiveness = 1.25;

            if (hpRatio < 0.33) {
                newPhase = 3;
                newAggressiveness = 2.1;
            } else if (hpRatio < 0.66) {
                newPhase = 2;
                newAggressiveness = 1.6;
            }

            if (newPhase !== boss.phase) {
                boss.phase = newPhase;
                boss.aggressiveness = newAggressiveness;
                boss.phaseChangeAt = performance.now();
            }
        }

        function isPlayerInAttackCone(player) {
            const dx = player.x - boss.attackOriginX;
            const dy = player.y - boss.attackOriginY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > boss.attackRange) return false;

            const angleToPlayer = Math.atan2(dy, dx);
            const delta = Math.abs(normalizeAngle(angleToPlayer - boss.lockedAttackAngle));
            return delta <= boss.attackHalfAngle;
        }

        function isPlayerInHazard(player) {
            const now = performance.now();
            for (const hazard of boss.hazardZones) {
                if (now - hazard.spawnedAt > hazard.duration) continue;
                if (now - hazard.spawnedAt < hazard.armDelayMs) continue;

                const dx = player.x - hazard.x;
                const dy = player.y - hazard.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < hazard.radius) {
                    if (now - hazard.lastDamageAt >= hazard.damageCooldownMs) {
                        player.hp = Math.max(0, player.hp - hazard.damagePerTick);
                        hazard.lastDamageAt = now;
                    }
                    return true;
                }
            }
            return false;
        }

        function update(player) {
            if (boss.isDying) {
                boss.state = "death";
                const deathFrames = frames.death || [];
                if (deathFrames.length === 0) {
                    boss.deathFinished = true;
                    return;
                }

                const lastFrameIndex = deathFrames.length - 1;
                if (boss.frameIndex >= lastFrameIndex) {
                    boss.frameIndex = lastFrameIndex;
                    boss.deathFinished = true;
                    return;
                }

                boss.animCounter++;
                if (boss.animCounter >= boss.animSpeed) {
                    boss.animCounter = 0;
                    boss.frameIndex = Math.min(lastFrameIndex, boss.frameIndex + 1);
                }
                return;
            }

            if (boss.hp <= 0) return;

            const previousState = boss.state;
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0 && !boss.isAttacking) {
                boss.facingAngle = Math.atan2(dy, dx);
            }

            const now = performance.now();
            updatePhase();

            if (boss.isAttacking) {
                boss.state = boss.currentAttackType;
                const attackElapsed = now - boss.attackStartedAt;

                boss.x = boss.attackLockX;
                boss.y = boss.attackLockY;
                const lockedAnchor = getAttackAnchor();
                boss.attackOriginX = lockedAnchor.x;
                boss.attackOriginY = lockedAnchor.y;

                if (!boss.attackHitApplied && attackElapsed >= boss.currentAttackWindupMs) {
                    if (isPlayerInAttackCone(player)) {
                        player.hp = Math.max(0, player.hp - boss.attackDamage);
                    }
                    boss.attackHitApplied = true;

                    if (boss.currentAttackPattern) {
                        boss.hazardZones = generateHazardZones(boss.currentAttackPattern);
                    }
                }

                if (attackElapsed >= boss.currentAttackDurationMs) {
                    boss.isAttacking = false;
                    boss.lastAttackAt = now;
                    boss.state = distance > 150 ? "run" : "idle";
                }
            } else {
                isPlayerInHazard(player);

                const baseCooldown = boss.currentAttackPattern?.cooldownMs ?? 950;
                const adjustedCooldown = Math.max(220, baseCooldown / boss.aggressiveness);
                const canStartAttack = distance <= Math.max(boss.attackRange, 175) && now - boss.lastAttackAt >= adjustedCooldown;

                if (canStartAttack) {
                    const attackPattern = getRandomAttackPattern();
                    boss.currentAttackType = attackPattern.type;
                    boss.lastAttackType = attackPattern.type;
                    boss.currentAttackPattern = attackPattern;
                    boss.attackRange = attackPattern.range;
                    boss.attackHalfAngle = attackPattern.halfAngle;
                    boss.attackDamage = Math.floor(attackPattern.damage * boss.aggressiveness);
                    boss.currentAttackWindupMs = Math.max(80, Math.floor(attackPattern.windupMs / boss.aggressiveness));
                    boss.currentAttackDurationMs = Math.max(220, Math.floor(attackPattern.durationMs / boss.aggressiveness));
                    boss.isAttacking = true;
                    boss.attackStartedAt = now;
                    boss.attackHitApplied = false;
                    boss.lockedAttackAngle = boss.facingAngle;
                    boss.attackLockX = boss.x;
                    boss.attackLockY = boss.y;
                    const attackAnchor = getAttackAnchor();
                    boss.attackOriginX = attackAnchor.x;
                    boss.attackOriginY = attackAnchor.y;
                    boss.frameIndex = 0;
                    boss.animCounter = 0;
                } else if (distance > 125) {
                    boss.state = "run";
                    if (distance > 0) {
                        boss.x += (dx / distance) * boss.speed;
                        boss.y += (dy / distance) * boss.speed;
                    }
                } else {
                    boss.state = "idle";
                }
            }

            const now2 = performance.now();
            boss.hazardZones = boss.hazardZones.filter((z) => now2 - z.spawnedAt <= z.duration);

            if (boss.state !== previousState) {
                boss.frameIndex = 0;
                boss.animCounter = 0;
            }

            boss.animCounter++;
            const isQuickAttackState = Boolean(
                boss.isAttacking &&
                boss.currentAttackPattern &&
                boss.currentAttackPattern.durationMs <= 900
            );
            const stateAnimSpeed = boss.state === "idle"
                ? boss.animSpeedIdle
                : (isQuickAttackState ? boss.animSpeedAttackQuick : boss.animSpeed);
            if (boss.animCounter >= stateAnimSpeed) {
                boss.animCounter = 0;
                const currentFrames = frames[boss.state];
                if (currentFrames) {
                    boss.frameIndex = (boss.frameIndex + 1) % currentFrames.length;
                }
            }
        }

        function startDeathAnimation() {
            if (boss.isDying || boss.deathFinished) return false;

            boss.hp = 0;
            boss.isAttacking = false;
            boss.hazardZones = [];
            boss.isDying = true;
            boss.deathFinished = false;
            boss.state = "death";
            boss.frameIndex = 0;
            boss.animCounter = 0;
            return true;
        }

        function isDeathAnimationFinished() {
            return Boolean(boss.deathFinished);
        }

        return {
            update,
            startDeathAnimation,
            isDeathAnimationFinished
        };
    }

    return {
        createFireKnightBossCombat
    };
})();