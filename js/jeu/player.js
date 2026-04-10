// Controleur du joueur
// Deplacement ZQSD avec collisions, auto-attaque et systeme de perks.

function createPlayerController(canvas, ctx, camera) {
    const sprite = new Image();
    sprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Walk.png";

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

    const HURT_DURATION_MS = 250;
    const hurtSprite = new Image();
    hurtSprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier with shadows/Soldier-Hurt.png";
    let hurtFrames = 1;
    let hurtUntil = 0;
    const attackVisualScale = 1;

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

    function getAxeSpawnChance(level) {
        if (level < AXE_UNLOCK_LEVEL) return 0;
        if (level === AXE_UNLOCK_LEVEL) return 1;

        // Progressive spawn chance after level 5.
        const baseChance = 0.05;
        const growthPerLevel = 0.01;
        const maxChance = 0.20;
        return Math.min(maxChance, baseChance + (level - AXE_UNLOCK_LEVEL) * growthPerLevel);
    }

    const perkPool = [
        { id: "damage_up", name: "+25% Degats", description: "Vos attaques frappent plus fort.", apply: (s) => { s.damage = Math.round(s.damage * 1.25); } },
        { id: "cooldown_down", name: "-20% Cooldown", description: "Vous attaquez plus souvent.", apply: (s) => { s.cooldown = Math.max(250, Math.round(s.cooldown * 0.8)); } },
        { id: "range_up", name: "+20% Portee", description: "Vous touchez de plus loin.", apply: (s) => { s.range = Math.round(s.range * 1.2); } },
        { id: "arc_up", name: "+15° Angle", description: "Votre attaque couvre une zone plus large.", apply: (s) => { s.halfAngle = Math.min(Math.PI, s.halfAngle + (Math.PI / 12)); } },
        { id: "Axe", name: "+1 hache", description: "Vous gagnez une puissante hache.", apply: (s) => { s.Axe = (Number(s.Axe) || 0) + 1; } }
        

    ];

    const pendingPerkChoices = [];

    function pickRandomPerks(count, forLevel = player.level) {
        const regularPerks = perkPool.filter((perk) => perk.id !== AXE_PERK_ID);
        const shuffled = regularPerks.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const selected = shuffled.slice(0, Math.min(count, shuffled.length));

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
            }
        }

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
        perk.apply(attackStats);
        axeState.count = Math.max(0, Number(attackStats.Axe) || 0);
        axeState.active = axeState.count > 0;
        syncDerivedAttackVisualStats();
        return choice.id;
    }

    // Fonction update combinée
    function update(enemies = []) {
        controller.update(enemies);
        attacks.updateAttacks(enemies);
    }

    // Fonction draw combinée
    function draw() {
        controller.draw();
    }

    // Fonction drawAttacks déléguée
    function drawAttacks() {
        attacks.drawAttacks();
    }

    // Retourner l'interface complète
    return {
        player: controller.player,
        update,
        draw,
        drawAttacks,
        queuePerkChoices: perks.queuePerkChoices,
        getCurrentPerkChoices: perks.getCurrentPerkChoices,
        hasPendingPerks: perks.hasPendingPerks,
        applyPerkByIndex: perks.applyPerkByIndex,
        triggerHurt: controller.triggerHurt,
        getAttackStats: attacks.getAttackStats
    };
}