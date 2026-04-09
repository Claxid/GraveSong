// Renderer de la map
// Il charge l'image de la ville et la dessine en fonction de la caméra.

function createMapRenderer(canvas, ctx) {
    // Image de la map.
    const map = new Image();
    let isReady = false;
    
    map.onload = function() {
        isReady = true;
        console.log("✅ Map image chargée");
    };
    
    map.onerror = function() {
        console.error("❌ Erreur: impossible de charger l'image Ville.png");
    };
    
    map.src = "../../assets/images/Ville.png";

    // Dimensions de la map en pixels.
    const MAP_WIDTH = 3200;
    const MAP_HEIGHT = 3200;

    // Draw : dessine la portion visible de la map avec zoom et caméra.
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
