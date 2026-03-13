function createCameraController(canvas, mapWidth, mapHeight) {
    const camera = { x: 0, y: 0, zoom: 1 };

    function getViewWidth() {
        return canvas.width / camera.zoom;
    }

    function getViewHeight() {
        return canvas.height / camera.zoom;
    }

    function clamp() {
        const viewWidth = getViewWidth();
        const viewHeight = getViewHeight();

        camera.x = Math.max(0, Math.min(mapWidth - viewWidth, camera.x));
        camera.y = Math.max(0, Math.min(mapHeight - viewHeight, camera.y));
    }

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
