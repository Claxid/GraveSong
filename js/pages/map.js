// CHARGEMENT DE LA MAP
const map = new Image();
map.src = "../assets/images/Ville.png"; // map 3200 x 3200 pixels

// Dimensions réelles de la map
const MAP_WIDTH = 3200;
const MAP_HEIGHT = 3200;

function getViewDimensions() {
    const zoom = camera.zoom || 1;
    return {
        width: canvas.width / zoom,
        height: canvas.height / zoom
    };
}


// FONCTION D’AFFICHAGE DE LA MAP
function drawMap() {
    const view = getViewDimensions();

    ctx.drawImage(
        map,
        camera.x, camera.y,
        view.width, view.height,
        0, 0,
        canvas.width, canvas.height
    );
}