// Contrôleur principal du joueur
// Gestion du mouvement, collisions et rendu de base

function createPlayerMovementController(canvas, ctx, camera) {
    const sprite = new Image();
    sprite.src = "../../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Walk.png";

    const hurtSprite = new Image();
    hurtSprite.src = "../../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Hurt.png";
    let hurtFrames = 1;
    let hurtUntil = 0;
    const HURT_DURATION_MS = 300;

    hurtSprite.addEventListener("load", () => {
        hurtFrames = Math.max(1, Math.floor(hurtSprite.width / 100));
    });

    const keys = {};

    function setKeyState(e, pressed) {
        const key = String(e.key || "").toLowerCase();
        const code = String(e.code || "").toLowerCase();

        keys[key] = pressed;
        keys[code] = pressed;

        if (key === "z" || key === "q" || key === "s" || key === "d" ||
            key === "arrowup" || key === "arrowleft" || key === "arrowdown" || key === "arrowright" ||
            code === "keyz" || code === "keyq" || code === "keys" || code === "keyd" ||
            code === "arrowup" || code === "arrowleft" || code === "arrowdown" || code === "arrowright") {
            e.preventDefault();
        }
    }

    window.addEventListener("keydown", (e) => { setKeyState(e, true); });
    window.addEventListener("keyup", (e) => { setKeyState(e, false); });

    const player = {
        spawnX: 1774,
        spawnY: 2200,
        x: 1774,
        y: 2200,
        speed: 6,
        frameX: 0,
        frameY: 0,
        frameSize: 100,
        maxFrames: 8,
        animCounter: 0,
        animSpeed: 10,
        scale: 2,
        hp: 100,
        maxHp: 100,
        exp: 0,
        maxExp: 100,
        level: 1,
        hitW: 40,
        hitH: 60
    };

    let facingLeft = false;

    sprite.addEventListener("load", () => {
        player.maxFrames = Math.max(1, Math.floor(sprite.width / player.frameSize));
    });

    function collidesAt(x, y) {
        if (!Array.isArray(window.obstacles) || typeof window.rectCollision !== "function") return false;
        const hitX = x - player.hitW / 2;
        const hitY = y - player.hitH / 2;
        for (const o of window.obstacles) {
            if (window.rectCollision(hitX, hitY, player.hitW, player.hitH, o.x, o.y, o.w, o.h)) {
                return true;
            }
        }
        return false;
    }

    function update(enemies = []) {
        let moving = false;
        let moveX = 0;
        let moveY = 0;

        if (keys["z"]) {
            moveY -= player.speed;
            player.frameY = 0;
            moving = true;
        }
        if (keys["s"]) {
            moveY += player.speed;
            player.frameY = 0;
            moving = true;
        }
        if (keys["q"]) {
            moveX -= player.speed;
            player.frameY = 0;
            facingLeft = true;
            moving = true;
        }
        if (keys["d"]) {
            moveX += player.speed;
            player.frameY = 0;
            facingLeft = false;
            moving = true;
        }

        // Animation
        if (moving) {
            player.animCounter++;
            if (player.animCounter >= player.animSpeed) {
                player.animCounter = 0;
                player.frameX = (player.frameX + 1) % player.maxFrames;
            }
        } else {
            player.frameX = 0;
        }

        // Mouvement avec collisions
        if (moveX !== 0) {
            const newX = player.x + moveX;
            if (!collidesAt(newX, player.y)) {
                player.x = newX;
            }
        }
        if (moveY !== 0) {
            const newY = player.y + moveY;
            if (!collidesAt(player.x, newY)) {
                player.y = newY;
            }
        }
    }

    function draw() {
        const size = player.frameSize * player.scale * camera.zoom;
        const drawX = (player.x - camera.x) * camera.zoom - size / 2;
        const drawY = (player.y - camera.y) * camera.zoom - size / 2;
        const hurtActive = performance.now() < hurtUntil && hurtSprite.complete && hurtSprite.naturalWidth > 0;
        const activeSprite = hurtActive ? hurtSprite : sprite;
        const activeMaxFrames = hurtActive ? hurtFrames : player.maxFrames;
        const activeFrameX = Math.min(player.frameX, activeMaxFrames - 1);

        if (facingLeft) {
            ctx.save();
            ctx.translate(drawX + size, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(
                activeSprite,
                activeFrameX * player.frameSize,
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
            activeSprite,
            activeFrameX * player.frameSize,
            player.frameY * player.frameSize,
            player.frameSize,
            player.frameSize,
            drawX,
            drawY,
            size,
            size
        );
    }

    function triggerHurt() {
        hurtUntil = performance.now() + HURT_DURATION_MS;
    }

    return {
        player,
        update,
        draw,
        triggerHurt
    };
}