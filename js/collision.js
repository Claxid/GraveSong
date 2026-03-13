// LISTE DES OBSTACLES (rectangles en coordonnées MONDE)
window.obstacles = [
    // Exemple bordures (tu ajusteras après)
    { x: 0, y: 0, w: 3200, h: 16 },
    { x: 0, y: 3184, w: 3200, h: 16 },
    { x: 0, y: 0, w: 16, h: 3200 },
    { x: 3184, y: 0, w: 16, h: 3200 }
];

// COLLISION RECTANGLE vs RECTANGLE 
window.rectCollision = function(px, py, pw, ph, rx, ry, rw, rh) {
    return px < rx + rw &&
           px + pw > rx &&
           py < ry + rh &&
           py + ph > ry;
};

// DEBUG VISUEL F2 
let debugColliders = false;

window.addEventListener("keydown", e => {
    if (e.key === "F2") debugColliders = !debugColliders;
});

// Cette fonction est appelée depuis game.js (après drawMap et drawPlayer)
window.drawCollidersOverlay = function(ctx, camera, zoom) {
    if (!debugColliders) return;

    ctx.save();
    ctx.strokeStyle = "rgba(255,0,0,0.75)";
    ctx.lineWidth = 2;

    for (const o of obstacles) {
        // Conversion monde → écran (ici seulement on utilise camera)
        const sx = (o.x - camera.x) * zoom;
        const sy = (o.y - camera.y) * zoom;
        const sw = o.w * zoom;
        const sh = o.h * zoom;

        ctx.strokeRect(sx, sy, sw, sh);
    }

    ctx.restore();
};

// ÉDITEUR F3 POUR AJOUTER DES HITBOX
let editorOn = false;
let tempStart = null;

window.addEventListener('keydown', (e) => {
    if (e.key === 'F3') {
        editorOn = !editorOn;
        tempStart = null;
        console.log(editorOn ? 'Éditeur ON (clic = point A, relâche = point B)' : 'Éditeur OFF');
    }
});

window.addEventListener('mousedown', (e) => {
    if (!editorOn) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const worldX = camera.x + (screenX / camera.zoom);
    const worldY = camera.y + (screenY / camera.zoom);

    tempStart = { x: Math.round(worldX), y: Math.round(worldY) };
});

window.addEventListener('mouseup', (e) => {
    if (!editorOn || !tempStart) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const worldX = camera.x + (screenX / camera.zoom);
    const worldY = camera.y + (screenY / camera.zoom);

    const x = Math.min(tempStart.x, Math.round(worldX));
    const y = Math.min(tempStart.y, Math.round(worldY));
    const w = Math.abs(Math.round(worldX) - tempStart.x);
    const h = Math.abs(Math.round(worldY) - tempStart.y);

    const box = { x, y, w, h };
    obstacles.push(box);

    console.log(`{ x: ${x}, y: ${y}, w: ${w}, h: ${h} },`);

    tempStart = null;
});