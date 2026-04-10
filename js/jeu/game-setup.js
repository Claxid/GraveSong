// Initialisation du jeu
// Configuration du canvas, contrôleurs principaux et constantes

console.log("📝 game-init.js chargé");

// CANVAS PLEIN ECRAN + RESPONSIVE
const canvas = document.getElementById("game");
console.log("Canvas element:", canvas);

const ctx = canvas.getContext("2d");
console.log("Canvas context:", ctx);

// Ajuste la taille du canvas à la taille de l'écran
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// CONSTANTES DU JEU
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

const CONTACT_DAMAGE = 5;
const DAMAGE_COOLDOWN_MS = 500;
const SHOW_HITBOXES = false;
const isMap1 = window.location.pathname.replace(/\\/g, "/").endsWith("/template/map1.html");
const isVilleMap = window.location.pathname.replace(/\\/g, "/").endsWith("/template/ville.html");
const map1PortalZone = {
    x: 2270,
    y: 895,
    w: 2309 - 2270,
    h: 951 - 895
};

// VARIABLES GLOBALES
let isChangingMap = false;
let lastContactDamageAt = 0;
let lastProcessedLevel = 1;
let gameStartAt = performance.now();
let lastSpawnAt = gameStartAt;
let killCount = 0;

// CONTRÔLEURS
let mapRenderer;
let cameraController;
let playerController;
const enemyControllers = [];
const pnjControllers = [];

// INITIALISATION
function initGame() {
    console.log("🚀 Initialisation du jeu...");

    resizeCanvas();

    // Je crée les contrôleurs pour la map, la caméra, le joueur et l'ennemi.
    console.log("✅ Création du mapRenderer...");
    mapRenderer = createMapRenderer(canvas, ctx);
    console.log("✅ mapRenderer créé:", mapRenderer);

    console.log("✅ Création du cameraController...");
    cameraController = createCameraController(canvas, mapRenderer.MAP_WIDTH, mapRenderer.MAP_HEIGHT);
    console.log("✅ cameraController créé:", cameraController);

    console.log("✅ Création du playerController...");
    playerController = createPlayerController(canvas, ctx, cameraController.camera, isMap1);
    console.log("✅ playerController créé:", playerController);

    lastProcessedLevel = playerController.player.level;

    console.log("🎮 Jeu initialisé !");
}