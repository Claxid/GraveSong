window.Map2BossSystem = (() => {
    function createFireKnightBoss(startX, startY, ctx, camera) {
        const ATTACK_ANCHOR_OFFSET_X = 0;
        const ATTACK_ANCHOR_OFFSET_Y = 92;

        function normalizeAngle(angle) {
            while (angle > Math.PI) angle -= Math.PI * 2;
            while (angle < -Math.PI) angle += Math.PI * 2;
            return angle;
        }

        function loadFrames(folder, prefix, count) {
            const frames = [];
            for (let i = 1; i <= count; i++) {
                const frame = new Image();
                frame.src = `../assets/sprites/boss_demon_slime_FREE_v1.0/boss_demon_slime_FREE_v1.0/individual sprites/${folder}/${prefix}_${i}.png`;
                frames.push(frame);
            }
            return frames;
        }

        const frames = {
            idle: loadFrames("01_demon_idle", "demon_idle", 6),
            run: loadFrames("02_demon_walk", "demon_walk", 12),
            atk1: loadFrames("03_demon_cleave", "demon_cleave", 15),
            atk2: loadFrames("04_demon_take_hit", "demon_take_hit", 5),
            atk3: loadFrames("03_demon_cleave", "demon_cleave", 15),
            spAtk: loadFrames("03_demon_cleave", "demon_cleave", 15),
            death: loadFrames("05_demon_death", "demon_death", 22)
        };

        const boss = {
            spawnX: startX,
            spawnY: startY,
            x: startX,
            y: startY,
            speed: 1.15,
            hp: 6200,
            maxhp: 6200,
            isBoss: true,
            hitW: 170,
            hitH: 170,
            state: "run",
            frameIndex: 0,
            animCounter: 0,
            animSpeed: 14,
            animSpeedIdle: 24,
            animSpeedAttackQuick: 10,
            facingAngle: 0,
            
            // Attack patterns with ground hazard zones
            attackPatterns: [
                { 
                    type: "atk1", 
                    range: 170, 
                    halfAngle: Math.PI / 5.5, 
                    damage: 16,
                    probability: 0.30, 
                    windupMs: 360, 
                    durationMs: 760, 
                    cooldownMs: 1100,
                    hazardRadius: 70,
                    hazardCount: 1,
                    hazardColor: "rgba(255, 100, 50, 0.6)",
                    hazardArmDelayMs: 420,
                    hazardDamageCooldownMs: 520,
                    hazardDamage: 6,
                    phaseBias: [1.0, 1.1, 1.2]
                },
                { 
                    type: "atk2", 
                    range: 145, 
                    halfAngle: Math.PI / 7, 
                    damage: 13,
                    probability: 0.24, 
                    windupMs: 220, 
                    durationMs: 520, 
                    cooldownMs: 780,
                    hazardRadius: 66,
                    hazardCount: 0,
                    hazardColor: "rgba(255, 120, 30, 0.5)",
                    phaseBias: [0.9, 1.25, 1.45]
                },
                { 
                    type: "atk3", 
                    range: 210, 
                    halfAngle: Math.PI / 3.2, 
                    damage: 21,
                    probability: 0.28, 
                    windupMs: 560, 
                    durationMs: 1100, 
                    cooldownMs: 1500,
                    hazardRadius: 88,
                    hazardCount: 2,
                    hazardColor: "rgba(255, 150, 0, 0.62)",
                    hazardArmDelayMs: 360,
                    hazardDamageCooldownMs: 430,
                    hazardDamage: 7,
                    phaseBias: [1.0, 1.15, 1.35]
                },
                { 
                    type: "spAtk", 
                    range: 230, 
                    halfAngle: Math.PI / 2.5, 
                    damage: 26,
                    probability: 0.18, 
                    windupMs: 760, 
                    durationMs: 1450, 
                    cooldownMs: 2100,
                    hazardRadius: 104,
                    hazardCount: 4,
                    hazardColor: "rgba(255, 200, 0, 0.72)",
                    hazardArmDelayMs: 300,
                    hazardDamageCooldownMs: 360,
                    hazardDamage: 8,
                    phaseBias: [0.9, 1.15, 1.5]
                }
            ],
            
            currentAttackType: null,
            lastAttackAt: 0,
            isAttacking: false,
            attackStartedAt: 0,
            attackHitApplied: false,
            lockedAttackAngle: 0,
            attackRange: 155,
            attackHalfAngle: Math.PI / 5,
            attackDamage: 30,
            currentAttackWindupMs: 500,
            currentAttackDurationMs: 900,
            currentAttackPattern: null,
            lastAttackType: null,
            attackLockX: startX,
            attackLockY: startY,
            attackAnchorOffsetX: ATTACK_ANCHOR_OFFSET_X,
            attackAnchorOffsetY: ATTACK_ANCHOR_OFFSET_Y,
            attackOriginX: startX + ATTACK_ANCHOR_OFFSET_X,
            attackOriginY: startY + ATTACK_ANCHOR_OFFSET_Y,
            
            // Hazard zones
            hazardZones: [],
            
            // Phase system
            phase: 1,
            phaseChangeAt: 0,
            aggressiveness: 1.0,
            isDying: false,
            deathFinished: false
        };

        function getAttackAnchor(x = boss.x, y = boss.y) {
            return {
                x: x + boss.attackAnchorOffsetX,
                y: y + boss.attackAnchorOffsetY
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
                const zoneX = baseX + Math.cos(angle) * distance;
                const zoneY = baseY + Math.sin(angle) * distance;
                
                zones.push({
                    x: zoneX,
                    y: zoneY,
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
                    // Apply damage with cooldown
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

                // Keep the attack centered on the boss sprite and freeze all movement while casting.
                boss.x = boss.attackLockX;
                boss.y = boss.attackLockY;
                const lockedAnchor = getAttackAnchor(boss.attackLockX, boss.attackLockY);
                boss.attackOriginX = lockedAnchor.x;
                boss.attackOriginY = lockedAnchor.y;

                if (!boss.attackHitApplied && attackElapsed >= boss.currentAttackWindupMs) {
                    if (isPlayerInAttackCone(player)) {
                        player.hp = Math.max(0, player.hp - boss.attackDamage);
                    }
                    boss.attackHitApplied = true;
                    
                    // Generate hazard zones
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
                // Check if player is still in hazard (hazard function handles damage with cooldown)
                isPlayerInHazard(player);
                
                // Reduce cooldown based on phase
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
                    const attackAnchor = getAttackAnchor(boss.attackLockX, boss.attackLockY);
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

            // Clean up old hazard zones
            const now2 = performance.now();
            boss.hazardZones = boss.hazardZones.filter(z => now2 - z.spawnedAt <= z.duration);

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

        function draw() {
            const currentFrames = frames[boss.state];
            const sprite = currentFrames ? currentFrames[boss.frameIndex] : null;

            const size = 360 * camera.zoom;
            const centerX = (boss.x - camera.x) * camera.zoom;
            const centerY = (boss.y - camera.y) * camera.zoom;

            // Draw hazard zones
            for (const hazard of boss.hazardZones) {
                ctx.save();
                const now = performance.now();
                const progress = (now - hazard.spawnedAt) / hazard.duration;
                const radius = hazard.radius * camera.zoom;
                const pulseScale = 1 + Math.sin(progress * Math.PI * 4) * 0.15;
                
                ctx.fillStyle = hazard.color;
                ctx.beginPath();
                ctx.arc(
                    (hazard.x - camera.x) * camera.zoom,
                    (hazard.y - camera.y) * camera.zoom,
                    radius * pulseScale,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                
                ctx.strokeStyle = hazard.color.replace('0.6', '1.0');
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }

            if (boss.isAttacking) {
                ctx.save();
                ctx.beginPath();
                const attackCenterX = (boss.attackOriginX - camera.x) * camera.zoom;
                const attackCenterY = (boss.attackOriginY - camera.y) * camera.zoom;
                ctx.moveTo(attackCenterX, attackCenterY);
                ctx.arc(
                    attackCenterX,
                    attackCenterY,
                    boss.attackRange * camera.zoom,
                    boss.lockedAttackAngle - boss.attackHalfAngle,
                    boss.lockedAttackAngle + boss.attackHalfAngle
                );
                ctx.closePath();
                
                const colorAlpha = boss.attackHitApplied ? "rgba(220, 40, 40, 0.18)" : "rgba(255, 100, 100, 0.35)";
                const strokeColor = boss.phase === 3 ? "rgba(255, 150, 0, 0.9)" : "rgba(255, 100, 100, 0.8)";
                
                ctx.fillStyle = colorAlpha;
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }

            // Draw the boss sprite
            if (sprite) {
                const drawX = centerX - size / 2;
                const drawY = centerY - size / 2;
                const facingLeft = Math.cos(boss.facingAngle) > 0;

                if (facingLeft) {
                    ctx.save();
                    ctx.translate(centerX, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(sprite, -size / 2, drawY, size, size);
                    ctx.restore();
                } else {
                    ctx.drawImage(sprite, drawX, drawY, size, size);
                }
            } else {
                // Fallback placeholder if sprite doesn't load
                ctx.fillStyle = "rgba(220, 100, 50, 0.8)";
                ctx.beginPath();
                ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
        }

        return { boss, update, draw, startDeathAnimation, isDeathAnimationFinished };
    }

    // Fire Demon label tuning (you can edit these values quickly)
    const FIRE_DEMON_LABEL_SCALE = 0.17;
    const FIRE_DEMON_LABEL_MIN_PX = 8;
    const FIRE_DEMON_LABEL_FONT_FAMILY = '"Press Start 2P", "Pixelify Sans", "VT323", monospace';
    const FIRE_DEMON_LABEL_Y_RATIO = 0.48;

    function drawBossHealthBar(ctx, canvas, clamp, bossEnemy, sprites) {
        if (!bossEnemy) return;

        const hpRatio = clamp(bossEnemy.hp / Math.max(1, bossEnemy.maxhp), 0, 1);
        const uiReady = sprites.under.complete && sprites.progress.complete &&
            sprites.under.naturalWidth > 0 && sprites.progress.naturalWidth > 0;

        const targetWidth = Math.min(canvas.width * 0.31, 380);
        const targetHeight = targetWidth * (sprites.under.naturalHeight / Math.max(1, sprites.under.naturalWidth));
        const x = (canvas.width - targetWidth) / 2;
        const y = 14;

        if (uiReady) {
            // Draw background only
            ctx.drawImage(sprites.under, x, y, targetWidth, targetHeight);

            // Draw health fill with clipping
            const fullSourceWidth = sprites.progress.naturalWidth;
            const sourceHeight = sprites.progress.naturalHeight;
            const filledSourceWidth = Math.max(0, Math.floor(fullSourceWidth * hpRatio));
            const progressInset = Math.max(3, Math.round(targetHeight * 0.09));
            const progressX = Math.round(x + progressInset);
            const progressY = Math.round(y + progressInset);
            const progressW = Math.max(0, Math.floor(targetWidth - progressInset * 2));
            const progressH = Math.max(0, Math.floor(targetHeight - progressInset * 2));
            const safetyPx = 2;
            const maxFillWidth = Math.max(0, progressW - safetyPx);
            const filledTargetWidth = Math.max(0, Math.floor(maxFillWidth * hpRatio));

            if (filledSourceWidth > 0 && filledTargetWidth > 0 && progressH > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(progressX, progressY, Math.max(0, progressW - safetyPx), progressH);
                ctx.clip();
                ctx.drawImage(
                    sprites.progress,
                    0,
                    0,
                    filledSourceWidth,
                    sourceHeight,
                    progressX,
                    progressY,
                    filledTargetWidth,
                    progressH
                );
                ctx.restore();
            }

            // Draw "FIRE DEMON" text in white on the health bar
            ctx.save();
            const labelSize = Math.max(FIRE_DEMON_LABEL_MIN_PX, Math.round(targetHeight * FIRE_DEMON_LABEL_SCALE));
            const labelX = x + targetWidth / 2;
            const labelY = y + targetHeight * FIRE_DEMON_LABEL_Y_RATIO;

            // Boss1-like text style: light fill with dark outline.
            ctx.imageSmoothingEnabled = false;
            ctx.font = `700 ${labelSize}px ${FIRE_DEMON_LABEL_FONT_FAMILY}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(1, Math.round(labelSize * 0.2));
            ctx.strokeStyle = "rgba(58, 18, 26, 0.95)";
            ctx.strokeText("FIRE DEMON", labelX, labelY);
            ctx.fillStyle = "rgba(236, 236, 236, 0.9)";
            ctx.fillText("FIRE DEMON", labelX, labelY);
            ctx.restore();
        } else {
            const fallbackH = 24;
            const fallbackY = y + (targetHeight - fallbackH) / 2;
            ctx.fillStyle = "rgba(35, 12, 12, 0.9)";
            ctx.fillRect(x, fallbackY, targetWidth, fallbackH);
            ctx.fillStyle = "rgba(196, 56, 56, 0.95)";
            ctx.fillRect(x, fallbackY, targetWidth * hpRatio, fallbackH);
            ctx.strokeStyle = "rgba(240, 205, 120, 0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, fallbackY, targetWidth, fallbackH);
            
            // Fallback text
            const fallbackLabelSize = Math.max(FIRE_DEMON_LABEL_MIN_PX, Math.round(fallbackH * 0.4));
            ctx.font = `700 ${fallbackLabelSize}px ${FIRE_DEMON_LABEL_FONT_FAMILY}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(1, Math.round(fallbackLabelSize * 0.2));
            ctx.strokeStyle = "rgba(58, 18, 26, 0.95)";
            ctx.strokeText("FIRE DEMON", canvas.width / 2, fallbackY + fallbackH * 0.53);
            ctx.fillStyle = "rgba(236, 236, 236, 0.9)";
            ctx.fillText("FIRE DEMON", canvas.width / 2, fallbackY + fallbackH * 0.53);
        }
    }

    return {
        createFireKnightBoss,
        drawBossHealthBar
    };
})();

