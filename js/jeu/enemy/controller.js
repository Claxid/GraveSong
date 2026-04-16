window.createEnemyController = function createEnemyController(canvas, ctx, camera, startX = 800, startY = 800, enemyType = "gobelin") {
    const enemyConfig = (window.ENEMY_TYPE_CONFIGS && window.ENEMY_TYPE_CONFIGS[enemyType]) || window.ENEMY_TYPE_CONFIGS.gobelin;
    const walkSprite = new Image();
    const attackSprites = [];

    if (Array.isArray(enemyConfig.attackSequenceSprites) && enemyConfig.attackSequenceSprites.length > 0) {
        for (const src of enemyConfig.attackSequenceSprites) {
            const image = new Image();
            image.src = src;
            attackSprites.push(image);
        }
    } else {
        const attackSprite = new Image();
        attackSprite.src = enemyConfig.attackSpriteSrc || enemyConfig.spriteSrc;
        attackSprites.push(attackSprite);

        if (enemyConfig.attackSpriteSrc2) {
            const attackSprite2 = new Image();
            attackSprite2.src = enemyConfig.attackSpriteSrc2;
            attackSprites.push(attackSprite2);
        }
    }

    const enemy = {
        type: enemyType,
        spawnX: startX,
        spawnY: startY,
        x: startX,
        y: startY,
        facingX: -1,
        speed: enemyConfig.speed,
        state: "walk",
        attackPhase: 0,
        attackFrameX: 0,
        frameX: 0,
        frameY: 0,
        frameSize: enemyConfig.frameSize,
        walkFrames: enemyConfig.walkFrames || enemyConfig.maxFrames || 6,
        attackFrames: Math.max(1, attackSprites.length),
        animCounter: 0,
        walkAnimSpeed: enemyConfig.walkAnimSpeed || enemyConfig.animSpeed || 12,
        attackAnimSpeed: enemyConfig.attackAnimSpeed || enemyConfig.animSpeed || 12,
        scale: enemyConfig.scale,
        hp: enemyConfig.hp,
        maxhp: enemyConfig.maxhp,
        baseHitW: enemyConfig.hitW,
        baseHitH: enemyConfig.hitH,
        attackHitW: enemyConfig.attackHitW || enemyConfig.hitW,
        attackHitH: enemyConfig.attackHitH || enemyConfig.hitH,
        hitW: enemyConfig.hitW,
        hitH: enemyConfig.hitH,
        attackRange: enemyConfig.attackRange || Math.max(enemyConfig.hitW, enemyConfig.hitH) * 1.5,
        minDistancePadding: enemyConfig.minDistancePadding || 8,
        attackCooldownMs: enemyConfig.attackCooldownMs || 450,
        nextAttackAllowedAt: 0,
        flipWhenFacingRight: Boolean(enemyConfig.flipWhenFacingRight),
        freezeMovementDuringAttack: Boolean(enemyConfig.freezeMovementDuringAttack),
        contactDamage: enemyConfig.contactDamage || 5
    };

    const animations = {
        walk: {
            sprite: walkSprite,
            maxFrames: enemy.walkFrames,
            animSpeed: enemy.walkAnimSpeed
        }
    };

    function getCurrentAnimation() {
        if (enemy.state === "attack") {
            const attackSprite = attackSprites[enemy.attackPhase] || attackSprites[0] || walkSprite;
            const attackMaxFrames = Math.max(1, attackSprite.__frameCount || 1);
            return {
                sprite: attackSprite,
                maxFrames: attackMaxFrames,
                animSpeed: enemy.attackAnimSpeed
            };
        }
        return animations.walk;
    }

    function applyStateHitbox(state) {
        if (state === "attack") {
            enemy.hitW = enemy.attackHitW;
            enemy.hitH = enemy.attackHitH;
            return;
        }

        enemy.hitW = enemy.baseHitW;
        enemy.hitH = enemy.baseHitH;
    }

    function updateAnimationFrameCount(sprite) {
        if (!sprite || !sprite.complete || sprite.naturalWidth <= 0 || enemy.frameSize <= 0) return;
        const computedFrames = Math.floor(sprite.naturalWidth / enemy.frameSize);
        if (computedFrames > 0) {
            sprite.__frameCount = computedFrames;
        } else {
            sprite.__frameCount = 1;
        }
    }

    walkSprite.addEventListener("load", () => updateAnimationFrameCount(walkSprite));
    for (const attackSprite of attackSprites) {
        attackSprite.addEventListener("load", () => updateAnimationFrameCount(attackSprite));
    }
    walkSprite.src = enemyConfig.spriteSrc;
    applyStateHitbox("walk");

    function update(player) {
        if (enemy.hp <= 0) return;
        const now = performance.now();
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (Math.abs(dx) > 0.25) {
            enemy.facingX = dx > 0 ? 1 : -1;
        }

        const playerRadius = Math.max(Number(player.hitW) || 24, Number(player.hitH) || 35) / 2;
        const enemyRadius = Math.max(Number(enemy.hitW) || 30, Number(enemy.hitH) || 30) / 2;
        const minDistanceFromPlayer = playerRadius + enemyRadius + enemy.minDistancePadding;
        const wantsAttack = distance <= enemy.attackRange;
        const isAttackLocked = enemy.freezeMovementDuringAttack && (enemy.state === "attack" || wantsAttack);

        if (!isAttackLocked && distance > minDistanceFromPlayer && distance > 0.0001) {
            const maxForwardStep = Math.min(enemy.speed, distance - minDistanceFromPlayer);
            enemy.x += (dx / distance) * maxForwardStep;
            enemy.y += (dy / distance) * maxForwardStep;
        } else if (!isAttackLocked && distance > 0.0001 && distance < minDistanceFromPlayer) {
            const overlap = minDistanceFromPlayer - distance;
            const pushBackStep = Math.min(overlap, enemy.speed);
            enemy.x -= (dx / distance) * pushBackStep;
            enemy.y -= (dy / distance) * pushBackStep;
        } else if (!isAttackLocked && distance <= 0.0001) {
            enemy.x += enemy.minDistancePadding;
        }

        const canStartAttack = now >= enemy.nextAttackAllowedAt;
        if (wantsAttack && enemy.state !== "attack" && canStartAttack) {
            enemy.state = "attack";
            enemy.attackPhase = 0;
            enemy.frameX = 0;
            enemy.attackFrameX = 0;
            enemy.animCounter = 0;
            applyStateHitbox("attack");
        } else if (enemy.state !== "attack") {
            enemy.state = "walk";
            applyStateHitbox("walk");
        }

        const currentAnimation = getCurrentAnimation();
        enemy.animCounter++;

        if (enemy.animCounter >= currentAnimation.animSpeed) {
            enemy.animCounter = 0;
            if (enemy.state === "attack") {
                enemy.attackFrameX += 1;
                if (enemy.attackFrameX >= currentAnimation.maxFrames) {
                    enemy.attackFrameX = 0;
                    if (enemy.attackPhase < attackSprites.length - 1) {
                        enemy.attackPhase += 1;
                    } else {
                        enemy.attackPhase = 0;
                        enemy.state = "walk";
                        applyStateHitbox("walk");
                        enemy.nextAttackAllowedAt = now + enemy.attackCooldownMs;
                        enemy.animCounter = 0;
                    }
                }
            } else {
                const maxFrames = Math.max(1, currentAnimation.maxFrames || 1);
                enemy.frameX = (enemy.frameX + 1) % maxFrames;
                if (enemy.frameX === 0) {
                    enemy.state = "walk";
                }
            }
        }
    }

    function draw() {
        const currentAnimation = getCurrentAnimation();
        const sprite = currentAnimation.sprite;
        const size = enemy.frameSize * enemy.scale * camera.zoom;
        const drawX = (enemy.x - camera.x) * camera.zoom - size / 2;
        const drawY = (enemy.y - camera.y) * camera.zoom - size / 2;
        const frameX = enemy.state === "attack" ? enemy.attackFrameX : enemy.frameX;

        const shouldFlipSprite = enemy.flipWhenFacingRight ? enemy.facingX > 0 : enemy.facingX < 0;

        if (shouldFlipSprite) {
            ctx.save();
            ctx.translate(drawX + size, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(
                sprite,
                frameX * enemy.frameSize,
                enemy.frameY * enemy.frameSize,
                enemy.frameSize,
                enemy.frameSize,
                0,
                0,
                size,
                size
            );
            ctx.restore();
            return;
        }

        ctx.drawImage(
            sprite,
            frameX * enemy.frameSize,
            enemy.frameY * enemy.frameSize,
            enemy.frameSize,
            enemy.frameSize,
            drawX,
            drawY,
            size,
            size
        );
    }

    return { enemy, update, draw };
};
