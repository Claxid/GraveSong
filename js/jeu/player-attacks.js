// Système d'attaques du joueur
// Gestion des attaques automatiques et de la hache

function createPlayerAttacks(player, camera) {
    const attackSprite = new Image();
    attackSprite.src = "../../assets/sprites/Characters(100x100)/Soldier/Soldier(Split Effects)/Soldier-Attack01_Effect.png";
    let attackEffectFrames = 6;
    attackSprite.addEventListener("load", () => {
        attackEffectFrames = Math.max(1, Math.floor(attackSprite.width / 100));
    });

    const axeSprite = new Image();
    axeSprite.src = "../../assets/sprites/Arrow(Projectile)/Arrow01(100x100).png";

    const attacks = [];
    let lastAttackTime = 0;

    const BASE_ATTACK_STATS = {
        cooldown: 2000,
        damage: 10,
        animSpeed: 4,
        sizeMultiplier: 3,
        range: 220,
        halfAngle: Math.PI / 3,
        Axe: 0
    };
    const attackStats = { ...BASE_ATTACK_STATS };

    const axeState = {
        active: false,
        count: 0,
        angle: 0,
        spinAngle: 0,
        spinSpeed: 0.10,
        radius: 72,
        angularSpeed: 0.045,
        damageMultiplier: 1.35,
        hitCooldown: 220,
        size: 60,
        lastHitByEnemy: new Map()
    };

    function normalizeAngle(angle) {
        while (angle <= -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        return angle;
    }

    function syncDerivedAttackVisualStats() {
        const rangeRatio = attackStats.range / BASE_ATTACK_STATS.range;
        const angleRatio = attackStats.halfAngle / BASE_ATTACK_STATS.halfAngle;
        const cooldownRatio = BASE_ATTACK_STATS.cooldown / attackStats.cooldown;

        attackStats.sizeMultiplier = Number(
            Math.max(1.8, Math.min(8, BASE_ATTACK_STATS.sizeMultiplier * rangeRatio * Math.sqrt(angleRatio))).toFixed(2)
        );

        attackStats.animSpeed = Math.max(
            1,
            Math.round(BASE_ATTACK_STATS.animSpeed / Math.sqrt(cooldownRatio))
        );
    }

    function updateAttacks(enemies) {
        const now = performance.now();

        // Attaque automatique
        if (now - lastAttackTime >= attackStats.cooldown) {
            const attackAngle = Math.random() * Math.PI * 2;
            attacks.push({
                x: player.x,
                y: player.y,
                angle: attackAngle,
                frameX: 0,
                animCounter: 0,
                hitApplied: false
            });
            lastAttackTime = now;
        }

        // Update des attaques existantes
        for (let i = attacks.length - 1; i >= 0; i--) {
            const atk = attacks[i];
            atk.animCounter++;
            if (atk.animCounter >= attackStats.animSpeed) {
                atk.animCounter = 0;
                atk.frameX++;
            }

            if (!atk.hitApplied) {
                for (const enemy of enemies) {
                    if (!enemy || enemy.hp <= 0) continue;
                    const dx = enemy.x - atk.x;
                    const dy = enemy.y - atk.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > attackStats.range) continue;
                    const enemyAngle = Math.atan2(dy, dx);
                    const delta = Math.abs(normalizeAngle(enemyAngle - atk.angle));
                    if (delta > attackStats.halfAngle) continue;
                    enemy.hp = Math.max(0, enemy.hp - attackStats.damage);
                }
                atk.hitApplied = true;
            }

            if (atk.frameX >= attackEffectFrames) {
                attacks.splice(i, 1);
            }
        }

        // Update de la hache
        if (axeState.active) {
            axeState.angle = normalizeAngle(axeState.angle + axeState.angularSpeed);

            const axeX = player.x + Math.cos(axeState.angle) * axeState.radius;
            const axeY = player.y + Math.sin(axeState.angle) * axeState.radius;
            const axeHitRadius = 42;
            const axeDamage = Math.max(1, attackStats.damage * axeState.damageMultiplier);

            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                if (!enemy || enemy.hp <= 0) continue;

                const dx = enemy.x - axeX;
                const dy = enemy.y - axeY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > axeHitRadius) continue;

                const enemyId = enemy.id ?? i;
                const lastHitTime = axeState.lastHitByEnemy.get(enemyId) ?? 0;
                if (now - lastHitTime < axeState.hitCooldown) continue;

                enemy.hp = Math.max(0, enemy.hp - axeDamage);
                axeState.lastHitByEnemy.set(enemyId, now);
            }
        }
    }

    function drawAttacks() {
        const frameSize = 100;
        const size = frameSize * player.scale * attackStats.sizeMultiplier * camera.zoom;
        for (const atk of attacks) {
            const screenX = (atk.x - camera.x) * camera.zoom;
            const screenY = (atk.y - camera.y) * camera.zoom;
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(atk.angle);
            ctx.drawImage(
                attackSprite,
                atk.frameX * frameSize, 0, frameSize, frameSize,
                -size / 2, -size / 2, size, size
            );
            ctx.restore();
        }

        if (axeState.active) {
            const axeX = (player.x + Math.cos(axeState.angle) * axeState.radius - camera.x) * camera.zoom;
            const axeY = (player.y + Math.sin(axeState.angle) * axeState.radius - camera.y) * camera.zoom;
            const axeSize = axeState.size * camera.zoom;

            ctx.save();
            ctx.translate(axeX, axeY);
            ctx.rotate(axeState.angle + Math.PI / 2);
            if (axeSprite.complete && axeSprite.naturalWidth > 0) {
                ctx.drawImage(axeSprite, -axeSize / 2, -axeSize / 2, axeSize, axeSize);
            } else {
                ctx.fillStyle = "#d8d8d8";
                ctx.beginPath();
                ctx.arc(0, 0, axeSize * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    return {
        updateAttacks,
        drawAttacks,
        attackStats,
        axeState,
        syncDerivedAttackVisualStats,
        getAttackStats: () => ({ ...attackStats })
    };
}