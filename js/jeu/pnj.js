function createpnjController(canvas, ctx, camera, startX = 800, startY = 800) {
    const sprite = new Image();
    sprite.src = "../assets/sprites/villager/villager.png";

    const pnj = {
        spawnX: startX,
        spawnY: startY,
        x: startX,
        y: startY,
        speed: 1.52,
        frameX: 0,
        frameY: 0,
        frameSize: 50,
        maxFrames: 2,
        animCounter: 0,
        animSpeed: 12,
        scale: 2,
        hitW: 40,
        hitH: 60
    };

    // PLUS de déplacement
    function update() {
        if (pnj.hp <= 0) return;

        // Animation uniquement
        pnj.animCounter++;
        if (pnj.animCounter >= pnj.animSpeed) {
            pnj.animCounter = 0;
            pnj.frameX = (pnj.frameX + 1) % pnj.maxFrames;
        }
    }

    function draw() {
        const size = pnj.frameSize * pnj.scale * camera.zoom;
        const drawX = (pnj.x - camera.x) * camera.zoom - size / 2;
        const drawY = (pnj.y - camera.y) * camera.zoom - size / 2;

        ctx.drawImage(
            sprite,
            pnj.frameX * pnj.frameSize,
            pnj.frameY * pnj.frameSize,
            pnj.frameSize,
            pnj.frameSize,
            drawX,
            drawY,
            size,
            size
        );
    }

    return { pnj, update, draw };
}