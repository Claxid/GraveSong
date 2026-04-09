// Contrôleur des ennemis
// Les ennemis suivent le joueur et ont une animation de marche.

const ENEMY_TYPE_CONFIGS = {
    orc: {
        spriteSrc: "../assets/sprites/Characters(100x100)/Orc/Orc with shadows/Orc-Walk.png",
        frameSize: 100,
        maxFrames: 6,
        speed: 1.52,
        animSpeed: 12,
        scale: 2,
        hp: 20,
        maxhp: 20,
        hitW: 40,
        hitH: 60
    },
    orc3: {
        spriteSrc: "../assets/sprites/Orc3/orc3_walk/orc3_walk_full.png",
        frameSize: 64,
        maxFrames: 6,
        speed: 0.92,
        animSpeed: 16,
        scale: 2.2,
        hp: 180,
        maxhp: 180,
        hitW: 52,
        hitH: 72,
        contactDamage: 14
    }
};

function createEnemyController(canvas, ctx, camera, startX = 800, startY = 800, enemyType = "orc") {
    const enemyConfig = ENEMY_TYPE_CONFIGS[enemyType] || ENEMY_TYPE_CONFIGS.orc;

    // Je charge le sprite du type d'ennemi choisi.
    const sprite = new Image();
    sprite.src = enemyConfig.spriteSrc;

    // Propriétés de l'ennemi : position, vitesse, animation, etc.
    const enemy = {
        type: enemyType,
        spawnX: startX,
        spawnY: startY,
        x: startX,
        y: startY,
        speed: enemyConfig.speed,
        frameX: 0,
        frameY: 0,
        frameSize: enemyConfig.frameSize,
        maxFrames: enemyConfig.maxFrames,
        animCounter: 0,
        animSpeed: enemyConfig.animSpeed,
        scale: enemyConfig.scale,
        hp : enemyConfig.hp,
        maxhp : enemyConfig.maxhp,
        hitW: enemyConfig.hitW,
        hitH: enemyConfig.hitH,
        contactDamage: enemyConfig.contactDamage || 5
    };

    // Update : fait bouger l'ennemi vers le joueur.
    function update(player) {
        if (enemy.hp <= 0) return;

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