window.createEnemyController = function createEnemyController(canvas, ctx, camera, startX = 800, startY = 800, enemyType = "gobelin") {
    const enemyConfig = (window.ENEMY_TYPE_CONFIGS && window.ENEMY_TYPE_CONFIGS[enemyType]) || window.ENEMY_TYPE_CONFIGS.gobelin;
    const sprite = new Image();
    sprite.src = enemyConfig.spriteSrc;

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
        hp: enemyConfig.hp,
        maxhp: enemyConfig.maxhp,
        hitW: enemyConfig.hitW,
        hitH: enemyConfig.hitH,
        contactDamage: enemyConfig.contactDamage || 5
    };

    function update(player) {
        if (enemy.hp <= 0) return;
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return;

        enemy.x += (dx / distance) * enemy.speed;
        enemy.y += (dy / distance) * enemy.speed;
        enemy.animCounter++;

        if (enemy.animCounter >= enemy.animSpeed) {
            enemy.animCounter = 0;
            enemy.frameX = (enemy.frameX + 1) % enemy.maxFrames;
        }
    }

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
};
