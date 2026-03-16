function createPlayerController(canvas, ctx, camera) {
    const sprite = new Image();
    sprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier.png";

    const keys = {};
    document.addEventListener("keydown", (e) => {
        keys[e.key] = true;
    });
    document.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        console.log(x, y);
    });

    const player = {
        x: 500,
        y: 500,
        speed: 2,
        frameX: 0,
        frameY: 0,
        frameSize: 100,
        maxFrames: 6,
        animCounter: 0,
        animSpeed: 10,
        scale: 2
    };

    function update() {
        let moving = false;

        if (keys["z"]) {
            player.y -= player.speed;
            player.frameY = 0;
            moving = true;
        }
        if (keys["s"]) {
            player.y += player.speed;
            player.frameY = 1;
            moving = true;
        }
        if (keys["q"]) {
            player.x -= player.speed;
            player.frameY = 2;
            moving = true;
        }
        if (keys["d"]) {
            player.x += player.speed;
            player.frameY = 3;
            moving = true;
        }

        if (moving) {
            player.animCounter++;
            if (player.animCounter >= player.animSpeed) {
                player.animCounter = 0;
                player.frameX = (player.frameX + 1) % player.maxFrames;
            }
        } else {
            player.frameX = 0;
        }
    }

    function draw() {
        const size = player.frameSize * player.scale * camera.zoom;
        const drawX = (player.x - camera.x) * camera.zoom - size / 2;
        const drawY = (player.y - camera.y) * camera.zoom - size / 2;

        ctx.drawImage(
            sprite,
            player.frameX * player.frameSize,
            player.frameY * player.frameSize,
            player.frameSize,
            player.frameSize,
            drawX,
            drawY,
            size,
            size
        );
    }

    return {
        player,
        update,
        draw
    };
}
