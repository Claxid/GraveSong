function createPlayerController(canvas, ctx, camera) {
    const sprite = new Image();
    sprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Walk.png";

    const attackSprite = new Image();
    attackSprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier(Split Effects)/Soldier-Attack01_Effect.png";
    let attackEffectFrames = 6;
    attackSprite.addEventListener("load", () => {
        attackEffectFrames = Math.max(1, Math.floor(attackSprite.width / 100));
    });

    const attacks = [];
    let lastAttackTime = 0;
    const ATTACK_COOLDOWN = 2000;
    const ATTACK_DAMAGE = 10;
    const ATTACK_ANIM_SPEED = 4;
    const ATTACK_SIZE_MULTIPLIER = 3;
    const ATTACK_RANGE = 220;
    const ATTACK_HALF_ANGLE = Math.PI / 3;

    function normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    const keys = {};
    document.addEventListener("keydown", (e) => {
        keys[e.key] = true;
    });
    document.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        console.log(x, y);
    });

    const player = {
        spawnX: 1774,
        spawnY: 2200,
        x: 1774,
        y: 2200,
        speed: 1.5,
        frameX: 0,
        frameY: 0,
        frameSize: 100,
        maxFrames: 8,
        animCounter: 0,
        animSpeed: 10,
        scale: 2,
        hp : 100,
        maxHp : 100,
        exp : 0,
        maxExp : 100,
        level : 1,
        hitW: 40,
        hitH: 60
    };

    let facingLeft = false;

    sprite.addEventListener("load", () => {
        // Adapt to the actual number of frames in the loaded walk sprite sheet.
        player.maxFrames = Math.max(1, Math.floor(sprite.width / player.frameSize));
    });

    function update(enemies = []) {
        let moving = false;

        if (keys["z"]) {
            player.y -= player.speed;
            player.frameY = 0;
            moving = true;
        }
        if (keys["s"]) {
            player.y += player.speed;
            player.frameY = 0;
            moving = true;
        }
        if (keys["q"]) {
            player.x -= player.speed;
            player.frameY = 0;
            facingLeft = true;
            moving = true;
        }
        if (keys["d"]) {
            player.x += player.speed;
            player.frameY = 0;
            facingLeft = false;
            moving = true;
        }

        if (moving) {
            player.animCounter++;
            if (player.animCounter >= player.animSpeed) {
                player.animCounter = 0;
                player.frameX = (player.frameX + 1) % player.maxFrames;
            }
        } else {
            player.frameX = 0;
        }

        // Auto-attack : toutes les 2s vers l'ennemi le plus proche
        const now = performance.now();
        if (now - lastAttackTime >= ATTACK_COOLDOWN && enemies.length > 0) {
            let nearest = null;
            let nearestDist = Infinity;
            for (const e of enemies) {
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = e;
                }
            }
            if (nearest) {
                const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
                attacks.push({
                    x: player.x,
                    y: player.y,
                    angle,
                    frameX: 0,
                    animCounter: 0,
                    hitApplied: false
                });
                lastAttackTime = now;
            }
        }

        // Avancer l'animation des effets d'attaque
        for (let i = attacks.length - 1; i >= 0; i--) {
            const atk = attacks[i];
            atk.animCounter++;
            if (atk.animCounter >= ATTACK_ANIM_SPEED) {
                atk.animCounter = 0;
                atk.frameX++;
            }

            if (!atk.hitApplied) {
                for (const enemy of enemies) {
                    if (enemy.hp <= 0) continue;

                    const dx = enemy.x - atk.x;
                    const dy = enemy.y - atk.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > ATTACK_RANGE) continue;

                    const enemyAngle = Math.atan2(dy, dx);
                    const delta = Math.abs(normalizeAngle(enemyAngle - atk.angle));
                    if (delta > ATTACK_HALF_ANGLE) continue;

                    enemy.hp = Math.max(0, enemy.hp - ATTACK_DAMAGE);
                }
                atk.hitApplied = true;
            }

            if (atk.frameX >= attackEffectFrames) {
                attacks.splice(i, 1);
            }
        }
    }

    function draw() {
        const size = player.frameSize * player.scale * camera.zoom;
        const drawX = (player.x - camera.x) * camera.zoom - size / 2;
        const drawY = (player.y - camera.y) * camera.zoom - size / 2;

        if (facingLeft) {
            ctx.save();
            ctx.translate(drawX + size, drawY);
            ctx.scale(-1, 1);

            ctx.drawImage(
                sprite,
                player.frameX * player.frameSize,
                player.frameY * player.frameSize,
                player.frameSize,
                player.frameSize,
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
            player.frameX * player.frameSize,
            player.frameY * player.frameSize,
            player.frameSize,
            player.frameSize,
            drawX,
            drawY,
            size,
            size
        );
    }

    function drawAttacks() {
        const frameSize = 100;
        const size = frameSize * player.scale * ATTACK_SIZE_MULTIPLIER * camera.zoom;
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
    }

    return {
        player,
        update,
        draw,
        drawAttacks
    };
}
