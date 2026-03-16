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
const playerController = createPlayerController(canvas, ctx, cameraController.camera);
const enemyController = createEnemyController(canvas, ctx, cameraController.camera);

// Quand la fenêtre change de taille, je redimensionne le canvas et clamp la caméra.
window.addEventListener("resize", () => {
    resizeCanvas();
    cameraController.clamp();
});

// La boucle principale du jeu : update et draw à chaque frame.
function loop() {
    playerController.update();
    enemyController.update(playerController.player);

    // Mettre à jour la caméra (centrer sur le joueur)
    cameraController.centerOn(playerController.player.x, playerController.player.y);

    // FOND = MAP
    mapRenderer.draw(cameraController.camera);

    // JOUEUR
    playerController.draw();

    // ENNEMI
    enemyController.draw();

    requestAnimationFrame(loop);
}
loop();