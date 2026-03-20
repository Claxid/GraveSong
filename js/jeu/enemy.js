// Contrôleur des ennemis
// Les ennemis suivent le joueur et ont une animation de marche.

function createEnemyController(canvas, ctx, camera, startX = 800, startY = 800) {
    // Je charge le sprite de l'orc avec ombres.
    const sprite = new Image();
    sprite.src = "../assets/sprites/Characters(100x100)/Orc/Orc with shadows/Orc-Walk.png";

    // Propriétés de l'ennemi : position, vitesse, animation, etc.
    const enemy = {
        x: startX,
        y: startY,
        speed: 1.55,
        frameX: 0,
        frameY: 0,
        frameSize: 100,
        maxFrames: 6,
        animCounter: 0,
        animSpeed: 12,
        scale: 2,
        hp : 20,
        maxhp : 20,
        hitW: 40,
        hitH: 60
    };

    // Update : fait bouger l'ennemi vers le joueur.
    function update(player) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        enemy.x += (dx / distance) * enemy.speed;
        enemy.y += (dy / distance) * enemy.speed;

        // Animation : change de frame toutes les animSpeed updates.
        enemy.animCounter++;
        if (enemy.animCounter >= enemy.animSpeed) {
            enemy.animCounter = 0;
            enemy.frameX = (enemy.frameX + 1) % enemy.maxFrames;
        }
    }

    // Draw : dessine l'ennemi à l'écran avec la caméra.
    function draw() {
        const size = enemy.frameSize * enemy.scale * camera.zoom;
        const drawX = (enemy.x - camera.x) * camera.zoom - size / 2;
        const drawY = (enemy.y - camera.y) * camera.zoom - size / 2;

        ctx.drawImage(
            sprite,
            enemy.frameX * enemy.frameSize,
            enemy.frameY * enemy.frameSize,
            enemy.frameSize,
            enemy.frameSize,
            drawX,
            drawY,
            size,
            size
        );
    }

    return { enemy, update, draw };
}