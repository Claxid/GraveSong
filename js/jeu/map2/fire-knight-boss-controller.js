window.Map2FireKnightBossController = (() => {
    function createFireKnightBoss(startX, startY, ctx, camera) {
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
            attackAnchorOffsetX: 0,
            attackAnchorOffsetY: 92,
            attackOriginX: startX,
            attackOriginY: startY + 92,
            hazardZones: [],
            phase: 1,
            phaseChangeAt: 0,
            aggressiveness: 1.0,
            isDying: false,
            deathFinished: false
        };
        boss.combat = window.Map2FireKnightBossCombat.createFireKnightBossCombat(boss, frames);

        function update(player) {
            boss.combat.update(player);
        }

        function startDeathAnimation() {
            return boss.combat.startDeathAnimation();
        }

        function isDeathAnimationFinished() {
            return boss.combat.isDeathAnimationFinished();
        }

        function draw() {
            const currentFrames = frames[boss.state];
            const sprite = currentFrames ? currentFrames[boss.frameIndex] : null;

            const size = 360 * camera.zoom;
            const centerX = (boss.x - camera.x) * camera.zoom;
            const centerY = (boss.y - camera.y) * camera.zoom;

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

                ctx.strokeStyle = hazard.color.replace("0.6", "1.0");
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
                ctx.fillStyle = "rgba(220, 100, 50, 0.8)";
                ctx.beginPath();
                ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        return { boss, update, draw, startDeathAnimation, isDeathAnimationFinished };
    }

    return {
        createFireKnightBoss
    };
})();