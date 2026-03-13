// CANVAS PLEIN ÉCRAN + RESPONSIVE 
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");



// Ajuste la taille du canvas à la taille de l'écran
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


// CHARGEMENT DU SPRITE JOUEUR 
const sprite = new Image();
sprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier.png"; //  sprite 100x100 px


//  CONTROLES CLAVIER 
const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log(x, y);
});



//  JOUEUR 
let player = {
    x: 500,            // position du joueur dans la map actuelle

    y: 500,
    speed: 1.5,

    frameX: 0,
    frameY: 0,
    frameSize: 100,    // chaque frame = 100 px
    maxFrames: 6,      // nombre de frames par animation
    animCounter: 0,
    animSpeed: 10,
    scale: 2           // taille ×2
};


//  CAMERA 
let camera = { x: 0, y: 0, zoom: 1 };

function getViewWidth() {
    return canvas.width / camera.zoom;
}

function getViewHeight() {
    return canvas.height / camera.zoom;
}

function clampCamera() {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();

    camera.x = Math.max(0, Math.min(MAP_WIDTH - viewWidth, camera.x));
    camera.y = Math.max(0, Math.min(MAP_HEIGHT - viewHeight, camera.y));
}

// MOUVEMENT DU JOUEUR 
function updateMovement() {
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

    // Animation
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


// DESSIN JOUEUR 
function drawPlayer() {
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


function loop() {
    updateMovement();

    // Mettre à jour la caméra (centrer sur le joueur)
    camera.x = player.x - getViewWidth() / 2;
    camera.y = player.y - getViewHeight() / 2;
    clampCamera();

    // FOND = MAP
    drawMap();

    // JOUEUR
    drawPlayer();

    requestAnimationFrame(loop);
}
loop();