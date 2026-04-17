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
                frame.src = `../assets/sprites/Fire_boss/png/fire_knight/${folder}/${prefix}_${i}.png`;
                frames.push(frame);
            }
            return frames;
        }

        const frames = {
            idle: loadFrames("01_idle", "idle", 8),
            run: loadFrames("02_run", "run", 8),
            atk1: loadFrames("05_1_atk", "1_atk", 11),
            atk2: loadFrames("06_2_atk", "2_atk", 19),
            atk3: loadFrames("07_3_atk", "3_atk", 28),
            spAtk: loadFrames("08_sp_atk", "sp_atk", 18),
            death: loadFrames("11_death", "death", 13)
        };

        const boss = {
            spawnX: startX,
            spawnY: startY,
            x: startX,
            y: startY,
            speed: 0.8,
            hp: 6200,
            maxhp: 6200,
            isBoss: true,
            hitW: 170,
            hitH: 170,
            state: "run",
            frameIndex: 0,
            animCounter: 0,
            animSpeed: 10,
            facingAngle: 0,
            
            // Attack patterns with ground hazard zones
            attackPatterns: [
                { 
                    type: "atk1", 
                    range: 155, 
                    halfAngle: Math.PI / 5, 
                    damage: 16,
                    probability: 0.35, 
                    windupMs: 500, 
                    durationMs: 900, 
                    cooldownMs: 2500,
                    hazardRadius: 70,
                    hazardCount: 1,
                    hazardColor: "rgba(255, 100, 50, 0.6)"
                },
                { 
                    type: "atk2", 
                    range: 180, 
                    halfAngle: Math.PI / 4, 
                    damage: 20,
                    probability: 0.35, 
                    windupMs: 800, 
                    durationMs: 1400, 
                    cooldownMs: 3200,
                    hazardRadius: 80,
                    hazardCount: 2,
                    hazardColor: "rgba(255, 120, 30, 0.6)"
                },
                { 
                    type: "atk3", 
                    range: 205, 
                    halfAngle: Math.PI / 3, 
                    damage: 24,
                    probability: 0.20, 
                    windupMs: 1200, 
                    durationMs: 2200, 
                    cooldownMs: 4000,
                    hazardRadius: 90,
                    hazardCount: 3,
                    hazardColor: "rgba(255, 150, 0, 0.6)"
                },
                { 
                    type: "spAtk", 
                    range: 230, 
                    halfAngle: Math.PI / 2.5, 
                    damage: 28,
                    probability: 0.10, 
                    windupMs: 1000, 
                    durationMs: 1800, 
                    cooldownMs: 5000,
                    hazardRadius: 100,
                    hazardCount: 4,
                    hazardColor: "rgba(255, 200, 0, 0.7)"
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
                    armDelayMs: 550,
                    lastDamageAt: 0,
                    damageCooldownMs: 600
                });
            }
            
            return zones;
        }

        function getRandomAttackPattern() {
            const roll = Math.random();
            let cumulative = 0;
            for (const pattern of boss.attackPatterns) {
                cumulative += pattern.probability;
                if (roll <= cumulative) {
                    return pattern;
                }
            }
            return boss.attackPatterns[0];
        }

        function updatePhase() {
            const hpRatio = boss.hp / boss.maxhp;
            let newPhase = 1;
            let newAggressiveness = 1.0;

            if (hpRatio < 0.33) {
                newPhase = 3;
                newAggressiveness = 1.6;
            } else if (hpRatio < 0.66) {
                newPhase = 2;
                newAggressiveness = 1.3;
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
                        player.hp = Math.max(0, player.hp - 6);
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
                const baseCooldown = boss.attackPatterns.find(p => p.type === boss.currentAttackType)?.cooldownMs || 1200;
                const adjustedCooldown = baseCooldown / boss.aggressiveness;
                
                const canStartAttack = distance <= boss.attackRange && now - boss.lastAttackAt >= adjustedCooldown;
                
                if (canStartAttack) {
                    const attackPattern = getRandomAttackPattern();
                    boss.currentAttackType = attackPattern.type;
                    boss.currentAttackPattern = attackPattern;
                    boss.attackRange = attackPattern.range;
                    boss.attackHalfAngle = attackPattern.halfAngle;
                    boss.attackDamage = Math.floor(attackPattern.damage * boss.aggressiveness);
                    boss.currentAttackWindupMs = Math.floor(attackPattern.windupMs / boss.aggressiveness);
                    boss.currentAttackDurationMs = Math.floor(attackPattern.durationMs / boss.aggressiveness);
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
                } else if (distance > 150) {
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
            if (boss.animCounter >= boss.animSpeed) {
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
                ctx.drawImage(sprite, drawX, drawY, size, size);
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

    function drawBossHealthBar(ctx, canvas, clamp, bossEnemy, sprites) {
        if (!bossEnemy) return;

        const hpRatio = clamp(bossEnemy.hp / Math.max(1, bossEnemy.maxhp), 0, 1);
        const uiReady = sprites.under.complete && sprites.progress.complete && sprites.over.complete &&
            sprites.under.naturalWidth > 0 && sprites.progress.naturalWidth > 0 && sprites.over.naturalWidth > 0;

        const targetWidth = Math.min(canvas.width * 0.31, 380);
        const targetHeight = targetWidth * (sprites.under.naturalHeight / Math.max(1, sprites.under.naturalWidth));
        const x = (canvas.width - targetWidth) / 2;
        const y = 14;

        if (uiReady) {
            ctx.drawImage(sprites.under, x, y, targetWidth, targetHeight);

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

            ctx.drawImage(sprites.over, x, y, targetWidth, targetHeight);

            // Draw a cleaner centered boss title that matches the health bar style.
            const titleH = Math.max(16, Math.round(targetHeight * 0.24));
            const titleY = y + Math.max(2, Math.round(targetHeight * 0.205));
            ctx.save();
            const titleInset = Math.max(50, Math.round(targetWidth * 0.16));
            const titleX = x + titleInset;
            const titleW = targetWidth - titleInset * 2;
            ctx.fillStyle = "rgba(12, 6, 6, 0.72)";
            ctx.fillRect(titleX, titleY, titleW, titleH);
            ctx.strokeStyle = "rgba(240, 205, 120, 0.8)";
            ctx.lineWidth = 1;
            ctx.strokeRect(titleX, titleY, titleW, titleH);
            ctx.fillStyle = "rgba(247, 235, 198, 0.98)";
            ctx.font = `700 ${Math.max(13, Math.round(titleH * 0.72))}px Georgia`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 3;
            ctx.fillText("FIRE KNIGHT", x + targetWidth / 2, titleY + titleH / 2 + 1);
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
        }
    }

    return {
        createFireKnightBoss,
        drawBossHealthBar
    };
})();

