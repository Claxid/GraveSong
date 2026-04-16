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
const playerController = createPlayerController(canvas, ctx, cameraController.camera, {
    width: mapRenderer.MAP_WIDTH,
    height: mapRenderer.MAP_HEIGHT
});
runtimeLogger.success("Controles principaux initialises", {
    mapWidth: mapRenderer.MAP_WIDTH,
    mapHeight: mapRenderer.MAP_HEIGHT
});
const enemyControllers = [];
const potions = [];
const pnjControllers = [];
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
let teleportCinematic = {
    active: false,
    startAt: 0,
    targetHref: null
};

let uiStyles = readUiStyles();

// Boucle du jeu
// Loop extracted to js/jeu/map1/game-loop.js

function getPerkOverlayLayout(choiceCount) {
    return window.GamePerkOverlay.getLayout(canvas, uiStyles, choiceCount);
}

function drawPerkOverlay(choices) {
    window.GamePerkOverlay.draw(ctx, canvas, uiStyles, choices);
}

try {
    runtimeLogger.trackStep("setupMap1Runtime", () => setupMap1Runtime());
    runtimeLogger.trackStep("Boucle map1", () => loop());
} catch (err) {
    runtimeLogger.error("Echec demarrage map1", err);
}