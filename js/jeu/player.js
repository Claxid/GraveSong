// Controleur du joueur
// Deplacement ZQSD avec collisions, auto-attaque et systeme de perks.

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

    const attackSprite = new Image();
    attackSprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier(Split Effects)/Soldier-Attack01_Effect.png";
    let attackEffectFrames = 6;
    attackSprite.addEventListener("load", () => {
        attackEffectFrames = Math.max(1, Math.floor(attackSprite.width / 100));
    });

    const axeSprite = new Image();
    axeSprite.src = "../assets/sprites/axe.png";
    let axeSourceRect = null;
    let axePivot = null;

    const fireballSprite = new Image();
    fireballSprite.src = "../assets/sprites/Fireball/fireball_0.png";
    const fireballExplosionSprite = new Image();
    fireballExplosionSprite.src = "../assets/sprites/Fireball/toppng.com-explosion-sprite-png-2d-explosion-sprite-sheet-899x857.png";
    fireballSprite.addEventListener("error", () => {
        console.warn("Fireball sprite introuvable: ../assets/sprites/Fireball/fireball_0.png");
    });
    fireballExplosionSprite.addEventListener("error", () => {
        console.warn("Explosion sprite introuvable: ../assets/sprites/Fireball/toppng.com-explosion-sprite-png-2d-explosion-sprite-sheet-899x857.png");
    });
    let fireballProcessedSprite = null;
    let explosionProcessedSprite = null;
    let fireballSkinRects = [];
    let explosionSkinRects = [];
    const attackVisualScale = 1;

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

    const attacks = [];
    let lastAttackTime = 0;

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

    const fireballState = {
        active: false,
        count: 0,
        cooldown: 3000,
        speed: 4.5,
        damageMultiplier: 1.6,
        size: 44,
        hitRadius: 20,
        maxTravel: 1000,
        lastCastAt: 0,
        skinFrames: 2,
        skinAnimSpeed: 5,
        spriteAngleOffset: 0,
        explosionSize: 96,
        explosionAnimSpeed: 5,
        explosionFramesToUse: 2,
        explosionCols: 7,
        explosionRows: 7
    };

    const chaosAuraState = {
        active: false,
        radius: 75,
        damage: 22,
        cooldown: 2000,
        sizeMultiplier: 1,
        damageMultiplier: 1,
        cooldownMultiplier: 1,
        nextPulseAt: 0,
        frames: [],
        frameIndex: 0,
        pulseAnimActive: false,
        pulseAnimStartAt: 0,
        pulseAnimDurationMs: 700,
        knockbackDistance: 18,
        knockbackAppliedEnemies: new WeakSet()
    };

    const blackHoleState = {
        active: false,
        count: 0,
        cooldown: 9000,
        cooldownMultiplier: 1,
        lastSpawnAt: 0,
        searchRadius: 760,
        pullRadius: 140,
        pullStrength: 2.1,
        bossPullResistance: 3.6,
        damageMultiplier: 1,
        size: 240,
        minEnemyCount: 3,
        lifetimeMs: 5000,
        startDurationMs: 800,
        loopDurationMs: 3400,
        endDurationMs: 800,
        loopFrameDurationMs: 85,
        damageTickMs: 500,
        damagePerTick: 2,
        startFrames: [],
        loopFrames: [],
        endFrames: []
    };

    for (let i = 1; i <= 12; i++) {
        const frame = new Image();
        frame.src = `../assets/sprites/Zone/frames/BloodMage_skill2_frame${i}.png`;
        chaosAuraState.frames.push(frame);
    }

    for (let i = 1; i <= 8; i++) {
        const frame = new Image();
        frame.src = `../assets/sprites/Trou-noir/part1(start)/frames/BloodMage_skill1_start_frame${i}.png`;
        blackHoleState.startFrames.push(frame);
    }
    for (let i = 1; i <= 5; i++) {
        const frame = new Image();
        frame.src = `../assets/sprites/Trou-noir/part2(loop)/frames/BloodMage_skill1_loop_frame${i}.png`;
        blackHoleState.loopFrames.push(frame);
    }
    for (let i = 1; i <= 6; i++) {
        const frame = new Image();
        frame.src = `../assets/sprites/Trou-noir/part3(end)/frames/BloodMage_skill1_end_frame${i}.png`;
        blackHoleState.endFrames.push(frame);
    }

    const fireballs = [];
    const fireballExplosions = [];
    const blackHoles = [];

    function extractSpriteRectsFromSheet(image, { removeNearBlack = true, maxRects = 2, minArea = 24 } = {}) {
        const canvasProbe = document.createElement("canvas");
        canvasProbe.width = image.naturalWidth;
        canvasProbe.height = image.naturalHeight;
        const probeCtx = canvasProbe.getContext("2d", { willReadFrequently: true });
        if (!probeCtx) return { canvas: null, rects: [] };

        probeCtx.drawImage(image, 0, 0);
        const imageData = probeCtx.getImageData(0, 0, canvasProbe.width, canvasProbe.height);
        const data = imageData.data;
        const width = canvasProbe.width;
        const height = canvasProbe.height;

        const mask = new Uint8Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                const isNearBlack = removeNearBlack && (r < 26 && g < 26 && b < 26);
                if (a < 20 || isNearBlack) {
                    data[idx + 3] = 0;
                    continue;
                }
                mask[y * width + x] = 1;
            }
        }

        probeCtx.putImageData(imageData, 0, 0);

        const visited = new Uint8Array(width * height);
        const rects = [];

        const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const start = y * width + x;
                if (!mask[start] || visited[start]) continue;

                let minX = x;
                let minY = y;
                let maxX = x;
                let maxY = y;
                let pixelCount = 0;

                const queue = [start];
                visited[start] = 1;

                while (queue.length > 0) {
                    const current = queue.pop();
                    const cx = current % width;
                    const cy = Math.floor(current / width);
                    pixelCount++;

                    if (cx < minX) minX = cx;
                    if (cy < minY) minY = cy;
                    if (cx > maxX) maxX = cx;
                    if (cy > maxY) maxY = cy;

                    for (const [dx, dy] of neighbors) {
                        const nx = cx + dx;
                        const ny = cy + dy;
                        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                        const ni = ny * width + nx;
                        if (!mask[ni] || visited[ni]) continue;
                        visited[ni] = 1;
                        queue.push(ni);
                    }
                }

                if (pixelCount < minArea) continue;
                const pad = 1;
                const sx = Math.max(0, minX - pad);
                const sy = Math.max(0, minY - pad);
                const sw = Math.min(width - sx, (maxX - minX + 1) + pad * 2);
                const sh = Math.min(height - sy, (maxY - minY + 1) + pad * 2);
                rects.push({ sx, sy, sw, sh, area: pixelCount });
            }
        }

        // Keep only first visual elements from top-left to bottom-right.
        rects.sort((a, b) => (a.sy - b.sy) || (a.sx - b.sx));
        return {
            canvas: canvasProbe,
            rects: rects.slice(0, Math.max(1, maxRects)).map((r) => ({ sx: r.sx, sy: r.sy, sw: r.sw, sh: r.sh }))
        };
    }

    fireballSprite.addEventListener("load", () => {
        try {
            const extracted = extractSpriteRectsFromSheet(fireballSprite, { removeNearBlack: true, maxRects: 2, minArea: 40 });
            fireballProcessedSprite = extracted.canvas;
            fireballSkinRects = extracted.rects;
        } catch (_err) {
            fireballProcessedSprite = null;
            fireballSkinRects = [];
        }
    });

    fireballExplosionSprite.addEventListener("load", () => {
        try {
            const extracted = extractSpriteRectsFromSheet(fireballExplosionSprite, { removeNearBlack: true, maxRects: 2, minArea: 140 });
            explosionProcessedSprite = extracted.canvas;
            explosionSkinRects = extracted.rects;
        } catch (_err) {
            explosionProcessedSprite = null;
            explosionSkinRects = [];
        }
    });

    axeSprite.addEventListener("load", () => {
        try {
            const probeCanvas = document.createElement("canvas");
            probeCanvas.width = axeSprite.naturalWidth;
            probeCanvas.height = axeSprite.naturalHeight;
            const probeCtx = probeCanvas.getContext("2d", { willReadFrequently: true });
            if (!probeCtx) return;

            probeCtx.drawImage(axeSprite, 0, 0);
            const data = probeCtx.getImageData(0, 0, probeCanvas.width, probeCanvas.height).data;

            let minX = probeCanvas.width;
            let minY = probeCanvas.height;
            let maxX = -1;
            let maxY = -1;
            let sumX = 0;
            let sumY = 0;
            let sumWeight = 0;

            for (let y = 0; y < probeCanvas.height; y++) {
                for (let x = 0; x < probeCanvas.width; x++) {
                    const idx = (y * probeCanvas.width + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const a = data[idx + 3];

                    // Ignore near-black background pixels from source image.
                    if (a < 20 || (r < 20 && g < 20 && b < 20)) continue;

                    const weight = Math.max(1, a);
                    sumX += x * weight;
                    sumY += y * weight;
                    sumWeight += weight;

                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }

            if (maxX >= minX && maxY >= minY) {
                const pad = 2;
                const sx = Math.max(0, minX - pad);
                const sy = Math.max(0, minY - pad);
                const sw = Math.min(probeCanvas.width - sx, (maxX - minX + 1) + pad * 2);
                const sh = Math.min(probeCanvas.height - sy, (maxY - minY + 1) + pad * 2);
                axeSourceRect = { sx, sy, sw, sh };

                if (sumWeight > 0) {
                    axePivot = {
                        x: (sumX / sumWeight) - sx,
                        y: (sumY / sumWeight) - sy
                    };
                }
            }
        } catch (_err) {
            axeSourceRect = null;
            axePivot = null;
        }
    });

    function normalizeAngle(angle) {
        while (angle <= -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        return angle;
    }

   
   function AxeSkill(Axe) {
    
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

    function isFireballUnlocked() {
        return (Number(attackStats.Fireball) || 0) > 0;
    }

    function isChaosAuraUnlocked() {
        return (Number(attackStats.ChaosAura) || 0) > 0;
    }

    function isBlackHoleUnlocked() {
        return (Number(attackStats.BlackHole) || 0) > 0;
    }

    function getChaosAuraRadius() {
        return chaosAuraState.radius * chaosAuraState.sizeMultiplier;
    }

    function getChaosAuraDamage() {
        return Math.max(1, Math.round(chaosAuraState.damage * chaosAuraState.damageMultiplier));
    }

    function getChaosAuraCooldownMs() {
        return Math.max(250, Math.round(chaosAuraState.cooldown * chaosAuraState.cooldownMultiplier));
    }

    function getBlackHoleCooldownMs() {
        return Math.max(1800, Math.round(blackHoleState.cooldown * blackHoleState.cooldownMultiplier));
    }

    function getBlackHolePullRadius() {
        return blackHoleState.pullRadius;
    }

    function getBlackHolePullStrength() {
        return blackHoleState.pullStrength;
    }

    function getBlackHoleDamagePerTick() {
        return Math.max(1, Math.round(blackHoleState.damagePerTick * Math.max(1, blackHoleState.damageMultiplier)));
    }

    function getBlackHoleRenderSize() {
        return blackHoleState.size;
    }

    const perkPool = [
        { id: "damage_up", name: "Serment sanglant", description: "+25% degats d'attaque.", apply: ({ attackStats: s }) => { s.damage = Math.round(s.damage * 1.25); } },
        { id: "cooldown_down", name: "Ferveur noire", description: "Attaques 20% plus rapides.", apply: ({ attackStats: s }) => { s.cooldown = Math.max(250, Math.round(s.cooldown * 0.8)); } },
        { id: "range_up", name: "Lame allongee", description: "+20% de portee.", apply: ({ attackStats: s }) => { s.range = Math.round(s.range * 1.2); } },
        { id: "arc_up", name: "Croissant maudit", description: "Arc d'attaque +15 degres.", apply: ({ attackStats: s }) => { s.halfAngle = Math.min(Math.PI, s.halfAngle + (Math.PI / 12)); } },
        { id: "Axe", name: "Hache runique", description: "Ajoute 1 hache orbitale.", apply: ({ attackStats: s }) => { s.Axe = (Number(s.Axe) || 0) + 1; } },
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
        // Level 5: skill perks only, including black hole unlock.
        if (forLevel === AXE_UNLOCK_LEVEL) {
            const axePerk = perkPool.find((perk) => perk.id === AXE_PERK_ID);
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
            if (perk.id === AXE_PERK_ID && forLevel < AXE_UNLOCK_LEVEL) return false;
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

        // Level 5 should only contain skill perks by design; other levels use equal chance for all eligible perks.
        const eligiblePerks = forLevel === AXE_UNLOCK_LEVEL
            ? regularPerks.filter((perk) => SKILL_PERK_IDS.has(perk.id))
            : regularPerks;

        const shuffled = eligiblePerks.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const selected = shuffled.slice(0, Math.min(count, shuffled.length));

        return selected.map((perk) => ({
            id: perk.id,
            name: perk.name,
            description: perk.description
        }));
    }

    function queuePerkChoices(levelsGained = 1) {
        const firstGainedLevel = Math.max(1, player.level - levelsGained + 1);
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
        perk.apply({ attackStats, fireballState, chaosAuraState, blackHoleState });
        axeState.count = Math.max(0, Number(attackStats.Axe) || 0);
        axeState.active = axeState.count > 0;
        chaosAuraState.active = isChaosAuraUnlocked();
        if (chaosAuraState.active && chaosAuraState.nextPulseAt <= 0) {
            const now = performance.now();
            const initialDelayMs = Math.round(getChaosAuraCooldownMs() * 1.5);
            chaosAuraState.nextPulseAt = now + initialDelayMs;
        }
        fireballState.count = Math.max(0, Number(attackStats.Fireball) || 0);
        fireballState.active = fireballState.count > 0;
        blackHoleState.count = Math.max(0, Number(attackStats.BlackHole) || 0);
        blackHoleState.active = blackHoleState.count > 0;
        syncDerivedAttackVisualStats();
        return choice.id;
    }

    function spawnFireballExplosion(x, y) {
        fireballExplosions.push({
            x,
            y,
            frame: 0,
            animCounter: 0
        });
    }

    function getNearestEnemies(enemies, sourceX, sourceY, maxTargets) {
        return enemies
            .filter((enemy) => enemy && enemy.hp > 0)
            .map((enemy) => {
                const dx = enemy.x - sourceX;
                const dy = enemy.y - sourceY;
                return {
                    enemy,
                    dist: Math.sqrt(dx * dx + dy * dy)
                };
            })
            .sort((a, b) => a.dist - b.dist)
            .slice(0, maxTargets)
            .map((entry) => entry.enemy);
    }

    function clampEnemyToWorldBounds(enemy) {
        if (!enemy || !worldBounds || !Number.isFinite(worldBounds.width) || !Number.isFinite(worldBounds.height)) return;
        const halfW = (Number(enemy.hitW) || 30) / 2;
        const halfH = (Number(enemy.hitH) || 30) / 2;
        enemy.x = Math.max(halfW, Math.min(worldBounds.width - halfW, enemy.x));
        enemy.y = Math.max(halfH, Math.min(worldBounds.height - halfH, enemy.y));
    }

    function findBlackHoleTargets(enemies, maxTargets) {
        const alive = enemies.filter((enemy) => {
            if (!enemy || enemy.hp <= 0) return false;
            if (enemy.isBoss) return true;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            return (dx * dx + dy * dy) <= (blackHoleState.searchRadius * blackHoleState.searchRadius);
        });

        if (alive.length === 0) return [];

        const hasBoss = alive.some((enemy) => enemy.isBoss);
        if (!hasBoss && alive.length < blackHoleState.minEnemyCount) return [];

        const clusterRadius = getBlackHolePullRadius() * 1.25;
        const minCenterDistance = getBlackHolePullRadius() * 0.9;
        const candidates = [];

        for (const seed of alive) {
            const group = alive.filter((enemy) => {
                const dx = enemy.x - seed.x;
                const dy = enemy.y - seed.y;
                return (dx * dx + dy * dy) <= (clusterRadius * clusterRadius);
            });

            let sumX = 0;
            let sumY = 0;
            for (const enemy of group) {
                sumX += enemy.x;
                sumY += enemy.y;
            }

            candidates.push({
                score: group.length,
                x: sumX / Math.max(1, group.length),
                y: sumY / Math.max(1, group.length)
            });
        }

        candidates.sort((a, b) => b.score - a.score);

        const selected = [];
        for (const candidate of candidates) {
            if (selected.length >= maxTargets) break;
            const tooClose = selected.some((existing) => {
                const dx = candidate.x - existing.x;
                const dy = candidate.y - existing.y;
                return (dx * dx + dy * dy) < (minCenterDistance * minCenterDistance);
            });
            if (tooClose) continue;
            selected.push(candidate);
        }

        return selected.map((candidate) => ({
            x: candidate.x,
            y: candidate.y
        }));
    }

    function getBlackHolePullRadiusForEnemy(enemy) {
        const enemyRadius = Math.max(enemy.hitW || 0, enemy.hitH || 0) / 2;
        return getBlackHolePullRadius() + enemyRadius;
    }

    function getBlackHolePullStep(distance, affectRadius, enemy) {
        const distanceFactor = Math.max(0.85, 1 - (distance / Math.max(1, affectRadius)));
        const speed = Math.max(0.1, Number(enemy.speed) || 1);
        const baseResistance = 1 + (speed * 0.9);
        const bossResistance = enemy && enemy.isBoss ? Math.max(1, blackHoleState.bossPullResistance) : 1;
        const resistance = baseResistance * bossResistance;
        return (getBlackHolePullStrength() * distanceFactor) / resistance;
    }

    function jitterBlackHoleCenter(x, y) {
        const jitter = Math.min(60, getBlackHolePullRadius() * 0.42);
        return {
            x: x + (Math.random() * 2 - 1) * jitter,
            y: y + (Math.random() * 2 - 1) * jitter
        };
    }

    function clampPointToWorldBounds(x, y) {
        if (!worldBounds || !Number.isFinite(worldBounds.width) || !Number.isFinite(worldBounds.height)) {
            return { x, y };
        }
        const margin = getBlackHoleRenderSize() * 0.55;
        return {
            x: Math.max(margin, Math.min(worldBounds.width - margin, x)),
            y: Math.max(margin, Math.min(worldBounds.height - margin, y))
        };
    }

    function spreadBlackHoleTargetsChaotically(targets) {
        const spread = [];
        const minGap = getBlackHoleRenderSize() * 0.78;

        for (const target of targets) {
            let selectedPoint = null;

            for (let attempt = 0; attempt < 20; attempt++) {
                const angle = Math.random() * Math.PI * 2;
                const randomRadius = 22 + Math.random() * getBlackHolePullRadius() * 0.92;
                const chaoticOffsetX = Math.cos(angle) * randomRadius + (Math.random() * 2 - 1) * 30;
                const chaoticOffsetY = Math.sin(angle) * randomRadius + (Math.random() * 2 - 1) * 30;
                const candidate = clampPointToWorldBounds(target.x + chaoticOffsetX, target.y + chaoticOffsetY);

                const overlaps = spread.some((p) => {
                    const dx = candidate.x - p.x;
                    const dy = candidate.y - p.y;
                    return (dx * dx + dy * dy) < (minGap * minGap);
                });

                if (!overlaps) {
                    selectedPoint = candidate;
                    break;
                }
            }

            if (!selectedPoint) {
                selectedPoint = clampPointToWorldBounds(target.x, target.y);
            }

            spread.push(selectedPoint);
        }

        return spread;
    }

    function spawnBlackHole(x, y, now) {
        blackHoles.push({
            x,
            y,
            spawnedAt: now,
            lastDamageAt: now
        });
    }

    function getBlackHoleFrame(blackHole, now) {
        const elapsed = now - blackHole.spawnedAt;
        const startEnd = blackHoleState.startDurationMs;
        const loopEnd = startEnd + blackHoleState.loopDurationMs;

        if (elapsed < startEnd) {
            const frames = blackHoleState.startFrames;
            if (!Array.isArray(frames) || frames.length === 0) return null;
            const phaseProgress = elapsed / Math.max(1, blackHoleState.startDurationMs);
            const frameIndex = Math.min(frames.length - 1, Math.max(0, Math.floor(phaseProgress * frames.length)));
            return frames[frameIndex] || null;
        }

        if (elapsed < loopEnd) {
            const frames = blackHoleState.loopFrames;
            if (!Array.isArray(frames) || frames.length === 0) return null;
            const loopElapsed = elapsed - startEnd;
            const frameIndex = Math.floor(loopElapsed / Math.max(1, blackHoleState.loopFrameDurationMs)) % frames.length;
            return frames[frameIndex] || null;
        }

        const frames = blackHoleState.endFrames;
        if (!Array.isArray(frames) || frames.length === 0) return null;
        const phaseProgress = (elapsed - loopEnd) / Math.max(1, blackHoleState.endDurationMs);
        const frameIndex = Math.min(frames.length - 1, Math.max(0, Math.floor(phaseProgress * frames.length)));
        return frames[frameIndex] || null;
    }

    function collidesAt(x, y) {
        const isVilleMap = window.location.pathname.replace(/\\/g, "/").endsWith("/template/ville.html");
        if (isVilleMap) return false;

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

        if (chaosAuraState.active) {
            if (chaosAuraState.pulseAnimActive) {
                const elapsed = now - chaosAuraState.pulseAnimStartAt;
                const progress = elapsed / Math.max(1, chaosAuraState.pulseAnimDurationMs);
                if (progress >= 1) {
                    chaosAuraState.pulseAnimActive = false;
                    chaosAuraState.frameIndex = 0;
                } else {
                    const frameCount = Math.max(1, chaosAuraState.frames.length);
                    chaosAuraState.frameIndex = Math.min(frameCount - 1, Math.floor(progress * frameCount));
                }
            }

            const auraCooldown = getChaosAuraCooldownMs();
            if (chaosAuraState.nextPulseAt <= 0) {
                chaosAuraState.nextPulseAt = now + auraCooldown;
            }

            if (now >= chaosAuraState.nextPulseAt) {
                const auraRadius = getChaosAuraRadius();
                const auraDamage = getChaosAuraDamage();

                for (const enemy of enemies) {
                    if (!enemy || enemy.hp <= 0) continue;

                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const enemyRadius = Math.max(enemy.hitW || 0, enemy.hitH || 0) / 2;
                    const hitDistance = auraRadius + enemyRadius;
                    if ((dx * dx + dy * dy) > hitDistance * hitDistance) continue;

                    enemy.hp = Math.max(0, enemy.hp - auraDamage);

                    if (!chaosAuraState.knockbackAppliedEnemies.has(enemy)) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0.0001) {
                            const pushX = (dx / dist) * chaosAuraState.knockbackDistance;
                            const pushY = (dy / dist) * chaosAuraState.knockbackDistance;
                            enemy.x += pushX;
                            enemy.y += pushY;
                        }
                        chaosAuraState.knockbackAppliedEnemies.add(enemy);
                    }
                }

                chaosAuraState.pulseAnimActive = true;
                chaosAuraState.pulseAnimStartAt = now;
                chaosAuraState.frameIndex = 0;
                chaosAuraState.nextPulseAt = now + auraCooldown;
            }
        }

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
            if (nearest) {
                const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
                attacks.push({ x: player.x, y: player.y, angle, frameX: 0, animCounter: 0, hitApplied: false });
                lastAttackTime = now;
            }
        }

        if (axeState.active) {
            axeState.angle = normalizeAngle(axeState.angle + axeState.angularSpeed);
            axeState.spinAngle = normalizeAngle(axeState.spinAngle + axeState.spinSpeed);

            const axeCount = Math.max(1, Math.min(5, axeState.count));
            const step = (Math.PI * 2) / axeCount;
            const axeHitRadius = 42;
            const axeDamage = Math.max(1, attackStats.damage * axeState.damageMultiplier);

            for (let axeIdx = 0; axeIdx < axeCount; axeIdx++) {
                const axeAngle = axeState.angle + step * axeIdx;
                const axeX = player.x + Math.cos(axeAngle) * axeState.radius;
                const axeY = player.y + Math.sin(axeAngle) * axeState.radius;

                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    if (!enemy || enemy.hp <= 0) continue;

                    const dx = enemy.x - axeX;
                    const dy = enemy.y - axeY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > axeHitRadius) continue;

                    const enemyId = enemy.id ?? i;
                    const cooldownKey = `${enemyId}:${axeIdx}`;
                    const lastHitTime = axeState.lastHitByEnemy.get(cooldownKey) ?? 0;
                    if (now - lastHitTime < axeState.hitCooldown) continue;

                    // Axe one-shots regular orcs but not tanky Orc3.
                    const appliedAxeDamage = enemy.type === "orc" ? enemy.hp : axeDamage;
                    enemy.hp = Math.max(0, enemy.hp - appliedAxeDamage);
                    axeState.lastHitByEnemy.set(cooldownKey, now);
                }
            }
        }

        if (fireballState.active && enemies.length > 0 && now - fireballState.lastCastAt >= fireballState.cooldown) {
            const fireballCount = Math.max(1, Math.min(6, fireballState.count));
            const targets = getNearestEnemies(enemies, player.x, player.y, fireballCount);

            for (const target of targets) {
                const dx = target.x - player.x;
                const dy = target.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= 0.0001) continue;

                const vx = (dx / distance) * fireballState.speed;
                const vy = (dy / distance) * fireballState.speed;

                fireballs.push({
                    x: player.x,
                    y: player.y,
                    vx,
                    vy,
                    frameX: Math.floor(Math.random() * Math.max(1, fireballState.skinFrames)),
                    animCounter: 0,
                    traveled: 0
                });
            }

            if (targets.length > 0) {
                fireballState.lastCastAt = now;
            }
        }

        const blackHoleCooldown = getBlackHoleCooldownMs();
        if (blackHoleState.active && enemies.length > 0 && now - blackHoleState.lastSpawnAt >= blackHoleCooldown) {
            const blackHoleCount = Math.max(1, Math.min(4, blackHoleState.count));
            const targets = findBlackHoleTargets(enemies, blackHoleCount);
            if (targets.length > 0) {
                const spreadTargets = spreadBlackHoleTargetsChaotically(targets);
                for (const target of spreadTargets) {
                    const jittered = jitterBlackHoleCenter(target.x, target.y);
                    const bounded = clampPointToWorldBounds(jittered.x, jittered.y);
                    spawnBlackHole(bounded.x, bounded.y, now);
                }
                blackHoleState.lastSpawnAt = now;
            }
        }

        for (let i = blackHoles.length - 1; i >= 0; i--) {
            const blackHole = blackHoles[i];
            const elapsed = now - blackHole.spawnedAt;

            if (elapsed >= blackHoleState.lifetimeMs) {
                blackHoles.splice(i, 1);
                continue;
            }

            for (const enemy of enemies) {
                if (!enemy || enemy.hp <= 0) continue;

                const dx = blackHole.x - enemy.x;
                const dy = blackHole.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                const affectRadius = getBlackHolePullRadiusForEnemy(enemy);

                if (dist > affectRadius) continue;

                const nx = dx / dist;
                const ny = dy / dist;
                const pullStep = getBlackHolePullStep(dist, affectRadius, enemy);

                enemy.x += nx * pullStep;
                enemy.y += ny * pullStep;
                clampEnemyToWorldBounds(enemy);
            }

            if (now - blackHole.lastDamageAt >= blackHoleState.damageTickMs) {
                const damagePerTick = getBlackHoleDamagePerTick();
                for (const enemy of enemies) {
                    if (!enemy || enemy.hp <= 0) continue;
                    const dx = enemy.x - blackHole.x;
                    const dy = enemy.y - blackHole.y;
                    const affectRadius = getBlackHolePullRadiusForEnemy(enemy);
                    if ((dx * dx + dy * dy) > (affectRadius * affectRadius)) continue;
                    enemy.hp = Math.max(0, enemy.hp - damagePerTick);
                }
                blackHole.lastDamageAt = now;
            }
        }

        const fireballDamage = Math.max(1, Math.round(attackStats.damage * fireballState.damageMultiplier));

        for (let i = fireballs.length - 1; i >= 0; i--) {
            const fireball = fireballs[i];
            fireball.x += fireball.vx;
            fireball.y += fireball.vy;
            fireball.traveled += Math.sqrt(fireball.vx * fireball.vx + fireball.vy * fireball.vy);

            fireball.animCounter++;
            if (fireball.animCounter >= fireballState.skinAnimSpeed) {
                fireball.animCounter = 0;
                fireball.frameX = (fireball.frameX + 1) % Math.max(1, fireballState.skinFrames);
            }

            let hit = false;
            for (const enemy of enemies) {
                if (!enemy || enemy.hp <= 0) continue;

                const dx = enemy.x - fireball.x;
                const dy = enemy.y - fireball.y;
                const enemyRadius = Math.max(enemy.hitW, enemy.hitH) / 2;
                const hitDistance = fireballState.hitRadius + enemyRadius;

                if ((dx * dx + dy * dy) > hitDistance * hitDistance) continue;

                const appliedFireballDamage = enemy.type === "orc" ? enemy.hp : fireballDamage;
                enemy.hp = Math.max(0, enemy.hp - appliedFireballDamage);
                spawnFireballExplosion(fireball.x, fireball.y);
                hit = true;
                break;
            }

            if (hit || fireball.traveled >= fireballState.maxTravel) {
                fireballs.splice(i, 1);
            }
        }

        const explosionTotalFrames = Math.max(1, fireballState.explosionFramesToUse);
        for (let i = fireballExplosions.length - 1; i >= 0; i--) {
            const explosion = fireballExplosions[i];
            explosion.animCounter++;

            if (explosion.animCounter >= fireballState.explosionAnimSpeed) {
                explosion.animCounter = 0;
                explosion.frame++;
            }

            if (explosion.frame >= explosionTotalFrames) {
                fireballExplosions.splice(i, 1);
            }
        }

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
        if (blackHoleState.active) {
            const now = performance.now();
            const renderSize = getBlackHoleRenderSize() * camera.zoom;

            for (const blackHole of blackHoles) {
                const centerX = (blackHole.x - camera.x) * camera.zoom;
                const centerY = (blackHole.y - camera.y) * camera.zoom;
                const frame = getBlackHoleFrame(blackHole, now);

                if (frame && frame.complete && frame.naturalWidth > 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.92;
                    ctx.drawImage(
                        frame,
                        centerX - renderSize / 2,
                        centerY - renderSize / 2,
                        renderSize,
                        renderSize
                    );
                    ctx.restore();
                } else {
                    ctx.save();
                    const gradient = ctx.createRadialGradient(centerX, centerY, renderSize * 0.1, centerX, centerY, renderSize * 0.6);
                    gradient.addColorStop(0, "rgba(0, 0, 0, 0.85)");
                    gradient.addColorStop(0.5, "rgba(34, 9, 54, 0.5)");
                    gradient.addColorStop(1, "rgba(86, 14, 120, 0.05)");
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, renderSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        if (chaosAuraState.active) {
            const auraRadius = getChaosAuraRadius();
            const auraSize = auraRadius * 2 * camera.zoom;
            const centerX = (player.x - camera.x) * camera.zoom;
            const centerY = (player.y - camera.y) * camera.zoom;
            const auraFrame = chaosAuraState.frames[chaosAuraState.frameIndex];

            if (auraFrame && auraFrame.complete && auraFrame.naturalWidth > 0) {
                ctx.save();
                ctx.globalAlpha = chaosAuraState.pulseAnimActive ? 0.82 : 0.42;
                ctx.drawImage(
                    auraFrame,
                    centerX - auraSize / 2,
                    centerY - auraSize / 2,
                    auraSize,
                    auraSize
                );
                ctx.restore();
            } else {
                ctx.save();
                ctx.fillStyle = "rgba(156, 40, 24, 0.18)";
                ctx.strokeStyle = "rgba(255, 120, 60, 0.75)";
                ctx.lineWidth = Math.max(2, camera.zoom * 2);
                ctx.beginPath();
                ctx.arc(centerX, centerY, auraRadius * camera.zoom, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }

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
            const axeSize = axeState.size * camera.zoom;

            const axeCount = Math.max(1, Math.min(5, axeState.count));
            const step = (Math.PI * 2) / axeCount;

            for (let axeIdx = 0; axeIdx < axeCount; axeIdx++) {
                const axeAngle = axeState.angle + step * axeIdx;
                const axeX = (player.x + Math.cos(axeAngle) * axeState.radius - camera.x) * camera.zoom;
                const axeY = (player.y + Math.sin(axeAngle) * axeState.radius - camera.y) * camera.zoom;
                const sourceRect = axeSourceRect || { sx: 0, sy: 0, sw: axeSprite.naturalWidth || 1, sh: axeSprite.naturalHeight || 1 };
                const pivot = axePivot || { x: sourceRect.sw / 2, y: sourceRect.sh / 2 };
                const renderScale = axeSize / Math.max(sourceRect.sw, sourceRect.sh);
                const renderW = sourceRect.sw * renderScale;
                const renderH = sourceRect.sh * renderScale;

                ctx.save();
                ctx.translate(axeX, axeY);
                ctx.rotate(axeAngle + Math.PI + axeState.spinAngle);
                if (axeSprite.complete && axeSprite.naturalWidth > 0) {
                    ctx.drawImage(
                        axeSprite,
                        sourceRect.sx,
                        sourceRect.sy,
                        sourceRect.sw,
                        sourceRect.sh,
                        -pivot.x * renderScale,
                        -pivot.y * renderScale,
                        renderW,
                        renderH
                    );
                }
                ctx.restore();
            }
        }

        if (fireballState.active) {
            const fireballSize = fireballState.size * camera.zoom;
            for (const fireball of fireballs) {
                const centerX = (fireball.x - camera.x) * camera.zoom;
                const centerY = (fireball.y - camera.y) * camera.zoom;

                if (fireballSprite.complete && fireballSprite.naturalWidth > 0) {
                    const sourceImage = fireballProcessedSprite || fireballSprite;
                    const fallbackRect = {
                        sx: 0,
                        sy: 0,
                        sw: sourceImage.naturalWidth || sourceImage.width || 1,
                        sh: sourceImage.naturalHeight || sourceImage.height || 1
                    };
                    const frames = fireballSkinRects.length > 0 ? fireballSkinRects : [fallbackRect];
                    const frameIndex = fireball.frameX % Math.max(1, Math.min(fireballState.skinFrames, frames.length));
                    const frameRect = frames[frameIndex] || frames[0];
                    const pivot = { x: frameRect.sw / 2, y: frameRect.sh / 2 };
                    const renderScale = fireballSize / Math.max(frameRect.sw, frameRect.sh);
                    const renderW = frameRect.sw * renderScale;
                    const renderH = frameRect.sh * renderScale;
                    const angle = Math.atan2(fireball.vy, fireball.vx);

                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.rotate(angle + fireballState.spriteAngleOffset);
                    ctx.drawImage(
                        sourceImage,
                        frameRect.sx,
                        frameRect.sy,
                        frameRect.sw,
                        frameRect.sh,
                        -pivot.x * renderScale,
                        -pivot.y * renderScale,
                        renderW,
                        renderH
                    );
                    ctx.restore();
                } else {
                    ctx.fillStyle = "#ff7a00";
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, fireballSize / 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            if (fireballExplosionSprite.complete && fireballExplosionSprite.naturalWidth > 0) {
                const sourceImage = explosionProcessedSprite || fireballExplosionSprite;
                const fallbackRect = {
                    sx: 0,
                    sy: 0,
                    sw: sourceImage.naturalWidth || sourceImage.width || 1,
                    sh: sourceImage.naturalHeight || sourceImage.height || 1
                };
                const frames = explosionSkinRects.length > 0 ? explosionSkinRects : [fallbackRect];
                const frameCount = Math.max(1, Math.min(fireballState.explosionFramesToUse, frames.length));
                const explosionSize = fireballState.explosionSize * camera.zoom;

                for (const explosion of fireballExplosions) {
                    const frame = explosion.frame % frameCount;
                    const frameRect = frames[frame] || frames[0];
                    const dx = (explosion.x - camera.x) * camera.zoom - explosionSize / 2;
                    const dy = (explosion.y - camera.y) * camera.zoom - explosionSize / 2;

                    ctx.drawImage(
                        sourceImage,
                        frameRect.sx,
                        frameRect.sy,
                        frameRect.sw,
                        frameRect.sh,
                        dx,
                        dy,
                        explosionSize,
                        explosionSize
                    );
                }
            }
        }
    }

    function triggerHurt() {
        hurtUntil = performance.now() + HURT_DURATION_MS;
    }

    function applyDevTestLoadout() {
        attackStats.Axe = 5;
        attackStats.BlackHole = 4;
        attackStats.Fireball = 3;

        axeState.count = 5;
        axeState.active = true;

        fireballState.count = 3;
        fireballState.active = true;

        blackHoleState.count = 4;
        blackHoleState.active = true;

        player.level = Math.max(player.level, 5);
        pendingPerkChoices.length = 0;
        syncDerivedAttackVisualStats();
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
        applyDevTestLoadout,
        getAttackStats: () => ({ ...attackStats })
    };
}
