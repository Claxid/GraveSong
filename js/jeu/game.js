// CANVAS PLEIN ECRAN + RESPONSIVE
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Ajuste la taille du canvas à la taille de l'écran
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

const mapRenderer = createMapRenderer(canvas, ctx);
const cameraController = createCameraController(canvas, mapRenderer.MAP_WIDTH, mapRenderer.MAP_HEIGHT);
const playerController = createPlayerController(canvas, ctx, cameraController.camera);

window.addEventListener("resize", () => {
    resizeCanvas();
    cameraController.clamp();
});


function loop() {
    playerController.update();

    // Mettre à jour la caméra (centrer sur le joueur)
    cameraController.centerOn(playerController.player.x, playerController.player.y);

    // FOND = MAP
    mapRenderer.draw(cameraController.camera);

    // JOUEUR
    playerController.draw();

    requestAnimationFrame(loop);
}
loop();