function createMapRenderer(canvas, ctx) {
    const map = new Image();
    map.src = "../assets/images/Map2.png";

    const MAP_WIDTH = 3200;
    const MAP_HEIGHT = 3200;

    function draw(camera) {
        const zoom = camera.zoom || 1;
        const viewWidth = canvas.width / zoom;
        const viewHeight = canvas.height / zoom;

        ctx.drawImage(
            map,
            camera.x,
            camera.y,
            viewWidth,
            viewHeight,
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    return {
        MAP_WIDTH,
        MAP_HEIGHT,
        draw
    };
}
