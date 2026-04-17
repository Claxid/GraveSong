<<<<<<< HEAD
// Contrôleur du joueur
// Combine mouvement, attaques et perks

function createPlayerController(canvas, ctx, camera, isMap1 = false) {
    const movement = createPlayerMovementController(canvas, ctx, camera);
    const combat = createPlayerAttacks(movement.player, camera, isMap1);

    const AXE_PERK_ID = "Axe";
    const AXE_UNLOCK_LEVEL = 5;

    const perkPool = [
        { id: "damage_up", name: "+25% Degats", description: "Vos attaques frappent plus fort.", apply: (s) => { s.damage = Math.round(s.damage * 1.25); } },
        { id: "cooldown_down", name: "-20% Cooldown", description: "Vous attaquez plus souvent.", apply: (s) => { s.cooldown = Math.max(250, Math.round(s.cooldown * 0.8)); } },
        { id: "range_up", name: "+20% Portee", description: "Vous touchez de plus loin.", apply: (s) => { s.range = Math.round(s.range * 1.2); } },
        { id: "arc_up", name: "+15° Angle", description: "Votre attaque couvre une zone plus large.", apply: (s) => { s.halfAngle = Math.min(Math.PI, s.halfAngle + (Math.PI / 12)); } },
        { id: AXE_PERK_ID, name: "+1 hache", description: "Vous gagnez une puissante hache.", apply: (s) => { s.Axe = (Number(s.Axe) || 0) + 1; } }
    ];

    const pendingPerkChoices = [];

    function getAxeSpawnChance(level) {
        if (level < AXE_UNLOCK_LEVEL) return 0;
        if (level === AXE_UNLOCK_LEVEL) return 1;
        const baseChance = 0.05;
        const growthPerLevel = 0.01;
        const maxChance = 0.20;
        return Math.min(maxChance, baseChance + (level - AXE_UNLOCK_LEVEL) * growthPerLevel);
    }

    function pickRandomPerks(count, forLevel = movement.player.level) {
        const regularPerks = perkPool.filter((perk) => perk.id !== AXE_PERK_ID);
        const shuffled = regularPerks.slice();
=======
ï»¿// Player controller orchestrator.
// Movement and core stats stay here, spell logic is delegated to modules.

function createPlayerController(canvas, ctx, camera, worldBounds = null) {
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

    const keys = {};

    function setKeyState(e, pressed) {
        const key = String(e.key || "").toLowerCase();
        const code = String(e.code || "").toLowerCase();

        keys[key] = pressed;
        keys[code] = pressed;

        if (
            key === "z" || key === "q" || key === "s" || key === "d" ||
            key === "arrowup" || key === "arrowleft" || key === "arrowdown" || key === "arrowright" ||
            code === "keyz" || code === "keyq" || code === "keys" || code === "keyd" ||
            code === "arrowup" || code === "arrowleft" || code === "arrowdown" || code === "arrowright"
        ) {
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
        Fireball: 0,
        ChaosAura: 0,
        BlackHole: 0
    };
    const attackStats = { ...BASE_ATTACK_STATS };

    const AXE_PERK_ID = "Axe";
    const AXE_UNLOCK_LEVEL = 5;
    const CHAOS_AURA_UNLOCK_PERK_ID = "chaos_aura_unlock";
    const CHAOS_AURA_SIZE_PERK_ID = "chaos_aura_size_up";
    const CHAOS_AURA_DAMAGE_PERK_ID = "chaos_aura_damage_up";
    const CHAOS_AURA_COOLDOWN_PERK_ID = "chaos_aura_cooldown_down";
    const CHAOS_AURA_UNLOCK_LEVEL = 5;
    const FIREBALL_UNLOCK_PERK_ID = "fireball_unlock";
    const FIREBALL_COUNT_PERK_ID = "fireball_count_up";
    const FIREBALL_COOLDOWN_PERK_ID = "fireball_cooldown_down";
    const FIREBALL_UNLOCK_LEVEL = 6;
    const BLACK_HOLE_UNLOCK_PERK_ID = "black_hole_unlock";
    const BLACK_HOLE_COUNT_PERK_ID = "black_hole_count_up";
    const BLACK_HOLE_DAMAGE_PERK_ID = "black_hole_damage_up";
    const BLACK_HOLE_COOLDOWN_PERK_ID = "black_hole_cooldown_down";
    const BLACK_HOLE_UNLOCK_LEVEL = 5;
    const SKILL_PERK_IDS = new Set([
        AXE_PERK_ID,
        CHAOS_AURA_UNLOCK_PERK_ID,
        FIREBALL_UNLOCK_PERK_ID,
        FIREBALL_COUNT_PERK_ID,
        FIREBALL_COOLDOWN_PERK_ID,
        BLACK_HOLE_UNLOCK_PERK_ID
    ]);

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

    function isFireballUnlocked() {
        return (Number(attackStats.Fireball) || 0) > 0;
    }

    function isChaosAuraUnlocked() {
        return (Number(attackStats.ChaosAura) || 0) > 0;
    }

    function isBlackHoleUnlocked() {
        return (Number(attackStats.BlackHole) || 0) > 0;
    }

    function getAxeCount() {
        return Math.max(0, Math.min(5, Number(attackStats.Axe) || 0));
    }

    function getAxePerkCard() {
        if (getAxeCount() >= 4) {
            return {
                id: AXE_PERK_ID,
                name: "Brasier infernal",
                description: "Derniere hache: sprite enflamme et gros boost de degats."
            };
        }

        return {
            id: AXE_PERK_ID,
            name: "Hache runique",
            description: "Ajoute 1 hache orbitale."
        };
    }

    function createNoopMeleeSystem() {
        return {
            update() {},
            draw() {}
        };
    }

    function createNoopCountSpell() {
        return {
            state: { active: false, count: 0 },
            setCount() {},
            update() {},
            draw() {}
        };
    }

    function createNoopAuraSpell() {
        return {
            state: {
                active: false,
                sizeMultiplier: 1,
                damageMultiplier: 1,
                cooldownMultiplier: 1,
                devMinCooldownMs: null,
                nextPulseAt: 0
            },
            setActive() {},
            update() {},
            draw() {}
        };
    }

    function createNoopBlackHoleSpell() {
        return {
            state: {
                active: false,
                count: 0,
                cooldownMultiplier: 1,
                damageMultiplier: 1
            },
            setCount() {},
            reset() {},
            update() {},
            draw() {}
        };
    }

    const meleeAttackSystem = (
        window.PlayerSystems && typeof window.PlayerSystems.createPlayerMeleeAttackSystem === "function"
    )
        ? window.PlayerSystems.createPlayerMeleeAttackSystem({
            ctx,
            camera,
            player,
            attackStats,
            normalizeAngle
        })
        : createNoopMeleeSystem();

    const axeSpell = (
        window.PlayerSpells && typeof window.PlayerSpells.createAxeSpell === "function"
    )
        ? window.PlayerSpells.createAxeSpell({
            ctx,
            camera,
            player,
            attackStats,
            normalizeAngle
        })
        : createNoopCountSpell();

    const fireballSpell = (
        window.PlayerSpells && typeof window.PlayerSpells.createFireballSpell === "function"
    )
        ? window.PlayerSpells.createFireballSpell({
            ctx,
            camera,
            player,
            attackStats
        })
        : createNoopCountSpell();

    const chaosAuraSpell = (
        window.PlayerSpells && typeof window.PlayerSpells.createChaosAuraSpell === "function"
    )
        ? window.PlayerSpells.createChaosAuraSpell({
            ctx,
            camera,
            player
        })
        : createNoopAuraSpell();

    const blackHoleSpell = (
        window.PlayerSpells && typeof window.PlayerSpells.createBlackHoleSpell === "function"
    )
        ? window.PlayerSpells.createBlackHoleSpell({
            ctx,
            camera,
            player,
            worldBounds
        })
        : createNoopBlackHoleSpell();

    const axeState = axeSpell.state;
    const fireballState = fireballSpell.state;
    const chaosAuraState = chaosAuraSpell.state;
    const blackHoleState = blackHoleSpell.state;

    const perkPool = [
        { id: "damage_up", name: "Serment sanglant", description: "+25% degats d'attaque.", apply: ({ attackStats: s }) => { s.damage = Math.round(s.damage * 1.25); } },
        { id: "cooldown_down", name: "Ferveur noire", description: "Attaques 20% plus rapides.", apply: ({ attackStats: s }) => { s.cooldown = Math.max(250, Math.round(s.cooldown * 0.8)); } },
        { id: "range_up", name: "Lame allongee", description: "+20% de portee.", apply: ({ attackStats: s }) => { s.range = Math.round(s.range * 1.2); } },
        { id: "arc_up", name: "Croissant maudit", description: "Arc d'attaque +15 degres.", apply: ({ attackStats: s }) => { s.halfAngle = Math.min(Math.PI, s.halfAngle + (Math.PI / 12)); } },
        { id: AXE_PERK_ID, name: "Hache runique", description: "Ajoute 1 hache orbitale.", apply: ({ attackStats: s }) => { s.Axe = Math.min(5, (Number(s.Axe) || 0) + 1); } },
        { id: CHAOS_AURA_UNLOCK_PERK_ID, name: "Halo profane", description: "Debloque l'aura du chaos.", apply: ({ attackStats: s }) => { s.ChaosAura = Math.max(1, (Number(s.ChaosAura) || 0) + 1); } },
        { id: CHAOS_AURA_SIZE_PERK_ID, name: "Voile vaste", description: "Aura: +10% de rayon.", apply: ({ chaosAuraState: a }) => { a.sizeMultiplier *= 1.1; } },
        { id: CHAOS_AURA_DAMAGE_PERK_ID, name: "Brulure astrale", description: "Aura: +15% degats.", apply: ({ chaosAuraState: a }) => { a.damageMultiplier *= 1.15; } },
        { id: CHAOS_AURA_COOLDOWN_PERK_ID, name: "Pulse interdit", description: "Aura: -10% cooldown.", apply: ({ chaosAuraState: a }) => { a.cooldownMultiplier *= 0.9; } },
        { id: FIREBALL_UNLOCK_PERK_ID, name: "Braise impie", description: "Debloque les fireballs.", apply: ({ attackStats: s }) => { s.Fireball = Math.max(1, (Number(s.Fireball) || 0) + 1); } },
        { id: FIREBALL_COUNT_PERK_ID, name: "Salve ardente", description: "Ajoute 1 fireball.", apply: ({ attackStats: s }) => { s.Fireball = (Number(s.Fireball) || 0) + 1; } },
        { id: FIREBALL_COOLDOWN_PERK_ID, name: "Cendres vives", description: "Fireballs: -20% cooldown.", apply: ({ fireballState: f }) => { f.cooldown = Math.max(400, Math.round(f.cooldown * 0.8)); } },
        { id: BLACK_HOLE_UNLOCK_PERK_ID, name: "Abyme", description: "Debloque le trou noir (5 s).", apply: ({ attackStats: s }) => { s.BlackHole = Math.max(1, (Number(s.BlackHole) || 0) + 1); } },
        { id: BLACK_HOLE_COUNT_PERK_ID, name: "Faille jumelle", description: "Ajoute 1 trou noir.", apply: ({ attackStats: s }) => { s.BlackHole = (Number(s.BlackHole) || 0) + 1; } },
        { id: BLACK_HOLE_DAMAGE_PERK_ID, name: "Gueule obscure", description: "Trou noir: +15% degats.", apply: ({ blackHoleState: b }) => { b.damageMultiplier *= 1.15; } },
        { id: BLACK_HOLE_COOLDOWN_PERK_ID, name: "Flux du vide", description: "Trou noir: -10% cooldown.", apply: ({ blackHoleState: b }) => { b.cooldownMultiplier *= 0.9; } }
    ];

    const pendingPerkChoices = [];

    function pickRandomPerks(count, forLevel = player.level) {
        if (forLevel === AXE_UNLOCK_LEVEL) {
            const axePerk = getAxePerkCard();
            const chaosAuraPerk = perkPool.find((perk) => perk.id === CHAOS_AURA_UNLOCK_PERK_ID);
            const fireballPerk = perkPool.find((perk) => perk.id === FIREBALL_UNLOCK_PERK_ID);
            const blackHolePerk = perkPool.find((perk) => perk.id === BLACK_HOLE_UNLOCK_PERK_ID);
            const level5Choices = [axePerk, chaosAuraPerk, fireballPerk, blackHolePerk].filter(Boolean);

            const shuffledLevel5 = level5Choices.slice();
            for (let i = shuffledLevel5.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledLevel5[i], shuffledLevel5[j]] = [shuffledLevel5[j], shuffledLevel5[i]];
            }

            return shuffledLevel5.slice(0, Math.min(count, shuffledLevel5.length)).map((perk) => ({
                id: perk.id,
                name: perk.name,
                description: perk.description
            }));
        }

        const regularPerks = perkPool.filter((perk) => {
            if (perk.id === AXE_PERK_ID && (forLevel < AXE_UNLOCK_LEVEL || getAxeCount() >= 5)) return false;
            if (perk.id === CHAOS_AURA_UNLOCK_PERK_ID && forLevel < CHAOS_AURA_UNLOCK_LEVEL) return false;
            if (perk.id === CHAOS_AURA_UNLOCK_PERK_ID && isChaosAuraUnlocked()) return false;
            if ((perk.id === CHAOS_AURA_SIZE_PERK_ID || perk.id === CHAOS_AURA_DAMAGE_PERK_ID || perk.id === CHAOS_AURA_COOLDOWN_PERK_ID) && !isChaosAuraUnlocked()) return false;
            if (perk.id === FIREBALL_UNLOCK_PERK_ID && forLevel < FIREBALL_UNLOCK_LEVEL) return false;
            if (perk.id === FIREBALL_UNLOCK_PERK_ID && isFireballUnlocked()) return false;
            if ((perk.id === FIREBALL_COUNT_PERK_ID || perk.id === FIREBALL_COOLDOWN_PERK_ID) && !isFireballUnlocked()) return false;
            if (perk.id === BLACK_HOLE_UNLOCK_PERK_ID && forLevel < BLACK_HOLE_UNLOCK_LEVEL) return false;
            if (perk.id === BLACK_HOLE_UNLOCK_PERK_ID && isBlackHoleUnlocked()) return false;
            if ((perk.id === BLACK_HOLE_COUNT_PERK_ID || perk.id === BLACK_HOLE_DAMAGE_PERK_ID || perk.id === BLACK_HOLE_COOLDOWN_PERK_ID) && !isBlackHoleUnlocked()) return false;
            return true;
        });

        const eligiblePerks = forLevel === AXE_UNLOCK_LEVEL
            ? regularPerks.filter((perk) => SKILL_PERK_IDS.has(perk.id))
            : regularPerks;

        const shuffled = eligiblePerks.slice();
>>>>>>> e1645f2c8daa6a5fe2729108fe62427269e6c794
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const selected = shuffled.slice(0, Math.min(count, shuffled.length));
<<<<<<< HEAD
        const axeChance = getAxeSpawnChance(forLevel);
        if (Math.random() < axeChance) {
            const axePerk = perkPool.find((perk) => perk.id === AXE_PERK_ID);
            if (axePerk) {
                if (selected.length < count) {
                    selected.push(axePerk);
                } else if (selected.length > 0) {
                    const replaceIdx = Math.floor(Math.random() * selected.length);
                    selected[replaceIdx] = axePerk;
                }
=======

        return selected.map((perk) => {
            if (perk.id === AXE_PERK_ID) {
                return getAxePerkCard();
>>>>>>> e1645f2c8daa6a5fe2729108fe62427269e6c794
            }

<<<<<<< HEAD
        return selected.map((perk) => ({ id: perk.id, name: perk.name, description: perk.description }));
=======
            return {
                id: perk.id,
                name: perk.name,
                description: perk.description
            };
        });
>>>>>>> e1645f2c8daa6a5fe2729108fe62427269e6c794
    }

    function queuePerkChoices(levelsGained = 1) {
        const firstGainedLevel = Math.max(1, movement.player.level - levelsGained + 1);
        for (let i = 0; i < levelsGained; i++) {
            const levelForThisChoice = firstGainedLevel + i;
            pendingPerkChoices.push(pickRandomPerks(3, levelForThisChoice));
        }
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

        const choices = pendingPerkChoices.shift();
        const choice = choices[idx];
        if (!choice) return null;

        const perk = perkPool.find((p) => p.id === choice.id);
        if (!perk) return null;
<<<<<<< HEAD
        perk.apply(combat.attackStats);
        combat.axeState.count = Math.max(0, Number(combat.attackStats.Axe) || 0);
        combat.axeState.active = combat.axeState.count > 0;
        combat.syncDerivedAttackVisualStats();
        return choice.id;
    }

    function update(enemies = []) {
        movement.update(enemies);
        combat.updateAttacks(enemies);
    }

    function draw() {
        movement.draw();
    }

    function drawAttacks() {
        combat.drawAttacks();
=======

        perk.apply({ attackStats, fireballState, chaosAuraState, blackHoleState });

        axeSpell.setCount(getAxeCount());
        fireballSpell.setCount(Math.max(0, Number(attackStats.Fireball) || 0));
        chaosAuraSpell.setActive(isChaosAuraUnlocked());
        blackHoleSpell.setCount(Math.max(0, Number(attackStats.BlackHole) || 0));

        syncDerivedAttackVisualStats();
        return choice.id;
    }

    function collidesAt(x, y) {
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

    function clampToWorldBounds(x, y) {
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
        chaosAuraSpell.update(enemies, now);
        blackHoleSpell.update(enemies, now);
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
        blackHoleSpell.draw();
        chaosAuraSpell.draw();
        meleeAttackSystem.draw();
        axeSpell.draw();
        fireballSpell.draw();
    }

    function triggerHurt() {
        hurtUntil = performance.now() + HURT_DURATION_MS;
>>>>>>> e1645f2c8daa6a5fe2729108fe62427269e6c794
    }

    function applyDevTestLoadout() {
        attackStats.Axe = 5;
        attackStats.ChaosAura = 0;
        attackStats.BlackHole = 0;
        attackStats.Fireball = 0;

        axeSpell.setCount(5);
        fireballSpell.setCount(0);
        chaosAuraState.sizeMultiplier = 1;
        chaosAuraState.cooldownMultiplier = 1;
        chaosAuraState.damageMultiplier = 1;
        chaosAuraState.devMinCooldownMs = null;
        chaosAuraSpell.setActive(false);

        blackHoleState.cooldownMultiplier = 1;
        blackHoleState.damageMultiplier = 1;
        blackHoleSpell.setCount(0);
        if (typeof blackHoleSpell.reset === "function") {
            blackHoleSpell.reset();
        }

        player.level = Math.max(player.level, 5);
        pendingPerkChoices.length = 0;
        syncDerivedAttackVisualStats();
    }

    syncDerivedAttackVisualStats();

    return {
        player: movement.player,
        update,
        draw,
        drawAttacks,
        queuePerkChoices,
        getCurrentPerkChoices,
        hasPendingPerks,
        applyPerkByIndex,
<<<<<<< HEAD
        triggerHurt: movement.triggerHurt,
        getAttackStats: combat.getAttackStats
=======
        triggerHurt,
        applyDevTestLoadout,
        getAttackStats: () => ({ ...attackStats })
>>>>>>> e1645f2c8daa6a5fe2729108fe62427269e6c794
    };
}
