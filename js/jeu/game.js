// Boucle principale du jeu
// Fichier principal du jeu avec boucle, canvas, etc.

// CANVAS PLEIN ECRAN + RESPONSIVE
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Ajuste la taille du canvas à la taille de l'écran
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

// Je crée les contrôleurs pour la map, la caméra, le joueur et l'ennemi.
const mapRenderer = createMapRenderer(canvas, ctx);
const cameraController = createCameraController(canvas, mapRenderer.MAP_WIDTH, mapRenderer.MAP_HEIGHT);
const playerController = createPlayerController(canvas, ctx, cameraController.camera, {
    width: mapRenderer.MAP_WIDTH,
    height: mapRenderer.MAP_HEIGHT
});
const enemyControllers = [];
const potions = [];
const potionSprite = new Image();
potionSprite.src = "../assets/sprites/potion/healing_potion.png";
const bossHpUnderSprite = new Image();
bossHpUnderSprite.src = "../assets/sprites/mino_v1.1_free/bonus_mino_healthbar_UI/mino_health_under.png";
const bossHpProgressSprite = new Image();
bossHpProgressSprite.src = "../assets/sprites/mino_v1.1_free/bonus_mino_healthbar_UI/mino_health_progress.png";
const bossHpOverSprite = new Image();
bossHpOverSprite.src = "../assets/sprites/mino_v1.1_free/bonus_mino_healthbar_UI/mino_health_over.png";
const pnjControllers = [];

const ORC_POTION_DROP_CHANCE = 0.02;
const ORC3_POTION_DROP_CHANCE = 0.04;
const POTION_HEAL_AMOUNT = 15;
const SPAWN_RING_MIN = 500;
const SPAWN_RING_MAX = 700;
const BASE_SPAWN_INTERVAL_MS = 2200;
const MIN_SPAWN_INTERVAL_MS = 500;
const SPAWN_INTERVAL_DECAY_MS = 170;
const SPAWN_INTERVAL_DECAY_EVERY_MS = 15000;
const BASE_SPAWN_BATCH_SIZE = 1;
const MAX_SPAWN_BATCH_SIZE = 4;
const SPAWN_BATCH_GROWTH_EVERY_MS = 30000;
const INITIAL_ENEMY_COUNT = 4;
const BASE_MAX_ENEMIES = 7;
const ENEMY_GROWTH_EVERY_MS = 20000;
const ENEMIES_PER_GROWTH_STEP = 3;
const ABSOLUTE_MAX_ENEMIES = 300;
const ENEMY_KILL_EXP = 30;
const ENEMY_SPAWN_WEIGHTS = [
    { type: "orc", weight: 95 },
    { type: "orc3", weight: 5 }
];
const BOSS_SPAWN_DELAY_MS = 5 * 60 * 1000;

const CONTACT_DAMAGE = 5;
const DAMAGE_COOLDOWN_MS = 500;
const DEATH_CINEMATIC_DURATION_MS = 3200;
const DEATH_FLASH_IN_MS = 420;
const DEATH_FLASH_HOLD_MS = 280;
const DEATH_FLASH_OUT_MS = 900;
const DEATH_FLASH_INTENSITY = 0.62;
const DEATH_STATUE_SCALE = 0.78;
const DEATH_STATUE1_OFFSET_X = 0;
const DEATH_STATUE1_OFFSET_Y = -0.04;
const SHOW_HITBOXES = false;
const isMap1 = window.location.pathname.replace(/\\/g, "/").endsWith("/template/map1.html");
const isVilleMap = window.location.pathname.replace(/\\/g, "/").endsWith("/template/ville.html");
const map1PortalZone = {
    x: 2270,
    y: 895,
    w: 2309 - 2270,
    h: 951 - 895
};
const DEV_TEST_COMBO_KEY = "b";
const nightmareStatueSprite0 = new Image();
nightmareStatueSprite0.src = "../assets/images/statue_cauchemar(0).png";
const nightmareStatueSprite1 = new Image();
nightmareStatueSprite1.src = "../assets/images/statue_cauchemar(1).png";
let isChangingMap = false;
let lastContactDamageAt = 0;
let lastProcessedLevel = playerController.player.level;
let gameStartAt = performance.now();
let lastSpawnAt = gameStartAt;
let killCount = 0;
let bossSpawned = false;
let bossDefeated = false;
let deathCinematic = {
    active: false,
    startAt: 0,
    onComplete: null
};

function getCssVar(name, fallback) {
    const value = getComputedStyle(canvas).getPropertyValue(name).trim();
    return value || fallback;
}

function getCssNumber(name, fallback) {
    const value = Number.parseFloat(getCssVar(name, String(fallback)));
    return Number.isFinite(value) ? value : fallback;
}

function readUiStyles() {
    return {
        hpBarWidth: getCssNumber("--hud-hp-bar-width", 200),
        hpBarHeight: getCssNumber("--hud-hp-bar-height", 20),
        hpOffsetLeft: getCssNumber("--hud-hp-offset-left", 20),
        hpOffsetBottom: getCssNumber("--hud-hp-offset-bottom", 40),
        barBorderPadding: getCssNumber("--hud-bar-border-padding", 2),
        barBackgroundColor: getCssVar("--hud-bar-background-color", "#555"),
        hpBorderColor: getCssVar("--hud-hp-border-color", "#000"),
        hpFillColor: getCssVar("--hud-hp-fill-color", "rgb(140, 16, 16)"),

        expBarWidth: getCssNumber("--hud-exp-bar-width", 500),
        expBarHeight: getCssNumber("--hud-exp-bar-height", 17),
        expOffsetTop: getCssNumber("--hud-exp-offset-top", 10),
        expBorderColor: getCssVar("--hud-exp-border-color", "#000"),
        expFillColor: getCssVar("--hud-exp-fill-color", "rgb(196, 138, 31)"),

        levelTextColor: getCssVar("--hud-level-text-color", "#fff"),
        levelFont: getCssVar("--hud-level-font", "bold 11px Arial"),

        killTextColor: getCssVar("--hud-kill-text-color", "#fff"),
        killFont: getCssVar("--hud-kill-font", "bold 20px Arial"),
        killOffsetRight: getCssNumber("--hud-kill-offset-right", 20),
        killOffsetTop: getCssNumber("--hud-kill-offset-top", 20),

        timerTextColor: getCssVar("--hud-timer-text-color", "#fff"),
        timerFont: getCssVar("--hud-timer-font", "bold 18px Arial"),
        timerOffsetRight: getCssNumber("--hud-timer-offset-right", 20),
        timerOffsetTop: getCssNumber("--hud-timer-offset-top", 50),

        hitboxPlayerColor: getCssVar("--hitbox-player-color", "#00ff00"),
        hitboxEnemyColor: getCssVar("--hitbox-enemy-color", "#ff0000"),

        perkOverlayBackdrop: getCssVar("--perk-overlay-backdrop", "rgba(0, 0, 0, 0.7)"),
        perkPanelBackground: getCssVar("--perk-panel-background", "rgba(24, 24, 24, 0.95)"),
        perkPanelBorderColor: getCssVar("--perk-panel-border-color", "#d4af37"),
        perkPanelBorderWidth: getCssNumber("--perk-panel-border-width", 2),
        perkTitleColor: getCssVar("--perk-title-color", "#f7e9ba"),
        perkTitleFont: getCssVar("--perk-title-font", "bold 28px Arial"),

        perkPanelMaxWidth: getCssNumber("--perk-panel-max-width", 900),
        perkPanelHeight: getCssNumber("--perk-panel-height", 260),
        perkPanelSideMargin: getCssNumber("--perk-panel-side-margin", 60),
        perkCardGap: getCssNumber("--perk-card-gap", 16),
        perkCardTopOffset: getCssNumber("--perk-card-top-offset", 70),
        perkCardHeight: getCssNumber("--perk-card-height", 160),

        perkCardBackground: getCssVar("--perk-card-background", "#2b2b2b"),
        perkCardBorderColor: getCssVar("--perk-card-border-color", "#8f7b3f"),
        perkNumberColor: getCssVar("--perk-number-color", "#f5d26a"),
        perkNumberFont: getCssVar("--perk-number-font", "bold 22px Arial"),
        perkNameColor: getCssVar("--perk-name-color", "#fff"),
        perkNameFont: getCssVar("--perk-name-font", "bold 18px Arial"),
        perkDescriptionColor: getCssVar("--perk-description-color", "#d1d1d1"),
        perkDescriptionFont: getCssVar("--perk-description-font", "15px Arial"),
        perkHintColor: getCssVar("--perk-hint-color", "#c0b080"),
        perkHintFont: getCssVar("--perk-hint-font", "bold 14px Arial")
    };
}

let uiStyles = readUiStyles();

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function formatElapsedTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function startDeathCinematic(onComplete) {
    if (deathCinematic.active) return;

    deathCinematic.active = true;
    deathCinematic.startAt = performance.now();
    deathCinematic.onComplete = onComplete;
}

function updateDeathCinematic(now) {
    if (!deathCinematic.active) return;

    const elapsed = now - deathCinematic.startAt;
    if (elapsed < DEATH_CINEMATIC_DURATION_MS) return;

    const callback = deathCinematic.onComplete;
    deathCinematic.active = false;
    deathCinematic.onComplete = null;
    if (typeof callback === "function") {
        callback();
    }
}

function drawDeathCinematicOverlay(now) {
    if (!deathCinematic.active) return;

    const elapsed = now - deathCinematic.startAt;
    const flashStartAt = 1200;
    const flashPhase1 = flashStartAt + DEATH_FLASH_IN_MS;
    const flashPhase2 = flashPhase1 + DEATH_FLASH_HOLD_MS;
    const flashPhase3 = flashPhase2 + DEATH_FLASH_OUT_MS;

    let whiteAlpha = 0;
    if (elapsed >= flashStartAt && elapsed <= flashPhase1) {
        whiteAlpha = clamp((elapsed - flashStartAt) / Math.max(1, DEATH_FLASH_IN_MS), 0, 1);
    } else if (elapsed <= flashPhase2) {
        whiteAlpha = 1;
    } else if (elapsed <= flashPhase3) {
        const fadeT = (elapsed - flashPhase2) / Math.max(1, DEATH_FLASH_OUT_MS);
        whiteAlpha = 1 - clamp(fadeT, 0, 1);
    }

    const statue0BaseAlpha = clamp(elapsed / 520, 0, 1);
    const statue1FadeIn = clamp((elapsed - flashPhase2) / 760, 0, 1);
    const statue0Alpha = statue0BaseAlpha * (1 - statue1FadeIn);
    const statue1Alpha = statue1FadeIn;

    const darkness = clamp((elapsed - 500) / 1200, 0, 1) * 0.45;

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${darkness.toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function drawFittedImage(image, alpha, offsetXRatio = 0, offsetYRatio = 0) {
        if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || alpha <= 0.001) {
            return false;
        }

        const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * DEATH_STATUE_SCALE;
        const drawW = image.naturalWidth * scale;
        const drawH = image.naturalHeight * scale;
        const drawX = (canvas.width - drawW) / 2 + offsetXRatio * canvas.width;
        const drawY = (canvas.height - drawH) / 2 + offsetYRatio * canvas.height;
        ctx.globalAlpha = alpha;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, drawX, drawY, drawW, drawH);
        return true;
    }

    if (statue0Alpha > 0.001 || statue1Alpha > 0.001) {
        const sprite0Ready = nightmareStatueSprite0.complete && nightmareStatueSprite0.naturalWidth > 0;
        const sprite1Ready = nightmareStatueSprite1.complete && nightmareStatueSprite1.naturalWidth > 0;

        if (sprite0Ready) {
            drawFittedImage(nightmareStatueSprite0, statue0Alpha, 0, 0);
        }

        if (sprite1Ready) {
            drawFittedImage(nightmareStatueSprite1, statue1Alpha, DEATH_STATUE1_OFFSET_X, DEATH_STATUE1_OFFSET_Y);
        }

        if (!sprite0Ready && !sprite1Ready) {
            const fallbackAlpha = Math.max(statue0Alpha, statue1Alpha);
            const size = Math.min(canvas.width, canvas.height) * 0.6;
            ctx.globalAlpha = fallbackAlpha;
            ctx.fillStyle = "rgba(245, 245, 245, 0.9)";
            ctx.beginPath();
            ctx.moveTo(canvas.width * 0.5 - size * 0.16, canvas.height * 0.5 + size * 0.24);
            ctx.lineTo(canvas.width * 0.5 + size * 0.16, canvas.height * 0.5 + size * 0.24);
            ctx.lineTo(canvas.width * 0.5 + size * 0.13, canvas.height * 0.5 - size * 0.12);
            ctx.arc(canvas.width * 0.5, canvas.height * 0.5 - size * 0.12, size * 0.13, 0, Math.PI, true);
            ctx.closePath();
            ctx.fill();
        }
    }

    if (whiteAlpha > 0.001) {
        ctx.globalAlpha = whiteAlpha * DEATH_FLASH_INTENSITY;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
}

function getRandomSpawnAroundPlayer(player) {
    const angle = Math.random() * Math.PI * 2;
    const radius = SPAWN_RING_MIN + Math.random() * (SPAWN_RING_MAX - SPAWN_RING_MIN);

    const rawX = player.x + Math.cos(angle) * radius;
    const rawY = player.y + Math.sin(angle) * radius;
    const margin = 32;

    return {
        x: clamp(rawX, margin, mapRenderer.MAP_WIDTH - margin),
        y: clamp(rawY, margin, mapRenderer.MAP_HEIGHT - margin)
    };
}

function pickWeightedEnemyType() {
    const totalWeight = ENEMY_SPAWN_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return "orc";

    let roll = Math.random() * totalWeight;
    for (const entry of ENEMY_SPAWN_WEIGHTS) {
        roll -= entry.weight;
        if (roll <= 0) {
            return entry.type;
        }
    }

    return ENEMY_SPAWN_WEIGHTS[ENEMY_SPAWN_WEIGHTS.length - 1].type;
}

function spawnEnemyNearPlayer() {
    const spawn = getRandomSpawnAroundPlayer(playerController.player);
    const enemyType = pickWeightedEnemyType();
    enemyControllers.push(createEnemyController(canvas, ctx, cameraController.camera, spawn.x, spawn.y, enemyType));
}

function spawnPnj(x, y) {
    pnjControllers.push(createpnjController(canvas, ctx, cameraController.camera, x, y));
}

function createBossController(startX, startY) {
    function normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    function loadFrames(folder, prefix, count) {
        const frames = [];
        for (let i = 1; i <= count; i++) {
            const frame = new Image();
            frame.src = `../assets/sprites/mino_v1.1_free/animations/${folder}/${prefix}_${i}.png`;
            frames.push(frame);
        }
        return frames;
    }

    const frames = {
        idle: loadFrames("idle", "idle", 16),
        walk: loadFrames("walk", "walk", 12),
        atk: loadFrames("atk_1", "atk_1", 16)
    };

    const enemy = {
        spawnX: startX,
        spawnY: startY,
        x: startX,
        y: startY,
        speed: 1.05,
        hp: 6000,
        maxhp: 6000,
        isBoss: true,
        hitW: 90,
        hitH: 90,
        state: "walk",
        frameIndex: 0,
        animCounter: 0,
        animSpeed: 8,
        facingAngle: 0,
        attackRange: 230,
        attackHalfAngle: Math.PI / 4,
        attackDamage: 52,
        attackCooldownMs: 1500,
        attackWindupMs: 700,
        attackDurationMs: 1300,
        attackQuickChance: 0.38,
        attackQuickReductionMinMs: 200,
        attackQuickReductionMaxMs: 300,
        currentAttackWindupMs: 700,
        currentAttackDurationMs: 1300,
        lastAttackAt: 0,
        isAttacking: false,
        attackStartedAt: 0,
        attackHitApplied: false,
        lockedAttackAngle: 0
    };

    function isPlayerInAttackCone(player) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > enemy.attackRange) return false;

        const angleToPlayer = Math.atan2(dy, dx);
        const delta = Math.abs(normalizeAngle(angleToPlayer - enemy.lockedAttackAngle));
        return delta <= enemy.attackHalfAngle;
    }

    function update(player) {
        if (enemy.hp <= 0) return;

        const previousState = enemy.state;

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0 && !enemy.isAttacking) {
            enemy.facingAngle = Math.atan2(dy, dx);
        }

        const now = performance.now();
        if (enemy.isAttacking) {
            enemy.state = "atk";
            const attackElapsed = now - enemy.attackStartedAt;

            if (!enemy.attackHitApplied && attackElapsed >= enemy.currentAttackWindupMs) {
                if (isPlayerInAttackCone(player)) {
                    player.hp = Math.max(0, player.hp - enemy.attackDamage);
                }
                enemy.attackHitApplied = true;
            }

            if (attackElapsed >= enemy.currentAttackDurationMs) {
                enemy.isAttacking = false;
                enemy.lastAttackAt = now;
                enemy.state = distance > 120 ? "walk" : "idle";
            }
        } else {
            const canStartAttack = distance <= enemy.attackRange && now - enemy.lastAttackAt >= enemy.attackCooldownMs;
            if (canStartAttack) {
                enemy.isAttacking = true;
                enemy.state = "atk";
                enemy.attackStartedAt = now;
                enemy.attackHitApplied = false;
                enemy.lockedAttackAngle = enemy.facingAngle;

                const useQuickAttack = Math.random() < enemy.attackQuickChance;
                const reductionMs = useQuickAttack
                    ? enemy.attackQuickReductionMinMs + Math.random() * (enemy.attackQuickReductionMaxMs - enemy.attackQuickReductionMinMs)
                    : 0;
                enemy.currentAttackDurationMs = Math.max(900, enemy.attackDurationMs - reductionMs);
                enemy.currentAttackWindupMs = Math.max(350, enemy.attackWindupMs - reductionMs * 0.6);

                enemy.frameIndex = 0;
                enemy.animCounter = 0;
            } else if (distance > 120) {
                enemy.state = "walk";
                if (distance > 0) {
                    enemy.x += (dx / distance) * enemy.speed;
                    enemy.y += (dy / distance) * enemy.speed;
                }
            } else {
                enemy.state = "idle";
            }
        }

        if (enemy.state !== previousState) {
            enemy.frameIndex = 0;
            enemy.animCounter = 0;
        }

        enemy.animCounter++;
        if (enemy.animCounter >= enemy.animSpeed) {
            enemy.animCounter = 0;
            const currentFrames = frames[enemy.state];
            enemy.frameIndex = (enemy.frameIndex + 1) % currentFrames.length;
        }
    }

    function draw() {
        const currentFrames = frames[enemy.state];
        const sprite = currentFrames[enemy.frameIndex] || currentFrames[0];
        if (!sprite) return;
        const size = 330 * cameraController.camera.zoom;
        const centerX = (enemy.x - cameraController.camera.x) * cameraController.camera.zoom;
        const centerY = (enemy.y - cameraController.camera.y) * cameraController.camera.zoom;

        if (enemy.isAttacking) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(
                centerX,
                centerY,
                enemy.attackRange * cameraController.camera.zoom,
                enemy.lockedAttackAngle - enemy.attackHalfAngle,
                enemy.lockedAttackAngle + enemy.attackHalfAngle
            );
            ctx.closePath();
            ctx.fillStyle = enemy.attackHitApplied ? "rgba(220, 40, 40, 0.18)" : "rgba(255, 60, 60, 0.3)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 100, 100, 0.8)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        const drawX = (enemy.x - cameraController.camera.x) * cameraController.camera.zoom - size / 2;
        const drawY = (enemy.y - cameraController.camera.y) * cameraController.camera.zoom - size / 2;
        ctx.drawImage(sprite, drawX, drawY, size, size);
    }

    return { enemy, update, draw };
}

function spawnBossNearPlayer() {
    const spawn = getRandomSpawnAroundPlayer(playerController.player);
    enemyControllers.push(createBossController(spawn.x, spawn.y));
}

function activateDevBossTestMode() {
    if (!isMap1) return;

    if (typeof playerController.applyDevTestLoadout === "function") {
        playerController.applyDevTestLoadout();
    }

    let hasAliveBoss = false;
    for (let i = enemyControllers.length - 1; i >= 0; i--) {
        const enemy = enemyControllers[i].enemy;
        if (enemy && enemy.isBoss && enemy.hp > 0) {
            hasAliveBoss = true;
            continue;
        }
        if (enemy && !enemy.isBoss) {
            enemyControllers.splice(i, 1);
        }
    }

    if (!hasAliveBoss) {
        spawnBossNearPlayer();
    }

    bossSpawned = true;
    bossDefeated = false;
    lastSpawnAt = performance.now();
}

function getMaxEnemyCount(now) {
    const elapsed = now - gameStartAt;
    const growthSteps = Math.floor(elapsed / ENEMY_GROWTH_EVERY_MS);
    return Math.min(ABSOLUTE_MAX_ENEMIES, BASE_MAX_ENEMIES + growthSteps * ENEMIES_PER_GROWTH_STEP);
}

function getAliveBossEnemy() {
    for (const enemyController of enemyControllers) {
        const enemy = enemyController.enemy;
        if (!enemy || !enemy.isBoss || enemy.hp <= 0) continue;
        return enemy;
    }
    return null;
}

function drawBossHealthBar(bossEnemy) {
    if (!bossEnemy) return;

    const hpRatio = clamp(bossEnemy.hp / Math.max(1, bossEnemy.maxhp), 0, 1);
    const uiReady = bossHpUnderSprite.complete && bossHpProgressSprite.complete && bossHpOverSprite.complete &&
        bossHpUnderSprite.naturalWidth > 0 && bossHpProgressSprite.naturalWidth > 0 && bossHpOverSprite.naturalWidth > 0;

    const targetWidth = Math.min(canvas.width * 0.31, 380);
    const targetHeight = targetWidth * (bossHpUnderSprite.naturalHeight / Math.max(1, bossHpUnderSprite.naturalWidth));
    const x = (canvas.width - targetWidth) / 2;
    const y = 14;

    if (uiReady) {
        ctx.drawImage(bossHpUnderSprite, x, y, targetWidth, targetHeight);

        const fullSourceWidth = bossHpProgressSprite.naturalWidth;
        const sourceHeight = bossHpProgressSprite.naturalHeight;
        const filledSourceWidth = Math.max(0, Math.floor(fullSourceWidth * hpRatio));
        const progressInset = Math.max(3, Math.round(targetHeight * 0.09));
        const progressX = Math.round(x + progressInset);
        const progressY = Math.round(y + progressInset);
        const progressW = Math.max(0, Math.floor(targetWidth - progressInset * 2));
        const progressH = Math.max(0, Math.floor(targetHeight - progressInset * 2));
        const safetyPx = 2;
        const maxFillWidth = Math.max(0, progressW - safetyPx);
        const filledTargetWidth = Math.max(0, Math.floor(maxFillWidth * hpRatio));

        if (filledSourceWidth > 0 && filledTargetWidth > 0 && progressH > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(progressX, progressY, Math.max(0, progressW - safetyPx), progressH);
            ctx.clip();
            ctx.drawImage(
                bossHpProgressSprite,
                0,
                0,
                filledSourceWidth,
                sourceHeight,
                progressX,
                progressY,
                filledTargetWidth,
                progressH
            );
            ctx.restore();
        }

        ctx.drawImage(bossHpOverSprite, x, y, targetWidth, targetHeight);
    } else {
        const fallbackH = 24;
        const fallbackY = y + (targetHeight - fallbackH) / 2;
        ctx.fillStyle = "rgba(35, 12, 12, 0.9)";
        ctx.fillRect(x, fallbackY, targetWidth, fallbackH);
        ctx.fillStyle = "rgba(196, 56, 56, 0.95)";
        ctx.fillRect(x, fallbackY, targetWidth * hpRatio, fallbackH);
        ctx.strokeStyle = "rgba(240, 205, 120, 0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, fallbackY, targetWidth, fallbackH);
    }

}

function getSpawnInterval(now) {
    const elapsed = now - gameStartAt;
    const decaySteps = Math.floor(elapsed / SPAWN_INTERVAL_DECAY_EVERY_MS);
    return Math.max(MIN_SPAWN_INTERVAL_MS, BASE_SPAWN_INTERVAL_MS - decaySteps * SPAWN_INTERVAL_DECAY_MS);
}

function getSpawnBatchSize(now) {
    const elapsed = now - gameStartAt;
    const growthSteps = Math.floor(elapsed / SPAWN_BATCH_GROWTH_EVERY_MS);
    return Math.min(MAX_SPAWN_BATCH_SIZE, BASE_SPAWN_BATCH_SIZE + growthSteps);
}

function givePlayerExp(amount) {
    playerController.player.exp += amount;
    while (playerController.player.exp >= playerController.player.maxExp) {
        playerController.player.exp -= playerController.player.maxExp;
        playerController.player.level += 1;
        playerController.player.maxExp += playerController.player.maxExp * 0.2;
    }
}

for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
    if (!isMap1) break;
    spawnEnemyNearPlayer();
}

// SPAWN DES PNJ statiques (uniquement dans la ville)
if (isVilleMap) {
    spawnPnj(1700, 2000);
    spawnPnj(2200, 1250);
    spawnPnj(2200, 2250);
    spawnPnj(1975, 2500);
    spawnPnj(1350, 2375);
    spawnPnj(3150, 1225);
    spawnPnj(2875, 2950);
}

window.addEventListener("keydown", (e) => {
    if (!playerController.hasPendingPerks()) return;

    if (e.key === "1" || e.key === "2" || e.key === "3") {
        const perkIndex = Number(e.key) - 1;
        const applied = playerController.applyPerkByIndex(perkIndex);
        if (applied) {
            e.preventDefault();
        }
    }
});

window.addEventListener("keydown", (e) => {
    const key = String(e.key || "").toLowerCase();
    if (!(e.ctrlKey && e.shiftKey && key === DEV_TEST_COMBO_KEY)) return;

    e.preventDefault();
    activateDevBossTestMode();
});

canvas.addEventListener("click", (e) => {
    const choices = playerController.getCurrentPerkChoices();
    if (!choices) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const clickX = (e.clientX - canvasRect.left) * scaleX;
    const clickY = (e.clientY - canvasRect.top) * scaleY;

    const layout = getPerkOverlayLayout(choices.length);
    if (!layout) return;

    for (let i = 0; i < layout.cards.length; i++) {
        const card = layout.cards[i];
        const insideX = clickX >= card.x && clickX <= card.x + card.w;
        const insideY = clickY >= card.y && clickY <= card.y + card.h;
        if (!insideX || !insideY) continue;

        const applied = playerController.applyPerkByIndex(i);
        if (applied) e.preventDefault();
        break;
    }
});

function getEntityHitbox(entity) {
    return {
        x: entity.x - entity.hitW / 2,
        y: entity.y - entity.hitH / 2,
        w: entity.hitW,
        h: entity.hitH
    };
}

function isRectOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

window.addEventListener("resize", () => {
    resizeCanvas();
    cameraController.clamp();
    uiStyles = readUiStyles();
});

// Boucle du jeu
function loop() {
    const now = performance.now();
    updateDeathCinematic(now);

    const canUpdateWorld = !playerController.hasPendingPerks() && !deathCinematic.active;

    // ── UPDATES ──────────────────────────────────────────
    if (canUpdateWorld) {
        const enemies = isMap1 ? enemyControllers.map((c) => c.enemy) : [];
        playerController.update(enemies);
    }

    if (canUpdateWorld && isMap1) {
        if (!bossSpawned && !bossDefeated && now - gameStartAt >= BOSS_SPAWN_DELAY_MS) {
            spawnBossNearPlayer();
            bossSpawned = true;

            for (let i = enemyControllers.length - 1; i >= 0; i--) {
                if (enemyControllers[i].enemy.isBoss) continue;
                enemyControllers.splice(i, 1);
            }
        }

        const maxEnemies = getMaxEnemyCount(now);
        const spawnInterval = getSpawnInterval(now);
        const spawnBatchSize = getSpawnBatchSize(now);

        if (!bossSpawned && enemyControllers.length < maxEnemies && now - lastSpawnAt >= spawnInterval) {
            const availableSlots = maxEnemies - enemyControllers.length;
            const spawnCount = Math.min(spawnBatchSize, availableSlots);
            for (let i = 0; i < spawnCount; i++) spawnEnemyNearPlayer();
            lastSpawnAt = now;
        }

        for (const ec of enemyControllers) ec.update(playerController.player);

        let bossDiedThisFrame = false;
        for (let i = enemyControllers.length - 1; i >= 0; i--) {
            if (enemyControllers[i].enemy.hp > 0) continue;

            const deadEnemy = enemyControllers[i].enemy;
            if (deadEnemy.isBoss) {
                bossDiedThisFrame = true;
            } else {
                const deadX = deadEnemy.x;
                const deadY = deadEnemy.y;
                const potionDropChance = deadEnemy.type === "orc3"
                    ? ORC3_POTION_DROP_CHANCE
                    : ORC_POTION_DROP_CHANCE;

                if (Math.random() < potionDropChance) {
                    potions.push({
                        x: deadX,
                        y: deadY,
                        w: 32,
                        h: 32,
                        healAmount: POTION_HEAL_AMOUNT
                    });
                }
            }
            enemyControllers.splice(i, 1);
            killCount += 1;
            givePlayerExp(ENEMY_KILL_EXP);
        }

        if (bossDiedThisFrame) {
            bossSpawned = false;
            bossDefeated = true;
            lastSpawnAt = now;
            if (!isChangingMap) {
                isChangingMap = true;
                window.location.href = "map2.html";
                return;
            }
        }
    }

    // UPDATE des PNJ (pas de draw ici !)
    if (canUpdateWorld) {
        for (const pnj of pnjControllers) pnj.update();
    }

    if (playerController.player.level > lastProcessedLevel) {
        const gainedLevels = playerController.player.level - lastProcessedLevel;
        playerController.queuePerkChoices(gainedLevels);
        lastProcessedLevel = playerController.player.level;
    }

    const playerHitbox = getEntityHitbox(playerController.player);

    if (canUpdateWorld) {
        for (let i = potions.length - 1; i >= 0; i--) {
            const potion = potions[i];
            const potionHitbox = {
                x: potion.x - potion.w / 2,
                y: potion.y - potion.h / 2,
                w: potion.w,
                h: potion.h
            };

            if (!isRectOverlap(playerHitbox, potionHitbox)) continue;

            playerController.player.hp = Math.min(
                playerController.player.maxHp,
                playerController.player.hp + potion.healAmount
            );
            potions.splice(i, 1);
        }
    }

    if (isVilleMap && !isChangingMap && isRectOverlap(playerHitbox, map1PortalZone)) {
        isChangingMap = true;
        window.location.href = "map1.html";
        return;
    }

    if (canUpdateWorld) {
        let touchingEnemy = false;
        let contactDamage = CONTACT_DAMAGE;
        for (const ec of enemyControllers) {
            if (ec.enemy.isBoss) continue;
            if (!isRectOverlap(playerHitbox, getEntityHitbox(ec.enemy))) continue;
            touchingEnemy = true;
            contactDamage = Math.max(contactDamage, ec.enemy.contactDamage || CONTACT_DAMAGE);
        }
        if (touchingEnemy) {
            const now = performance.now();
            if (now - lastContactDamageAt >= DAMAGE_COOLDOWN_MS) {
                playerController.player.hp = Math.max(0, playerController.player.hp - contactDamage);
                playerController.triggerHurt();
                lastContactDamageAt = now;
            }
        }
    }

    if (playerController.player.hp <= 0) {
        startDeathCinematic(() => {
            if (!isVilleMap && !isChangingMap) {
                isChangingMap = true;
                window.location.href = "ville.html";
                return;
            }
            playerController.player.x = playerController.player.spawnX;
            playerController.player.y = playerController.player.spawnY;
            playerController.player.hp = playerController.player.maxHp;
            lastContactDamageAt = performance.now();
        });
    }

    // CAMERA
    cameraController.centerOn(playerController.player.x, playerController.player.y);

    // Nettoyer le canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // FOND = MAP
    mapRenderer.draw(cameraController.camera);
     // PNJ
        for (const pnj of pnjControllers) {
            pnj.draw();
        }

    // JOUEUR
    playerController.draw();

    // ATTAQUES
    playerController.drawAttacks();

    // POTIONS (dessinees avant les ennemis => derriere eux)
    for (const potion of potions) {
        const size = 55 * cameraController.camera.zoom;
        const drawX = (potion.x - cameraController.camera.x) * cameraController.camera.zoom - size / 2;
        const drawY = (potion.y - cameraController.camera.y) * cameraController.camera.zoom - size / 2;

        if (potionSprite.complete) {
            ctx.drawImage(
                potionSprite,
                drawX,
                drawY,
                size,
                size
            );
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(drawX, drawY, size, size);
        }
    }

    // ENNEMIS
    for (const enemyController of enemyControllers) {
        enemyController.draw();
    }

    if (window.drawCollidersOverlay) {
        window.drawCollidersOverlay(ctx, cameraController.camera, cameraController.camera.zoom);
    }

    // HITBOX DEBUG
    if (SHOW_HITBOXES) {
        ctx.save();
        ctx.lineWidth = 2;

        const pX = (playerHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
        const pY = (playerHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
        const pW = playerHitbox.w * cameraController.camera.zoom;
        const pH = playerHitbox.h * cameraController.camera.zoom;
        ctx.strokeStyle = uiStyles.hitboxPlayerColor;
        ctx.strokeRect(pX, pY, pW, pH);

        ctx.strokeStyle = uiStyles.hitboxEnemyColor;
        for (const enemyController of enemyControllers) {
            const enemyHitbox = getEntityHitbox(enemyController.enemy);
            const eX = (enemyHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
            const eY = (enemyHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
            const eW = enemyHitbox.w * cameraController.camera.zoom;
            const eH = enemyHitbox.h * cameraController.camera.zoom;
            ctx.strokeRect(eX, eY, eW, eH);
        }

        ctx.restore();
    }

    // HUD - PV a gauche, aligne sur le meme niveau que l'XP
    const hudBottomY = canvas.height - uiStyles.expOffsetTop;
    const expBarHeight = uiStyles.expBarHeight;
    const barX = uiStyles.hpOffsetLeft;
    const barY = hudBottomY - expBarHeight;
    const barWidth = uiStyles.hpBarWidth;
    const barHeight = uiStyles.hpBarHeight;
    const hpRatio = playerController.player.hp / playerController.player.maxHp;

    ctx.fillStyle = uiStyles.hpBorderColor;
    ctx.fillRect(
        barX - uiStyles.barBorderPadding,
        barY - uiStyles.barBorderPadding,
        barWidth + uiStyles.barBorderPadding * 2,
        barHeight + uiStyles.barBorderPadding * 2
    );
    ctx.fillStyle = uiStyles.barBackgroundColor;
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = uiStyles.hpFillColor;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    ctx.fillStyle = uiStyles.levelTextColor;
    ctx.font = uiStyles.levelFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${playerController.player.hp}/${playerController.player.maxHp}`, barX + barWidth / 2, barY + barHeight / 2);

    // HUD - Barre d'experience (bas centre)
    const expBarWidth = uiStyles.expBarWidth;
    const expBarX = (canvas.width / 2) - (expBarWidth / 2);
    const expBarY = hudBottomY - expBarHeight;
    const expRatio = playerController.player.exp / playerController.player.maxExp;

    ctx.fillStyle = uiStyles.expBorderColor;
    ctx.fillRect(
        expBarX - uiStyles.barBorderPadding,
        expBarY - uiStyles.barBorderPadding,
        expBarWidth + uiStyles.barBorderPadding * 2,
        expBarHeight + uiStyles.barBorderPadding * 2
    );
    ctx.fillStyle = uiStyles.barBackgroundColor;
    ctx.fillRect(expBarX, expBarY, expBarWidth, expBarHeight);
    ctx.fillStyle = uiStyles.expFillColor;
    ctx.fillRect(expBarX, expBarY, expBarWidth * expRatio, expBarHeight);

    ctx.fillStyle = uiStyles.levelTextColor;
    ctx.font = uiStyles.levelFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`level : ${playerController.player.level}`, canvas.width / 2, expBarY + expBarHeight / 2);

    // HUD (Kills)
    ctx.fillStyle = uiStyles.killTextColor;
    ctx.font = uiStyles.killFont;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`Kills : ${killCount}`, canvas.width - uiStyles.killOffsetRight, uiStyles.killOffsetTop);

    if (isMap1) {
        const elapsedTime = formatElapsedTime(performance.now() - gameStartAt);
        ctx.fillStyle = uiStyles.timerTextColor;
        ctx.font = uiStyles.timerFont;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(`Temps : ${elapsedTime}`, canvas.width - uiStyles.timerOffsetRight, uiStyles.timerOffsetTop);

        const aliveBoss = getAliveBossEnemy();
        if (aliveBoss) {
            drawBossHealthBar(aliveBoss);
        }
    }

    const perkChoices = playerController.getCurrentPerkChoices();
    if (perkChoices) {
        drawPerkOverlay(perkChoices);
    }

    drawDeathCinematicOverlay(now);

    requestAnimationFrame(loop);
}

function getPerkOverlayLayout(choiceCount) {
    if (!choiceCount || choiceCount <= 0) return null;

    const panelWidth = Math.min(uiStyles.perkPanelMaxWidth, canvas.width - uiStyles.perkPanelSideMargin);
    const panelHeight = uiStyles.perkPanelHeight;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    const gap = uiStyles.perkCardGap;
    const cardY = panelY + uiStyles.perkCardTopOffset;
    const cardHeight = uiStyles.perkCardHeight;
    const cardWidth = (panelWidth - (gap * (choiceCount + 1))) / choiceCount;
    const cards = [];

    for (let i = 0; i < choiceCount; i++) {
        cards.push({
            x: panelX + gap + i * (cardWidth + gap),
            y: cardY,
            w: cardWidth,
            h: cardHeight
        });
    }

    return {
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        cards
    };
}

function drawPerkOverlay(choices) {
    const layout = getPerkOverlayLayout(choices.length);
    if (!layout) return;

    const panelWidth = layout.panelWidth;
    const panelHeight = layout.panelHeight;
    const panelX = layout.panelX;
    const panelY = layout.panelY;

    ctx.save();

    ctx.fillStyle = uiStyles.perkOverlayBackdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = uiStyles.perkPanelBackground;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = uiStyles.perkPanelBorderColor;
    ctx.lineWidth = uiStyles.perkPanelBorderWidth;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = uiStyles.perkTitleColor;
    ctx.font = uiStyles.perkTitleFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Choisis un perk", canvas.width / 2, panelY + 18);

    for (let i = 0; i < choices.length; i++) {
        const card = layout.cards[i];
        const cardX = card.x;
        const cardY = card.y;
        const cardWidth = card.w;
        const cardHeight = card.h;
        const perk = choices[i];

        ctx.fillStyle = uiStyles.perkCardBackground;
        ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
        ctx.strokeStyle = uiStyles.perkCardBorderColor;
        ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

        ctx.fillStyle = uiStyles.perkNumberColor;
        ctx.font = uiStyles.perkNumberFont;
        ctx.textAlign = "left";
        ctx.fillText(`${i + 1}`, cardX + 12, cardY + 10);

        ctx.fillStyle = uiStyles.perkNameColor;
        ctx.font = uiStyles.perkNameFont;
        ctx.fillText(perk.name, cardX + 12, cardY + 46);

        ctx.fillStyle = uiStyles.perkDescriptionColor;
        ctx.font = uiStyles.perkDescriptionFont;
        ctx.fillText(perk.description, cardX + 12, cardY + 82);

        ctx.fillStyle = uiStyles.perkHintColor;
        ctx.font = uiStyles.perkHintFont;
        ctx.fillText(`Touche ${i + 1}`, cardX + 12, cardY + 124);
    }

    ctx.restore();
}

loop();