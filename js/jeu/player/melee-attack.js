// Base melee auto-attack system for the player controller.
(function initPlayerMeleeAttackSystem(globalScope) {
    const root = globalScope;
    root.PlayerSystems = root.PlayerSystems || {};

    root.PlayerSystems.createPlayerMeleeAttackSystem = function createPlayerMeleeAttackSystem({
        ctx,
        camera,
        player,
        attackStats,
        normalizeAngle,
        applyEnemyDamage
    }) {
        const attacks = [];
        let lastAttackTime = 0;

        const attackSprite = new Image();
        attackSprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier(Split Effects)/Soldier-Attack01_Effect.png";

        let attackEffectFrames = 6;
        attackSprite.addEventListener("load", () => {
            attackEffectFrames = Math.max(1, Math.floor(attackSprite.width / 100));
        });

        function update(enemies, now) {
            if (now - lastAttackTime >= attackStats.cooldown && enemies.length > 0) {
                let nearest = null;
                let nearestDist = Infinity;

                for (const enemy of enemies) {
                    if (!enemy || enemy.hp <= 0) continue;
                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearest = enemy;
                    }
                }

                if (nearest) {
                    const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
                    attacks.push({ x: player.x, y: player.y, angle, frameX: 0, animCounter: 0, hitApplied: false });
                    lastAttackTime = now;
                }
            }

            for (let i = attacks.length - 1; i >= 0; i--) {
                const attack = attacks[i];
                attack.animCounter++;
                if (attack.animCounter >= attackStats.animSpeed) {
                    attack.animCounter = 0;
                    attack.frameX++;
                }

                if (!attack.hitApplied) {
                    for (const enemy of enemies) {
                        if (!enemy || enemy.hp <= 0) continue;

                        const dx = enemy.x - attack.x;
                        const dy = enemy.y - attack.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance > attackStats.range) continue;

                        const enemyAngle = Math.atan2(dy, dx);
                        const delta = Math.abs(normalizeAngle(enemyAngle - attack.angle));
                        if (delta > attackStats.halfAngle) continue;

                        if (typeof applyEnemyDamage === "function") {
                            applyEnemyDamage(enemy, attackStats.damage, "Epee");
                        } else {
                            enemy.hp = Math.max(0, enemy.hp - attackStats.damage);
                        }
                    }
                    attack.hitApplied = true;
                }

                if (attack.frameX >= attackEffectFrames) {
                    attacks.splice(i, 1);
                }
            }
        }

        function draw() {
            const frameSize = 100;
            const size = frameSize * player.scale * attackStats.sizeMultiplier * camera.zoom;

            for (const attack of attacks) {
                const screenX = (attack.x - camera.x) * camera.zoom;
                const screenY = (attack.y - camera.y) * camera.zoom;
                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(attack.angle);
                ctx.drawImage(
                    attackSprite,
                    attack.frameX * frameSize,
                    0,
                    frameSize,
                    frameSize,
                    -size / 2,
                    -size / 2,
                    size,
                    size
                );
                ctx.restore();
            }
        }

        return {
            update,
            draw
        };
    };
})(window);
