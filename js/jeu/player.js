// Controleur du joueur
// Deplacement ZQSD avec collisions, auto-attaque et systeme de perks.

function createPlayerController(canvas, ctx, camera) {
    const sprite = new Image();
    sprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Walk.png";

    const hurtSprite = new Image();
    hurtSprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Hurt.png";
    const HURT_DURATION_MS = 140;
    let hurtUntil = 0;
    let hurtFrames = 1;

    hurtSprite.addEventListener("load", () => {
        hurtFrames = Math.max(1, Math.floor(hurtSprite.width / 100));
    });



    const attackSprite = new Image();
    attackSprite.src = "../assets/sprites/Orc3/orc3_attack/orc3_attack_swing.png";
    let attackFrameSize = 64;
    let attackEffectFrames = 6;
    let attackHitFrame = 0;
    const attackVisualScale = 0.58;
    const swordDamageMultiplier = 2.2;
    attackSprite.addEventListener("load", () => {
        attackEffectFrames = Math.max(1, Math.floor(attackSprite.width / attackFrameSize));
        attackHitFrame = 0;
    });

    const axeSprite = new Image();
    let axeSpriteBounds = { x: 0, y: 0, w: 1, h: 1 };
    axeSprite.src = "../assets/sprites/axe.png";
    axeSprite.onload = () => {
        axeSpriteBounds = {
            x: 0,
            y: 0,
            w: axeSprite.naturalWidth,
            h: axeSprite.naturalHeight
        };

        // Recadre automatiquement la zone visible du sprite (hors transparence)
        try {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = axeSprite.naturalWidth;
            tempCanvas.height = axeSprite.naturalHeight;
            const tempCtx = tempCanvas.getContext("2d");
            if (!tempCtx) return;

            tempCtx.drawImage(axeSprite, 0, 0);
            const { data, width, height } = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

            let minX = width;
            let minY = height;
            let maxX = -1;
            let maxY = -1;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const alpha = data[(y * width + x) * 4 + 3];
                    if (alpha <= 8) continue;
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }

            if (maxX >= minX && maxY >= minY) {
                axeSpriteBounds = {
                    x: minX,
                    y: minY,
                    w: maxX - minX + 1,
                    h: maxY - minY + 1
                };
            }
        } catch (e) {
            console.warn("Axe crop bounds fallback:", e);
        }
    };
    axeSprite.onerror = () => {
        console.error("Failed to load axe sprite:", axeSprite.src);
    };

    const keys = {};
    document.addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
    document.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

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
        hitW: 31,
        hitH: 31
    };

    let facingLeft = false;

    sprite.addEventListener("load", () => {
        player.maxFrames = Math.max(1, Math.floor(sprite.width / player.frameSize));
    });

    const attacks = [];
    let lastAttackTime = 0;

    const BASE_ATTACK_STATS = {
        cooldown: 2000,
        damage: 10,
        animSpeed: 4,
        sizeMultiplier: 3,
        range: 220,
        halfAngle: Math.PI / 3,
        axeCount: 0
    };
    const attackStats = { ...BASE_ATTACK_STATS };

    const axeState = {
        active: false,
        angle: 0,
        selfAngle: 0,
        radius: 82,
        angularSpeed: 0.045,
        selfAngularSpeed: 0.04,
        damageMultiplier: 2,
        hitCooldown: 220,
        size: 58,
        pivotX: 0.72,
        pivotY: 0.5,
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

    function getSwordVisualScale() {
        const rangeRatio = attackStats.range / BASE_ATTACK_STATS.range;
        const rangeVisualBonus = 1 + (rangeRatio - 1) * 1.6;
        return attackVisualScale * Math.max(1, rangeVisualBonus);
    }

    const perkPool = [
        { id: "damage_up", name: "+25% Degats", description: "Vos attaques frappent plus fort.", apply: (s) => { s.damage = Math.round(s.damage * 1.25); } },
        { id: "cooldown_down", name: "-20% Cooldown", description: "Vous attaquez plus souvent.", apply: (s) => { s.cooldown = Math.max(250, Math.round(s.cooldown * 0.8)); } },
        { id: "range_up", name: "+20% Portee", description: "Vous touchez de plus loin.", apply: (s) => { s.range = Math.round(s.range * 1.2); } },
        { id: "arc_up", name: "+15° Angle", description: "Votre attaque couvre une zone plus large.", apply: (s) => { s.halfAngle = Math.min(Math.PI, s.halfAngle + (Math.PI / 12)); } }
    ];

    const skillPool = [
        {
            id: "Axe",
            unlockLevel: 5,
            name: "Hache",
            unlockDescription: "Debloque une hache autour du joueur.",
            upgradeName: "Hache +1",
            upgradeDescription: "Ajoute une hache supplementaire.",
            maxLevel: 5,
            isUnlocked: (s) => (s.axeCount || 0) > 0,
            canUpgrade: (s) => (s.axeCount || 0) < 5,
            unlock: (s) => { s.axeCount = 1; },
            upgrade: (s) => { s.axeCount = Math.min(5, (s.axeCount || 0) + 1); }
        }
    ];

    const pendingPerkChoices = [];

    function pickRandomPerks(count, isSkill = false, level = player.level) {
        let pool;

        if (isSkill) {
            const unlockableSkills = skillPool
                .filter((skill) => level >= skill.unlockLevel && !skill.isUnlocked(attackStats))
                .map((skill) => ({
                    id: skill.id,
                    name: skill.name,
                    description: skill.unlockDescription
                }));
            pool = unlockableSkills;
        } else {
            pool = perkPool.map((perk) => ({
                id: perk.id,
                name: perk.name,
                description: perk.description
            }));

            // Une competence deja debloquee a 15% de chance d'apparaitre dans les perks normaux.
            for (const skill of skillPool) {
                if (!skill.isUnlocked(attackStats)) continue;
                if (typeof skill.canUpgrade === "function" && !skill.canUpgrade(attackStats)) continue;
                if (Math.random() >= 0.15) continue;

                pool.push({
                    id: skill.id,
                    name: skill.upgradeName,
                    description: skill.upgradeDescription
                });
            }
        }

        if (pool.length === 0) return [];

        const shuffled = pool.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    function queuePerkChoices(levelsGained = 1, isSkill = false, startLevel = player.level) {
        let queued = 0;
        for (let i = 0; i < levelsGained; i++) {
            const level = startLevel + i;
            const choices = pickRandomPerks(3, isSkill, level);
            if (!choices.length) continue;
            pendingPerkChoices.push(choices);
            queued++;
        }
        return queued;
    }

    function getCurrentPerkChoices() {
        if (pendingPerkChoices.length === 0) return null;
        return pendingPerkChoices[0];
    }

    function hasPendingPerks() {
        return pendingPerkChoices.length > 0;
    }

    function applyPerkByIndex(idx) {
        if (!hasPendingPerks()) return null;
        const choices = pendingPerkChoices[0];
        const choice = choices[idx];
        if (!choice) return null;

        const perk = perkPool.find((p) => p.id === choice.id);
        if (perk) {
            perk.apply(attackStats);
            pendingPerkChoices.shift();
            syncDerivedAttackVisualStats();
            return choice.id;
        }

        const skill = skillPool.find((s) => s.id === choice.id);
        if (!skill) return null;

        if (skill.isUnlocked(attackStats)) {
            if (typeof skill.canUpgrade === "function" && !skill.canUpgrade(attackStats)) {
                pendingPerkChoices.shift();
                return choice.id;
            }
            skill.upgrade(attackStats);
        } else {
            skill.unlock(attackStats);
        }

        pendingPerkChoices.shift();
        syncDerivedAttackVisualStats();
        return choice.id;
    }

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

    function applyDamageAndKnockback(enemy, damage, sourceX, sourceY, knockbackStrength = 8) {
        const safeEnemyHp = Number.isFinite(enemy.hp) ? enemy.hp : (Number.isFinite(enemy.maxhp) ? enemy.maxhp : 0);
        const safeDamage = Math.max(1, Math.round(Number.isFinite(damage) ? damage : attackStats.damage));
        enemy.hp = Math.max(0, safeEnemyHp - safeDamage);

        const kx = enemy.x - sourceX;
        const ky = enemy.y - sourceY;
        const mag = Math.sqrt(kx * kx + ky * ky) || 1;
        const pushX = (kx / mag) * knockbackStrength;
        const pushY = (ky / mag) * knockbackStrength;

        enemy.x += pushX;
        enemy.y += pushY;
    }

    function update(enemies = []) {
        axeState.active = (attackStats.axeCount || 0) > 0;

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

        const nextX = player.x + moveX;
        const nextY = player.y + moveY;

        if (!collidesAt(nextX, player.y)) {
            player.x = nextX;
        }
        if (!collidesAt(player.x, nextY)) {
            player.y = nextY;
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
        const swordVisualSize = attackFrameSize * player.scale * attackStats.sizeMultiplier * getSwordVisualScale();
        const swordSpawnRange = Math.max(attackStats.range * 1.5, swordVisualSize * 1.7);
        if (now - lastAttackTime >= attackStats.cooldown && enemies.length > 0) {
            let nearest = null;
            let nearestDist = Infinity;
            for (const e of enemies) {
                if (!e || e.hp <= 0) continue;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = e;
                }
            }
            if (nearest && nearestDist <= swordSpawnRange) {
                const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
                attacks.push({ x: player.x, y: player.y, angle, frameX: 0, animCounter: 0, hitApplied: false, target: nearest });
                lastAttackTime = now;
            }
        }

        for (let i = attacks.length - 1; i >= 0; i--) {
            const atk = attacks[i];
            atk.animCounter++;
            if (atk.animCounter >= attackStats.animSpeed) {
                atk.animCounter = 0;
                atk.frameX++;
            }

            // Applique les degats quand l'animation atteint sa frame de contact.
            if (!atk.hitApplied && atk.frameX >= attackHitFrame) {
                const alreadyHit = new Set();
                const swordImpactX = atk.x + Math.cos(atk.angle) * (swordVisualSize * 0.75);
                const swordImpactY = atk.y + Math.sin(atk.angle) * (swordVisualSize * 0.75);
                const swordHitRadius = Math.max(52, swordVisualSize * 0.9);

                // Priorite a la cible verrouillee au lancement du swing (fiable sur ennemis rapides).
                if (atk.target && atk.target.hp > 0) {
                    const tdx = atk.target.x - swordImpactX;
                    const tdy = atk.target.y - swordImpactY;
                    const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
                    const targetHitRadius = Math.max(atk.target.hitW || 0, atk.target.hitH || 0) * 0.5;
                    const followThroughRange = Math.max(swordHitRadius, attackStats.range * 1.25);
                    if (tdist <= followThroughRange + targetHitRadius) {
                        applyDamageAndKnockback(atk.target, attackStats.damage * swordDamageMultiplier, swordImpactX, swordImpactY, 7);
                        alreadyHit.add(atk.target);
                    }
                }

                for (const enemy of enemies) {
                    if (!enemy || enemy.hp <= 0) continue;
                    if (alreadyHit.has(enemy)) continue;
                    const dx = enemy.x - swordImpactX;
                    const dy = enemy.y - swordImpactY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const enemyHitRadius = Math.max(enemy.hitW || 0, enemy.hitH || 0) * 0.5;
                    if (distance > swordHitRadius + enemyHitRadius) continue;
                    applyDamageAndKnockback(enemy, attackStats.damage * swordDamageMultiplier, swordImpactX, swordImpactY, 6);
                }
                atk.hitApplied = true;
            }

            if (atk.frameX >= attackEffectFrames) {
                attacks.splice(i, 1);
            }
        }

        // Gestion de la hache (en dehors de la boucle des attaques)
        if (axeState.active) {
            axeState.angle = normalizeAngle(axeState.angle + axeState.angularSpeed);
            axeState.selfAngle = normalizeAngle(axeState.selfAngle + axeState.selfAngularSpeed);
            const axeCount = Math.max(1, Math.min(5, Math.floor(attackStats.axeCount || 0)));
            const spacing = (Math.PI * 2) / axeCount;
            const axeHitRadius = Math.max(18, axeState.size * 0.45);
            const axeDamage = Math.max(1, attackStats.damage * axeState.damageMultiplier);

            for (let axeIndex = 0; axeIndex < axeCount; axeIndex++) {
                const angle = axeState.angle + spacing * axeIndex;
                const axeX = player.x + Math.cos(angle) * axeState.radius;
                const axeY = player.y + Math.sin(angle) * axeState.radius;

                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    if (!enemy || enemy.hp <= 0) continue;

                    const dx = enemy.x - axeX;
                    const dy = enemy.y - axeY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const enemyHitRadius = Math.max(enemy.hitW || 0, enemy.hitH || 0) * 0.5;
                    if (dist > axeHitRadius + enemyHitRadius) continue;

                    const enemyId = enemy.id ?? i;
                    const hitKey = `${enemyId}:${axeIndex}`;
                    const lastHitTime = axeState.lastHitByEnemy.get(hitKey) ?? 0;
                    if (now - lastHitTime < axeState.hitCooldown) continue;

                    applyDamageAndKnockback(enemy, axeDamage, axeX, axeY, 4);
                    axeState.lastHitByEnemy.set(hitKey, now);
                }
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

    function drawAttacks() {
        const frameSize = attackFrameSize;
        const size = frameSize * player.scale * attackStats.sizeMultiplier * getSwordVisualScale() * camera.zoom;
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
            const axeSize = axeState.size * camera.zoom;
            const axeCount = Math.max(1, Math.min(5, Math.floor(attackStats.axeCount || 0)));
            const spacing = (Math.PI * 2) / axeCount;

            for (let axeIndex = 0; axeIndex < axeCount; axeIndex++) {
                const angle = axeState.angle + spacing * axeIndex;
                const axeX = (player.x + Math.cos(angle) * axeState.radius - camera.x) * camera.zoom;
                const axeY = (player.y + Math.sin(angle) * axeState.radius - camera.y) * camera.zoom;

                ctx.save();
                ctx.translate(axeX, axeY);
                // Rotation orbitale + rotation sur elle-meme
                ctx.rotate(angle + axeState.selfAngle);
                if (axeSprite.complete && axeSprite.naturalWidth > 0) {
                    const srcW = axeSpriteBounds.w;
                    const srcH = axeSpriteBounds.h;
                    const scale = axeSize / Math.max(srcW, srcH);
                    const drawW = srcW * scale;
                    const drawH = srcH * scale;
                    const pivotDrawX = drawW * axeState.pivotX;
                    const pivotDrawY = drawH * axeState.pivotY;

                    ctx.drawImage(
                        axeSprite,
                        axeSpriteBounds.x,
                        axeSpriteBounds.y,
                        srcW,
                        srcH,
                        -pivotDrawX,
                        -pivotDrawY,
                        drawW,
                        drawH
                    );
                } else {
                    ctx.fillStyle = "#d8d8d8";
                    ctx.beginPath();
                    ctx.arc(0, 0, axeSize * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }
    }

    function triggerHurt() {
        hurtUntil = performance.now() + HURT_DURATION_MS;
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
        triggerHurt,
        getAttackStats: () => ({ ...attackStats })
    };
}
