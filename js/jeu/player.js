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
    // Valeurs de reference: on s'en sert pour recalculer les stats visuelles derivees.
    const BASE_ATTACK_STATS = {
        cooldown: 2000,
        damage: 10,
        animSpeed: 4,
        sizeMultiplier: 3,
        range: 220,
        halfAngle: Math.PI / 3
    };
    const attackStats = {
        cooldown: BASE_ATTACK_STATS.cooldown,
        damage: BASE_ATTACK_STATS.damage,
        animSpeed: BASE_ATTACK_STATS.animSpeed,
        sizeMultiplier: BASE_ATTACK_STATS.sizeMultiplier,
        range: BASE_ATTACK_STATS.range,
        halfAngle: BASE_ATTACK_STATS.halfAngle
    };

    // Le rendu suit la puissance reelle: portee/angle/cooldown influencent visuel et rythme.
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

    const perkPool = [
        {
            id: "damage_up",
            name: "+25% Degats",
            description: "Vos attaques frappent plus fort.",
            apply: (stats) => { stats.damage = Math.round(stats.damage * 1.25); }
        },
        {
            id: "cooldown_down",
            name: "-20% Cooldown",
            description: "Vous attaquez plus souvent.",
            apply: (stats) => { stats.cooldown = Math.max(250, Math.round(stats.cooldown * 0.8)); }
        },
        {
            id: "range_up",
            name: "+20% Portee",
            description: "Vous touchez de plus loin.",
            apply: (stats) => { stats.range = Math.round(stats.range * 1.2); }
        },
        {
            id: "arc_up",
            name: "+15° Angle",
            description: "Votre attaque couvre une zone plus large.",
            apply: (stats) => { stats.halfAngle = Math.min(Math.PI, stats.halfAngle + (Math.PI / 12)); }
        }
    ];

    const pendingPerkChoices = [];

    function pickRandomPerks(count) {
        const shuffled = perkPool.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = tmp;
        }
        return shuffled.slice(0, Math.min(count, shuffled.length)).map((perk) => ({
            id: perk.id,
            name: perk.name,
            description: perk.description
        }));
    }

    function queuePerkChoices(levelsGained = 1) {
        for (let i = 0; i < levelsGained; i++) {
            // 3 choix uniques a chaque niveau gagne.
            pendingPerkChoices.push(pickRandomPerks(3));
        }
    }

    function getCurrentPerkChoices() {
        if (pendingPerkChoices.length === 0) return null;
        return pendingPerkChoices[0];
    }

    function hasPendingPerks() {
        return pendingPerkChoices.length > 0;
    }

    function applyPerkByIndex(index) {
        const choices = getCurrentPerkChoices();
        if (!choices) return false;
        if (index < 0 || index >= choices.length) return false;

        const chosen = choices[index];
        const fullPerk = perkPool.find((perk) => perk.id === chosen.id);
        if (!fullPerk) return false;

        fullPerk.apply(attackStats);
        // Met a jour les stats visuelles dependantes apres chaque perk gameplay.
        syncDerivedAttackVisualStats();
        pendingPerkChoices.shift();
        return true;
    }

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
        if (now - lastAttackTime >= attackStats.cooldown && enemies.length > 0) {
            let nearest = null;
            let nearestDist = Infinity;
            for (const e of enemies) {
                if (e.hp <= 0) continue;
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
            if (atk.animCounter >= attackStats.animSpeed) {
                atk.animCounter = 0;
                atk.frameX++;
            }

            if (!atk.hitApplied) {
                for (const enemy of enemies) {
                    if (enemy.hp <= 0) continue;

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
    }

    return {
        player,
        update,
        draw,
        drawAttacks,
        queuePerkChoices,
        getCurrentPerkChoices,
        hasPendingPerks,
        applyPerkByIndex,
        getAttackStats: () => ({ ...attackStats })
    };
}
