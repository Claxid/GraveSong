window.Map1BossSystem = (() => {
    function createBossController(startX, startY, ctx, camera) {
        function normalizeAngle(angle) {
            while (angle > Math.PI) angle -= Math.PI * 2;
            while (angle < -Math.PI) angle += Math.PI * 2;
            return angle;
        }

        function loadFrames(folder, prefix, count) {
            const frames = [];
            for (let i = 1; i <= count; i++) {
                const frame = new Image();
                frame.src = `../assets/sprites/mino_v1.1_free/animations/${folder}/${prefix}_${i}.png`;
                frames.push(frame);
            }
            return frames;
        }

        const frames = {
            idle: loadFrames("idle", "idle", 16),
            walk: loadFrames("walk", "walk", 12),
            atk: loadFrames("atk_1", "atk_1", 16)
        };

        const enemy = {
            spawnX: startX,
            spawnY: startY,
            x: startX,
            y: startY,
            speed: 0.9,
            hp: 6000,
            maxhp: 6000,
            isBoss: true,
            hitW: 90,
            hitH: 90,
            state: "walk",
            frameIndex: 0,
            animCounter: 0,
            animSpeed: 12,
            facingAngle: 0,
            attackRange: 230,
            attackHalfAngle: Math.PI / 4,
            attackDamage: 52,
            attackCooldownMs: 2100,
            attackWindupMs: 850,
            attackDurationMs: 1550,
            attackQuickChance: 0.18,
            attackQuickReductionMinMs: 120,
            attackQuickReductionMaxMs: 180,
            currentAttackWindupMs: 850,
            currentAttackDurationMs: 1550,
            lastAttackAt: 0,
            isAttacking: false,
            attackStartedAt: 0,
            attackHitApplied: false,
            lockedAttackAngle: 0
        };

        function isPlayerInAttackCone(player) {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > enemy.attackRange) return false;

            const angleToPlayer = Math.atan2(dy, dx);
            const delta = Math.abs(normalizeAngle(angleToPlayer - enemy.lockedAttackAngle));
            return delta <= enemy.attackHalfAngle;
        }

        function update(player) {
            if (enemy.hp <= 0) return;

            const previousState = enemy.state;
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0 && !enemy.isAttacking) {
                enemy.facingAngle = Math.atan2(dy, dx);
            }

            const now = performance.now();
            if (enemy.isAttacking) {
                enemy.state = "atk";
                const attackElapsed = now - enemy.attackStartedAt;

                if (!enemy.attackHitApplied && attackElapsed >= enemy.currentAttackWindupMs) {
                    if (isPlayerInAttackCone(player)) {
                        player.hp = Math.max(0, player.hp - enemy.attackDamage);
                    }
                    enemy.attackHitApplied = true;
                }

                if (attackElapsed >= enemy.currentAttackDurationMs) {
                    enemy.isAttacking = false;
                    enemy.lastAttackAt = now;
                    enemy.state = distance > 120 ? "walk" : "idle";
                }
            } else {
                const canStartAttack = distance <= enemy.attackRange && now - enemy.lastAttackAt >= enemy.attackCooldownMs;
                if (canStartAttack) {
                    enemy.isAttacking = true;
                    enemy.state = "atk";
                    enemy.attackStartedAt = now;
                    enemy.attackHitApplied = false;
                    enemy.lockedAttackAngle = enemy.facingAngle;

                    const useQuickAttack = Math.random() < enemy.attackQuickChance;
                    const reductionMs = useQuickAttack
                        ? enemy.attackQuickReductionMinMs + Math.random() * (enemy.attackQuickReductionMaxMs - enemy.attackQuickReductionMinMs)
                        : 0;
                    enemy.currentAttackDurationMs = Math.max(1100, enemy.attackDurationMs - reductionMs);
                    enemy.currentAttackWindupMs = Math.max(550, enemy.attackWindupMs - reductionMs * 0.45);

                    enemy.frameIndex = 0;
                    enemy.animCounter = 0;
                } else if (distance > 120) {
                    enemy.state = "walk";
                    if (distance > 0) {
                        enemy.x += (dx / distance) * enemy.speed;
                        enemy.y += (dy / distance) * enemy.speed;
                    }
                } else {
                    enemy.state = "idle";
                }
            }

            if (enemy.state !== previousState) {
                enemy.frameIndex = 0;
                enemy.animCounter = 0;
            }

            enemy.animCounter++;
            if (enemy.animCounter >= enemy.animSpeed) {
                enemy.animCounter = 0;
                const currentFrames = frames[enemy.state];
                enemy.frameIndex = (enemy.frameIndex + 1) % currentFrames.length;
            }
        }

        function draw() {
            const currentFrames = frames[enemy.state];
            const sprite = currentFrames[enemy.frameIndex] || currentFrames[0];
            if (!sprite) return;

            const size = 330 * camera.zoom;
            const centerX = (enemy.x - camera.x) * camera.zoom;
            const centerY = (enemy.y - camera.y) * camera.zoom;

            if (enemy.isAttacking) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(
                    centerX,
                    centerY,
                    enemy.attackRange * camera.zoom,
                    enemy.lockedAttackAngle - enemy.attackHalfAngle,
                    enemy.lockedAttackAngle + enemy.attackHalfAngle
                );
                ctx.closePath();
                ctx.fillStyle = enemy.attackHitApplied ? "rgba(220, 40, 40, 0.18)" : "rgba(255, 60, 60, 0.3)";
                ctx.fill();
                ctx.strokeStyle = "rgba(255, 100, 100, 0.8)";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }

            const drawX = centerX - size / 2;
            const drawY = centerY - size / 2;
            ctx.drawImage(sprite, drawX, drawY, size, size);
        }

        return { enemy, update, draw };
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
        createBossController,
        drawBossHealthBar
    };
})();
