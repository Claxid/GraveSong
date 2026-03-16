// Contrôleur du joueur
// Le joueur se déplace avec ZQSD et a des animations selon la direction.

function createPlayerController(canvas, ctx, camera) {
    // Sprite du soldat.
    const sprite = new Image();
    sprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Walk.png";

    // Gestion des touches appuyées.
    const keys = {};
    document.addEventListener("keydown", (e) => {
        keys[e.key] = true;
    });
    document.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    // Clic sur canvas pour debug (affiche les coordonnées écran).
    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        console.log(x, y);
    });

    // Propriétés du joueur : position, vitesse, animation.
    const player = {
        x: 500,
        y: 500,
        speed: 1.5,
        frameX: 0,
        frameY: 0,
        frameSize: 100,
        maxFrames: 8,
        animCounter: 0,
        animSpeed: 10,
        scale: 2
    };

    let facingLeft = false;

    sprite.addEventListener("load", () => {
        // Adapt to the actual number of frames in the loaded walk sprite sheet.
        player.maxFrames = Math.max(1, Math.floor(sprite.width / player.frameSize));
    });

    function update() {
        let moving = false;

        if (keys["z"]) {
            player.y -= player.speed;
            player.frameY = 0; // Haut
            moving = true;
        }
        if (keys["s"]) {
            player.y += player.speed;
            player.frameY = 0;
            moving = true;
        }
        if (keys["q"]) {
            player.x -= player.speed;
            player.frameY = 0;
            facingLeft = true;
            moving = true;
        }
        if (keys["d"]) {
            player.x += player.speed;
            player.frameY = 0;
            facingLeft = false;
            moving = true;
        }

        if (moving) {
            player.animCounter++;
            if (player.animCounter >= player.animSpeed) {
                player.animCounter = 0;
                player.frameX = (player.frameX + 1) % player.maxFrames;
            }
        } else {
            player.frameX = 0; // Frame statique
        }
    }

    // Draw : dessine le joueur avec la caméra.
    function draw() {
        const size = player.frameSize * player.scale * camera.zoom;
        const drawX = (player.x - camera.x) * camera.zoom - size / 2;
        const drawY = (player.y - camera.y) * camera.zoom - size / 2;

        if (facingLeft) {
            ctx.save();
            ctx.translate(drawX + size, drawY);
            ctx.scale(-1, 1);

            ctx.drawImage(
                sprite,
                player.frameX * player.frameSize,
                player.frameY * player.frameSize,
                player.frameSize,
                player.frameSize,
                0,
                0,
                size,
                size
            );

            ctx.restore();
            return;
        }

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
