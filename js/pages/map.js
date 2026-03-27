// Renderer de la map
// Il charge l'image de la ville et la dessine en fonction de la caméra.

function createMapRenderer(canvas, ctx) {
    // Image de la map.
    const map = new Image();
    map.onload = () => {
        console.log("Map image loaded successfully:", map.src);
    };
    map.onerror = () => {
        console.error("Failed to load map image:", map.src);
    };
    map.src = "../assets/images/Ville.png";

    // Dimensions de la map en pixels.
    const MAP_WIDTH = 3200;
    const MAP_HEIGHT = 3200;

    // Draw : dessine la portion visible de la map avec zoom et caméra.
    function draw(camera) {
        const zoom = camera.zoom || 1;
        const viewWidth = canvas.width / zoom;
        const viewHeight = canvas.height / zoom;

        // Afficher la map seulement si l'image a chargé
        if (map.complete && map.naturalWidth > 0) {
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
    }

    return {
        MAP_WIDTH,
        MAP_HEIGHT,
        draw
    };
}
