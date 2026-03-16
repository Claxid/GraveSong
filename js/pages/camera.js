// Contrôleur de caméra
// La caméra se centre sur le joueur et reste dans les limites de la map.

function createCameraController(canvas, mapWidth, mapHeight) {
    // Propriétés de la caméra : position et zoom.
    const camera = { x: 0, y: 0, zoom: 1 };

    // Largeur visible de la vue caméra.
    function getViewWidth() {
        return canvas.width / camera.zoom;
    }

    // Hauteur visible de la vue caméra.
    function getViewHeight() {
        return canvas.height / camera.zoom;
    }

    // Clamp : empêche la caméra de sortir des limites de la map.
    function clamp() {
        const viewWidth = getViewWidth();
        const viewHeight = getViewHeight();

        camera.x = Math.max(0, Math.min(mapWidth - viewWidth, camera.x));
        camera.y = Math.max(0, Math.min(mapHeight - viewHeight, camera.y));
    }

    // Centre la caméra sur un point (x,y), comme le joueur.
    function centerOn(x, y) {
        camera.x = x - getViewWidth() / 2;
        camera.y = y - getViewHeight() / 2;
        clamp();
    }

    return {
        camera,
        getViewWidth,
        getViewHeight,
        clamp,
        centerOn
    };
}
