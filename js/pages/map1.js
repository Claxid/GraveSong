function createMapRenderer(canvas, ctx) {
    const map = new Image();
    let isReady = false;
    
    map.onload = function() {
        isReady = true;
        console.log("✅ Map1 image chargée");
    };
    
    map.onerror = function() {
        console.error("❌ Erreur: impossible de charger l'image Map1.png");
    };
    
    map.src = "../../assets/images/Map1.png";

    const MAP_WIDTH = 3200;
    const MAP_HEIGHT = 3200;

    function draw(camera) {
        if (!isReady) return; // Ne rien dessiner si l'image n'est pas prête
        
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
