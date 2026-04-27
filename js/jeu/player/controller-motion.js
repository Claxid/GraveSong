window.GamePlayerMotion = (() => {
    function createInputState() {
        return {
            keys: Object.create(null),
            facingLeft: false
        };
    }

    function setKeyState(input, e, pressed) {
        const key = String(e.key || "").toLowerCase();
        const code = String(e.code || "").toLowerCase();

        input.keys[key] = pressed;
        input.keys[code] = pressed;

        if (
            key === "z" || key === "q" || key === "s" || key === "d" ||
            key === "arrowup" || key === "arrowleft" || key === "arrowdown" || key === "arrowright" ||
            code === "keyz" || code === "keyq" || code === "keys" || code === "keyd" ||
            code === "arrowup" || code === "arrowleft" || code === "arrowdown" || code === "arrowright"
        ) {
            e.preventDefault();
        }
    }

    function collidesAt(player, x, y) {
        if (!Array.isArray(window.obstacles) || typeof window.rectCollision !== "function") return false;
        const hitX = x - player.hitW / 2;
        const hitY = y - player.hitH / 2;
        for (const obstacle of window.obstacles) {
            if (window.rectCollision(hitX, hitY, player.hitW, player.hitH, obstacle.x, obstacle.y, obstacle.w, obstacle.h)) {
                return true;
            }
        }
        return false;
    }

    function clampToWorldBounds(player, worldBounds, x, y) {
        if (!worldBounds || !Number.isFinite(worldBounds.width) || !Number.isFinite(worldBounds.height)) {
            return { x, y };
        }

        const halfW = player.hitW / 2;
        const halfH = player.hitH / 2;
        return {
            x: Math.max(halfW, Math.min(worldBounds.width - halfW, x)),
            y: Math.max(halfH, Math.min(worldBounds.height - halfH, y))
        };
    }

    function updateMovement({ input, player, worldBounds }) {
        let moving = false;
        let moveX = 0;
        let moveY = 0;
        const keys = input.keys;

        if (keys["z"] || keys["keyz"] || keys["arrowup"]) {
            moveY -= player.speed;
            player.frameY = 0;
            moving = true;
        }
        if (keys["s"] || keys["keys"] || keys["arrowdown"]) {
            moveY += player.speed;
            player.frameY = 0;
            moving = true;
        }
        if (keys["q"] || keys["keyq"] || keys["arrowleft"]) {
            moveX -= player.speed;
            player.frameY = 0;
            input.facingLeft = true;
            moving = true;
        }
        if (keys["d"] || keys["keyd"] || keys["arrowright"]) {
            moveX += player.speed;
            player.frameY = 0;
            input.facingLeft = false;
            moving = true;
        }

        const nextX = player.x + moveX;
        const nextY = player.y + moveY;
        const boundedNext = clampToWorldBounds(player, worldBounds, nextX, nextY);

        if (!collidesAt(player, boundedNext.x, player.y)) {
            player.x = boundedNext.x;
        }
        if (!collidesAt(player, player.x, boundedNext.y)) {
            player.y = boundedNext.y;
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
    }

    return {
        createInputState,
        setKeyState,
        updateMovement
    };
})();
