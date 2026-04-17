// Boucle principale du jeu
// Fichier principal du jeu avec boucle, canvas, etc.

const runtimeLogger = window.GameRuntimeLogger || {
    info: () => {},
    success: () => {},
    error: () => {},
    trackStep: (_, fn) => fn()
};

// CANVAS PLEIN ECRAN + RESPONSIVE
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
runtimeLogger.success("Canvas initialise", { width: canvas.width, height: canvas.height });

// Ajuste la taille du canvas à la taille de l'écran
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
runtimeLogger.success("Canvas resize applique", { width: canvas.width, height: canvas.height });

// Je crée les contrôleurs pour la map, la caméra, le joueur et l'ennemi.
const mapRenderer = createMapRenderer(canvas, ctx);
const cameraController = createCameraController(canvas, mapRenderer.MAP_WIDTH, mapRenderer.MAP_HEIGHT);
const playerController = createPlayerController(canvas, ctx, cameraController.camera);
if (typeof playerController.loadPersistentProgress === "function") {
    const loaded = playerController.loadPersistentProgress();
    if (loaded) {
        runtimeLogger.success("Progression chargee (map2)");
    }
}
runtimeLogger.success("Controles principaux initialises", {
    mapWidth: mapRenderer.MAP_WIDTH,
    mapHeight: mapRenderer.MAP_HEIGHT
});
const enemyControllers = [];
const potions = [];
const bossHpUnderSprite = new Image();
runtimeLogger.trackStep("Boss HP Under sprite load", () => {
    bossHpUnderSprite.src = "../assets/sprites/mino_v1.1_free/bonus_mino_healthbar_UI/mino_health_under.png";
});
const bossHpProgressSprite = new Image();
runtimeLogger.trackStep("Boss HP Progress sprite load", () => {
    bossHpProgressSprite.src = "../assets/sprites/mino_v1.1_free/bonus_mino_healthbar_UI/mino_health_progress.png";
});
const bossHpOverSprite = new Image();
runtimeLogger.trackStep("Boss HP Over sprite load", () => {
    bossHpOverSprite.src = "../assets/sprites/mino_v1.1_free/bonus_mino_healthbar_UI/mino_health_over.png";
});
const bossHealthBarSprites = {
    under: bossHpUnderSprite,
    progress: bossHpProgressSprite,
    over: bossHpOverSprite
};
const victoryParchmentSprite = new Image();
runtimeLogger.trackStep("Victory parchment sprite load", () => {
    victoryParchmentSprite.src = "../assets/images/parchemin.webp";
});

const GOBELIN_POTION_DROP_CHANCE = 0.02;
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
const INITIAL_ENEMY_COUNT = 0;
const MAP2_ENEMY_WARMUP_STEP_MS = 3500;
const BASE_MAX_ENEMIES = 7;
const ENEMY_GROWTH_EVERY_MS = 20000;
const ENEMIES_PER_GROWTH_STEP = 3;
const ABSOLUTE_MAX_ENEMIES = 300;
const ENEMY_KILL_EXP = 38;
const MAP2_BOSS_SPAWN_DELAY_MS = 5 * 60 * 1000;
const ENEMY_SPAWN_WEIGHTS_MAP2 = [
    { type: "flower-wolf", weight: 5 },
    { type: "slime2", weight: 95 }
];
const DEV_TEST_COMBO_KEY = "b";

const CONTACT_DAMAGE = 5;
const DAMAGE_COOLDOWN_MS = 500;
const DEATH_CINEMATIC_DURATION_MS = 3200;
const DEATH_FLASH_IN_MS = 420;
const DEATH_FLASH_HOLD_MS = 280;
const DEATH_FLASH_OUT_MS = 900;
const DEATH_FLASH_INTENSITY = 0.62;
const DEATH_STATUE_SCALE = 1;
const DEATH_STATUE1_OFFSET_X = 0;
const DEATH_STATUE1_OFFSET_Y = -0.04;
const TELEPORT_CINEMATIC_DURATION_MS = 1300;
const TELEPORT_FLASH_IN_MS = 220;
const TELEPORT_FLASH_HOLD_MS = 260;
const TELEPORT_FLASH_OUT_MS = 520;
const TELEPORT_GLOW_INTENSITY = 0.7;
const BOSS_DEATH_TO_END_CINEMATIC_DELAY_MS = 1200;
const GAME_FINISH_HOLD_MS = 1800;
const SHOW_HITBOXES = false;
const isMap1 = window.location.pathname.replace(/\\/g, "/").endsWith("/template/map2.html");
const isVilleMap = window.location.pathname.replace(/\\/g, "/").endsWith("/template/ville.html");
const map2PortalZone = {
    x: 2270,
    y: 895,
    w: 39,
    h: 56,
};
let isChangingMap = false;
let lastContactDamageAt = 0;
let lastProcessedLevel = playerController.player.level;
let gameStartAt = performance.now();
let lastSpawnAt = gameStartAt;
let killCount = 0;
let fireKnightBoss = null;
let bossSpawned = false;
let bossDefeated = false;
let bossDefeatedAt = 0;
let bossDeathAnimationCompletedAt = 0;
let gameFinished = false;
let gameFinishedAt = 0;
let lastBossDamageAt = 0;
let deathCinematic = {
    active: false,
    startAt: 0,
    onComplete: null
};
let teleportCinematic = {
    active: false,
    startAt: 0,
    targetHref: null
};

let uiStyles = readUiStyles();

window.addEventListener("beforeunload", () => {
    if (typeof playerController.savePersistentProgress === "function") {
        playerController.savePersistentProgress();
    }
});

function pickWeightedMap2EnemyType() {
    const totalWeight = ENEMY_SPAWN_WEIGHTS_MAP2.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return "slime2";

    let roll = Math.random() * totalWeight;
    for (const entry of ENEMY_SPAWN_WEIGHTS_MAP2) {
        roll -= entry.weight;
        if (roll <= 0) {
            return entry.type;
        }
    }

    return ENEMY_SPAWN_WEIGHTS_MAP2[ENEMY_SPAWN_WEIGHTS_MAP2.length - 1].type;
}

function getMap2WarmupEnemyCap(now) {
    const elapsed = Math.max(0, now - gameStartAt);
    return Math.min(BASE_MAX_ENEMIES, Math.floor(elapsed / MAP2_ENEMY_WARMUP_STEP_MS));
}

function spawnEnemyNearPlayer() {
    const spawn = getRandomSpawnAroundPlayer(playerController.player);
    const enemyType = pickWeightedMap2EnemyType();
    enemyControllers.push(createEnemyController(canvas, ctx, cameraController.camera, spawn.x, spawn.y, enemyType));
}

for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
    if (!isMap1) break;
    spawnEnemyNearPlayer();
}
runtimeLogger.success("Spawn initial termine", { enemyCount: enemyControllers.length });

function spawnBossNearPlayer() {
    if (typeof window.Map2BossSystem === "undefined") return false;

    // Boss phase: remove regular mobs so the fight stays focused.
    enemyControllers.length = 0;

    const spawn = getRandomSpawnAroundPlayer(playerController.player);
    fireKnightBoss = window.Map2BossSystem.createFireKnightBoss(spawn.x, spawn.y, ctx, cameraController.camera);
    bossSpawned = true;
    bossDefeated = false;
    runtimeLogger.success("Fire Knight Boss spawn", { x: Math.round(spawn.x), y: Math.round(spawn.y) });
    return true;
}

function activateDevBossTestMode() {
    if (!isMap1) return;

    if (typeof playerController.applyDevTestLoadout === "function") {
        playerController.applyDevTestLoadout();
    }
    if (typeof playerController.setLifeLeechLevel === "function") {
        playerController.setLifeLeechLevel(40);
    }

    if (!fireKnightBoss || !fireKnightBoss.boss || fireKnightBoss.boss.hp <= 0) {
        spawnBossNearPlayer();
    }

    bossSpawned = true;
    bossDefeated = false;
    lastSpawnAt = performance.now();
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
        if (applied) {
            e.preventDefault();
        }
        break;
    }
});

function getEntityHitbox(entity) {
    return window.GameCollisionUtils.getEntityHitbox(entity);
}

function isRectOverlap(a, b) {
    return window.GameCollisionUtils.isRectOverlap(a, b);
}

window.addEventListener("resize", () => {
    resizeCanvas();
    cameraController.clamp();
    uiStyles = readUiStyles();
});

// La boucle principale du jeu : update et draw à chaque frame.
// Loop extracted to js/jeu/map2/game-loop.js

function getPerkOverlayLayout(choiceCount) {
    return window.GamePerkOverlay.getLayout(canvas, uiStyles, choiceCount);
}

function drawPerkOverlay(choices) {
    window.GamePerkOverlay.draw(ctx, canvas, uiStyles, choices);
}

try {
    runtimeLogger.trackStep("Boucle map2", () => loop());
} catch (err) {
    runtimeLogger.error("Echec demarrage map2", err);
}