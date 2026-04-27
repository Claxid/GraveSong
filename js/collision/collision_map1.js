// Collisions limitées aux bords de la map uniquement.
const MAP_WIDTH = 3200;
const MAP_HEIGHT = 3200;
const BORDER_THICKNESS = 16;

window.obstacles = [
    { x: 0, y: 0, w: MAP_WIDTH, h: BORDER_THICKNESS },
    { x: 0, y: MAP_HEIGHT - BORDER_THICKNESS, w: MAP_WIDTH, h: BORDER_THICKNESS },
    { x: 0, y: 0, w: BORDER_THICKNESS, h: MAP_HEIGHT },
    { x: MAP_WIDTH - BORDER_THICKNESS, y: 0, w: BORDER_THICKNESS, h: MAP_HEIGHT }
];

// Collision rectangle vs rectangle
window.rectCollision = function(px, py, pw, ph, rx, ry, rw, rh) {
    return px < rx + rw &&
           px + pw > rx &&
           py < ry + rh &&
           py + ph > ry;
};

// Debug visuel F2
let debugColliders = false;

window.addEventListener("keydown", (e) => {
    if (e.key === "F2") {
        debugColliders = !debugColliders;
        console.log(debugColliders ? "🔴 Collisions ON" : "⚫ Collisions OFF");
    }
});

// Dessine les rectangles de collision (utile pour debug)
window.drawCollidersOverlay = function(ctx, camera, zoom = 1) {
    if (!debugColliders || !window.obstacles) return;

    ctx.save();
    ctx.strokeStyle = "rgba(255,0,0,0.75)";
    ctx.lineWidth = 2;

    for (const o of window.obstacles) {
        const sx = (o.x - camera.x) * zoom;
        const sy = (o.y - camera.y) * zoom;
        const sw = o.w * zoom;
        const sh = o.h * zoom;
        ctx.strokeRect(sx, sy, sw, sh);
    }

    ctx.restore();
};