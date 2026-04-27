window.BossSystem = (() => {
    const DEFAULTS = {
        spawnDelayMs: 5 * 60 * 1000
    };

    function createBossController(canvas, ctx, camera, startX, startY) {
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
            type: "boss",
            spawnX: startX,
            spawnY: startY,
            x: startX,
            y: startY,
            speed: 1.05,
            hp: 750,
            maxhp: 750,
            isBoss: true,
            hitW: 90,
            hitH: 90,
            state: "walk",
            frameIndex: 0,
            animCounter: 0,
            animSpeed: 8,
            facingAngle: 0,
            attackRange: 230,
            attackHalfAngle: Math.PI / 4,
            attackDamage: 20,
            attackCooldownMs: 1500,
            attackWindupMs: 800,
            attackDurationMs: 1300,
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

                if (!enemy.attackHitApplied && attackElapsed >= enemy.attackWindupMs) {
                    if (isPlayerInAttackCone(player)) {
                        player.hp = Math.max(0, player.hp - enemy.attackDamage);
                    }
                    enemy.attackHitApplied = true;
                }

                if (attackElapsed >= enemy.attackDurationMs) {
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

            const drawX = (enemy.x - camera.x) * camera.zoom - size / 2;
            const drawY = (enemy.y - camera.y) * camera.zoom - size / 2;
            ctx.drawImage(sprite, drawX, drawY, size, size);
        }

        return { enemy, update, draw };
    }

    function createBossManager({
        canvas,
        ctx,
        cameraController,
        enemyControllers,
        playerController,
        gameStartAt,
        bossSpawnDelayMs = DEFAULTS.spawnDelayMs,
        getRandomSpawnAroundPlayer
    }) {
        let bossSpawned = false;
        let bossDefeated = false;

        function spawnBossNearPlayer() {
            const spawn = getRandomSpawnAroundPlayer(playerController.player);
            enemyControllers.push(createBossController(canvas, ctx, cameraController.camera, spawn.x, spawn.y));
        }

        function update(now) {
            if (!bossSpawned && !bossDefeated && now - gameStartAt >= bossSpawnDelayMs) {
                spawnBossNearPlayer();
                bossSpawned = true;

                for (let i = enemyControllers.length - 1; i >= 0; i--) {
                    if (enemyControllers[i].enemy.isBoss) continue;
                    enemyControllers.splice(i, 1);
                }
            }
        }

        function handleEnemyDeath(enemy) {
            if (!enemy.isBoss) return;
            bossSpawned = false;
            bossDefeated = true;
        }

        function canSpawnRegularEnemies() {
            return !bossSpawned && !bossDefeated;
        }

        return {
            update,
            handleEnemyDeath,
            canSpawnRegularEnemies
        };
    }

    return {
        DEFAULTS,
        createBossController,
        createBossManager
    };
})();
