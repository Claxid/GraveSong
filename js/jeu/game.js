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

const CONTACT_DAMAGE = 5;
const DAMAGE_COOLDOWN_MS = 500;
const SHOW_HITBOXES = false;
let lastContactDamageAt = 0;

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
});

// La boucle principale du jeu : update et draw à chaque frame.
function loop() {
    playerController.update([enemyController.enemy]);
    enemyController.update(playerController.player);

    const playerHitbox = getEntityHitbox(playerController.player);
    const enemyHitbox = getEntityHitbox(enemyController.enemy);

    if (isRectOverlap(playerHitbox, enemyHitbox)) {
        const now = performance.now();
        if (now - lastContactDamageAt >= DAMAGE_COOLDOWN_MS) {
            playerController.player.hp = Math.max(0, playerController.player.hp - CONTACT_DAMAGE);
            lastContactDamageAt = now;
        }
    }

    if (playerController.player.hp <= 0) {
        playerController.player.x = playerController.player.spawnX;
        playerController.player.y = playerController.player.spawnY;
        playerController.player.hp = playerController.player.maxHp;
        lastContactDamageAt = performance.now();
    }

    // Mettre à jour la caméra (centrer sur le joueur)
    cameraController.centerOn(playerController.player.x, playerController.player.y);

    // FOND = MAP
    mapRenderer.draw(cameraController.camera);

    // JOUEUR
    playerController.draw();

    // EFFETS D'ATTAQUE (dessinés après le joueur, avant les ennemis)
    playerController.drawAttacks();

    // ENNEMI
    enemyController.draw();

    if (SHOW_HITBOXES) {
        ctx.save();
        ctx.lineWidth = 2;

        const pX = (playerHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
        const pY = (playerHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
        const pW = playerHitbox.w * cameraController.camera.zoom;
        const pH = playerHitbox.h * cameraController.camera.zoom;
        ctx.strokeStyle = "#00ff00";
        ctx.strokeRect(pX, pY, pW, pH);

        const eX = (enemyHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
        const eY = (enemyHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
        const eW = enemyHitbox.w * cameraController.camera.zoom;
        const eH = enemyHitbox.h * cameraController.camera.zoom;
        ctx.strokeStyle = "#ff0000";
        ctx.strokeRect(eX, eY, eW, eH);

        ctx.restore();
    }

    // HUD - Barre de vie (bas gauche)
    const barX = 20;
    const barY = canvas.height - 40;
    const barWidth = 200;
    const barHeight = 20;
    const hpRatio = playerController.player.hp / playerController.player.maxHp;

    ctx.fillStyle = "black";
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    ctx.fillStyle = "#555";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "rgb(140, 16, 16)";
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // HUD - Barre d'expérience (haut centre)
    const expBarWidth = 500;
    const expBarHeight = 17;
    const expBarX = (canvas.width / 2) - (expBarWidth / 2);
    const expBarY = 10;
    const expRatio = playerController.player.exp / playerController.player.maxExp;

    ctx.fillStyle = "black";
    ctx.fillRect(expBarX - 2, expBarY - 2, expBarWidth + 4, expBarHeight + 4);
    ctx.fillStyle = "#555";
    ctx.fillRect(expBarX, expBarY, expBarWidth, expBarHeight);
    ctx.fillStyle = "rgb(196, 138, 31)";
    ctx.fillRect(expBarX, expBarY, expBarWidth * expRatio, expBarHeight);

    ctx.fillStyle = "white";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`level : ${playerController.player.level}`, canvas.width / 2, expBarY + expBarHeight / 2);

    requestAnimationFrame(loop);
}
loop();