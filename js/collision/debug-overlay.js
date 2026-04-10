window.CollisionDebugOverlay = (() => {
    let debugColliders = false;

    function rectCollision(px, py, pw, ph, rx, ry, rw, rh) {
        return px < rx + rw && px + pw > rx && py < ry + rh && py + ph > ry;
    }

    function installToggle() {
        window.addEventListener("keydown", (e) => {
            if (e.key !== "F2") return;
            debugColliders = !debugColliders;
            console.log(debugColliders ? "Collisions ON" : "Collisions OFF");
        });
    }

    function drawCollidersOverlay(ctx, camera, zoom = 1) {
        if (!debugColliders || !window.obstacles) return;

        ctx.save();
        ctx.strokeStyle = "rgba(255,0,0,0.75)";
        ctx.lineWidth = 2;

        for (const o of window.obstacles) {
            const sx = (o.x - camera.x) * zoom;
            const sy = (o.y - camera.y) * zoom;
            ctx.strokeRect(sx, sy, o.w * zoom, o.h * zoom);
        }

        ctx.restore();
    }

    return { rectCollision, drawCollidersOverlay, installToggle };
})();
