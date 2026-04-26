window.obstacles = [];

const MAP_IMAGE_SRC = "../assets/images/Ville.png";

function createBorderObstacles(width, height, thickness = 16) {
    return [
        { x: 0, y: 0, w: width, h: thickness },
        { x: 0, y: height - thickness, w: width, h: thickness },
        { x: 0, y: 0, w: thickness, h: height },
        { x: width - thickness, y: 0, w: thickness, h: height }
    ];
}

function applyFallbackBorders(width = 3200, height = 3200) {
    window.obstacles = createBorderObstacles(width, height, 16);
}

function idxAt(x, y, width) {
    return y * width + x;
}

function dilateMask(mask, width, height, radius) {
    const out = new Uint8ClampedArray(mask.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!mask[idxAt(x, y, width)]) continue;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
                        out[idxAt(nx, ny, width)] = 1;
                    }
                }
            }
        }
    }
    return out;
}

function floodFillExterior(mask, width, height) {
    const visited = new Uint8ClampedArray(mask.length);
    const queueX = [];
    const queueY = [];

    const pushIfFree = (x, y) => {
        const idx = idxAt(x, y, width);
        if (visited[idx] || mask[idx]) return;
        visited[idx] = 1;
        queueX.push(x);
        queueY.push(y);
    };

    for (let x = 0; x < width; x++) {
        pushIfFree(x, 0);
        pushIfFree(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        pushIfFree(0, y);
        pushIfFree(width - 1, y);
    }

    while (queueX.length) {
        const x = queueX.pop();
        const y = queueY.pop();
        if (x > 0) pushIfFree(x - 1, y);
        if (x + 1 < width) pushIfFree(x + 1, y);
        if (y > 0) pushIfFree(x, y - 1);
        if (y + 1 < height) pushIfFree(x, y + 1);
    }

    return visited;
}

function blockInternalHoles(mask, width, height) {
    const exterior = floodFillExterior(mask, width, height);
    for (let i = 0; i < mask.length; i++) {
        if (!mask[i] && !exterior[i]) {
            mask[i] = 1;
        }
    }
}

function pixelsToRects(mask, width, height) {
    const visited = new Uint8ClampedArray(mask.length);
    const rects = [];

    for (let y = 0; y < height; y++) {
        let x = 0;
        while (x < width) {
            while (x < width && (!mask[idxAt(x, y, width)] || visited[idxAt(x, y, width)])) x++;
            if (x >= width) break;

            const startX = x;
            while (x < width && mask[idxAt(x, y, width)] && !visited[idxAt(x, y, width)]) x++;
            const endX = x - 1;

            let endY = y;
            let canExtend = true;
            while (canExtend && endY + 1 < height) {
                for (let xx = startX; xx <= endX; xx++) {
                    const nextIdx = idxAt(xx, endY + 1, width);
                    if (!mask[nextIdx] || visited[nextIdx]) {
                        canExtend = false;
                        break;
                    }
                }
                if (canExtend) endY++;
            }

            for (let yy = y; yy <= endY; yy++) {
                for (let xx = startX; xx <= endX; xx++) {
                    visited[idxAt(xx, yy, width)] = 1;
                }
            }

            rects.push({ x: startX, y: y, w: endX - startX + 1, h: endY - y + 1 });
        }
    }

    return rects;
}

function analyzeMapImage() {
    const mapImage = new Image();
    mapImage.src = MAP_IMAGE_SRC;

    mapImage.onerror = function(err) {
        console.error("❌ Impossible de charger la map pour les collisions", err);
        applyFallbackBorders();
    };

    mapImage.onload = function() {
        const canvas = document.createElement("canvas");
        canvas.width = mapImage.width;
        canvas.height = mapImage.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(mapImage, 0, 0);

        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, mapImage.width, mapImage.height);
        } catch (e) {
            console.error("❌ getImageData a échoué (CORS ou file://). Servez les fichiers via un serveur local ou enlevez les restrictions CORS.", e);
            applyFallbackBorders(mapImage.width || 3200, mapImage.height || 3200);
            return;
        }
        const data = imageData.data;
        const width = mapImage.width;
        const height = mapImage.height;

        const mask = new Uint8ClampedArray(width * height);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const maxRGB = Math.max(r, g, b);
            const minRGB = Math.min(r, g, b);
            const delta = maxRGB - minRGB;
            const value = maxRGB;
            const sat = maxRGB === 0 ? 0 : delta / maxRGB;
            let hue = 0;
            if (delta !== 0) {
                if (maxRGB === r) hue = 60 * (((g - b) / delta) % 6);
                else if (maxRGB === g) hue = 60 * (((b - r) / delta) + 2);
                else hue = 60 * (((r - g) / delta) + 4);
            }
            if (hue < 0) hue += 360;

            const isGroundHue = hue >= 25 && hue <= 75;
            const isRoofBlue = sat > 0.25 && value > 50 && hue >= 190 && hue <= 250;
            const isRoofRed = sat > 0.25 && value > 60 && (hue <= 20 || hue >= 330);
            const isRoofBrown = sat > 0.18 && value > 50 && hue >= 20 && hue <= 45;
            const isRoofGrey = sat < 0.15 && value >= 70 && value <= 185 && !isGroundHue;

            const isRoof = (isRoofBlue || isRoofRed || isRoofBrown || isRoofGrey) && !isGroundHue;

            if (isRoof) {
                mask[i / 4] = 1;
            }
        }

        let dilated = dilateMask(mask, width, height, 2);
        blockInternalHoles(dilated, width, height);
        dilated = dilateMask(dilated, width, height, 1);
        blockInternalHoles(dilated, width, height);

        const rects = pixelsToRects(dilated, width, height);

        const bridgeClear = { x: 2250, y: 700, w: 100, h: 950 };
        const bridgeSideBlocks = [
            { x: 2238, y: 830, w: 34, h: 300 },
            { x: 2310, y: 830, w: 40, h: 300 }
        ];
        const filteredRects = rects
            .filter((r) => r.w >= 1 && r.h >= 1)
            .filter((o) => {
                const overlap = o.x < bridgeClear.x + bridgeClear.w && o.x + o.w > bridgeClear.x &&
                                 o.y < bridgeClear.y + bridgeClear.h && o.y + o.h > bridgeClear.y;
                return !overlap;
            });

        filteredRects.unshift(
            { x: 0, y: 0, w: width, h: 16 },
            { x: 0, y: height - 16, w: width, h: 16 },
            { x: 0, y: 0, w: 16, h: height },
            { x: width - 16, y: 0, w: 16, h: height }
        );

        filteredRects.push(...bridgeSideBlocks);

        window.obstacles = filteredRects;

        if (!window.obstacles.length) {
            console.warn("Aucun obstacle détecté: vérifier les couleurs de la map ou le chargement de l'image.");
            applyFallbackBorders(width, height);
        }
    };
}

analyzeMapImage();

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