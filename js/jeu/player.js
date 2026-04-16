// Controleur du joueur
// Deplacement ZQSD avec collisions, auto-attaque et systeme de perks.

function createPlayerController(canvas, ctx, camera, worldBounds = null) {
    const sprite = new Image();
    sprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Walk.png";

    const HURT_DURATION_MS = 250;
    const hurtSprite = new Image();
    hurtSprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier with shadows/Soldier-Hurt.png";
    let hurtFrames = 1;
    let hurtUntil = 0;
    hurtSprite.addEventListener("load", () => {
        hurtFrames = Math.max(1, Math.floor(hurtSprite.width / player.frameSize));
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
        speed: 1.5,
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
        hitW: 24,
        hitH: 35
    };

    let facingLeft = false;

    sprite.addEventListener("load", () => {
        player.maxFrames = Math.max(1, Math.floor(sprite.width / player.frameSize));
    });

    const BASE_ATTACK_STATS = {
        cooldown: 2000,
        damage: 10,
        animSpeed: 4,
        sizeMultiplier: 3,
        range: 220,
        halfAngle: Math.PI / 3,
        Axe: 0,
        Fireball: 0
    };
    const attackStats = { ...BASE_ATTACK_STATS };

    function normalizeAngle(angle) {
        while (angle <= -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        return angle;
    }

    if (!window.PlayerSystems || typeof window.PlayerSystems.createPlayerPerkSystem !== "function" || typeof window.PlayerSystems.createPlayerMeleeAttackSystem !== "function") {
        throw new Error("Player modules are missing. Ensure player-perks.js and melee-attack.js are loaded before player.js.");
    }

    if (!window.PlayerSpells || typeof window.PlayerSpells.createAxeSpell !== "function" || typeof window.PlayerSpells.createFireballSpell !== "function") {
        throw new Error("Spell modules are missing. Ensure axe-spell.js and fireball-spell.js are loaded before player.js.");
    }

    const axeSpell = window.PlayerSpells.createAxeSpell({
        ctx,
        camera,
        player,
        attackStats,
        normalizeAngle
    });
    const fireballSpell = window.PlayerSpells.createFireballSpell({
        ctx,
        camera,
        player,
        attackStats
    });

    const fireballState = fireballSpell.state;
    axeSpell.setCount(attackStats.Axe);
    fireballSpell.setCount(attackStats.Fireball);

    const meleeAttackSystem = window.PlayerSystems.createPlayerMeleeAttackSystem({
        ctx,
        camera,
        player,
        attackStats,
        normalizeAngle
    });
   
   
   
   
   
   
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

    const perkSystem = window.PlayerSystems.createPlayerPerkSystem({
        player,
        attackStats,
        fireballState,
        onAfterPerkApplied: () => {
            axeSpell.setCount(attackStats.Axe);
            fireballSpell.setCount(attackStats.Fireball);
            syncDerivedAttackVisualStats();
        }
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

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clampToWorldBounds(nextX, nextY) {
        if (!worldBounds || !Number.isFinite(worldBounds.width) || !Number.isFinite(worldBounds.height)) {
            return { x: nextX, y: nextY };
        }

        const minX = player.hitW / 2;
        const maxX = worldBounds.width - player.hitW / 2;
        const minY = player.hitH / 2;
        const maxY = worldBounds.height - player.hitH / 2;

        return {
            x: clamp(nextX, minX, maxX),
            y: clamp(nextY, minY, maxY)
        };
    }

    function update(enemies = []) {
        let moving = false;
        let moveX = 0;
        let moveY = 0;

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
            facingLeft = true;
            moving = true;
        }
        if (keys["d"] || keys["keyd"] || keys["arrowright"]) {
            moveX += player.speed;
            player.frameY = 0;
            facingLeft = false;
            moving = true;
        }

        const nextX = player.x + moveX;
        const nextY = player.y + moveY;
        const boundedNext = clampToWorldBounds(nextX, nextY);

        if (!collidesAt(boundedNext.x, player.y)) {
            player.x = boundedNext.x;
        }
        if (!collidesAt(player.x, boundedNext.y)) {
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

        const now = performance.now();
        meleeAttackSystem.update(enemies, now);

        axeSpell.update(enemies, now);
        fireballSpell.update(enemies, now);
    }

    function draw() {
        const size = player.frameSize * player.scale * camera.zoom;
        const drawX = (player.x - camera.x) * camera.zoom - size / 2;
        const drawY = (player.y - camera.y) * camera.zoom - size / 2;
        const hurtActive = performance.now() < hurtUntil && hurtSprite.complete && hurtSprite.naturalWidth > 0;
        const activeSprite = hurtActive ? hurtSprite : sprite;
        const activeMaxFrames = hurtActive ? hurtFrames : player.maxFrames;
        const activeFrameX = Math.min(player.frameX, activeMaxFrames - 1);
        const activeFrameY = hurtActive ? 0 : player.frameY;

        // Draw once for both directions, then optionally apply a red damage tint.
        const drawCharacter = () => {
            ctx.drawImage(
                activeSprite,
                activeFrameX * player.frameSize,
                activeFrameY * player.frameSize,
                player.frameSize,
                player.frameSize,
                0,
                0,
                size,
                size
            );
        };

        if (facingLeft) {
            ctx.save();
            ctx.translate(drawX + size, drawY);
            ctx.scale(-1, 1);
            drawCharacter();
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.translate(drawX, drawY);
        drawCharacter();
        ctx.restore();
    }

    function drawAttacks() {
        meleeAttackSystem.draw();
        axeSpell.draw();
        fireballSpell.draw();
    }

    function triggerHurt() {
        hurtUntil = performance.now() + HURT_DURATION_MS;
    }

    return {
        player,
        update,
        draw,
        drawAttacks,
        queuePerkChoices: perkSystem.queuePerkChoices,
        getCurrentPerkChoices: perkSystem.getCurrentPerkChoices,
        hasPendingPerks: perkSystem.hasPendingPerks,
        applyPerkByIndex: perkSystem.applyPerkByIndex,
        triggerHurt,
        getAttackStats: () => ({ ...attackStats })
    };
}
