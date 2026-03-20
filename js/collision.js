// ANALYSE AUTOMATIQUE DE L'IMAGE POUR GÉNÉRER LES OBSTACLES
window.obstacles = [];

function analyzeMapImage() {
    const mapImage = new Image();
    mapImage.src = "../assets/images/Ville.png";

    mapImage.onerror = function(err) {
        console.error("❌ Impossible de charger la map pour les collisions", err);
    };

    mapImage.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = mapImage.width;
        canvas.height = mapImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(mapImage, 0, 0);

        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, mapImage.width, mapImage.height);
        } catch (e) {
            console.error("❌ getImageData a échoué (CORS ou file://). Servez les fichiers via un serveur local ou enlevez les restrictions CORS.", e);
            return;
        }
        const data = imageData.data;

        // Créer une carte de pixels "non-praticables"
        const blocked = new Uint8ClampedArray(mapImage.width * mapImage.height);
        const idxAt = (xx, yy) => yy * mapImage.width + xx;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // HSV pour isoler les toits sans toucher aux chemins/sol
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

            // Hues du sol (jaune/ocre) à exclure
            const isGroundHue = hue >= 25 && hue <= 75;

            // Toits : bleu (ardoise), rouge/brique, gris peu saturé
            const isRoofBlue = sat > 0.25 && value > 50 && hue >= 190 && hue <= 250;
            const isRoofRed = sat > 0.25 && value > 60 && (hue <= 20 || hue >= 330);
            const isRoofBrown = sat > 0.18 && value > 50 && hue >= 20 && hue <= 45;
            const isRoofGrey = sat < 0.15 && value >= 70 && value <= 185 && !isGroundHue;

            const isRoof = (isRoofBlue || isRoofRed || isRoofBrown || isRoofGrey) && !isGroundHue;

            if (isRoof) {
                blocked[i / 4] = 1;
            }
        }

        // Dilatation 2px pour couvrir toute la toiture (remplit les trous d'aliasing)
        const dilated = new Uint8ClampedArray(blocked.length);
        for (let y = 0; y < mapImage.height; y++) {
            for (let x = 0; x < mapImage.width; x++) {
                if (!blocked[idxAt(x, y)]) continue;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && ny >= 0 && nx < mapImage.width && ny < mapImage.height) {
                            dilated[idxAt(nx, ny)] = 1;
                        }
                    }
                }
            }
        }
        dilated.forEach((v, idx) => blocked[idx] = v);

        // Remplir les petits trous internes des maisons (vitres/aliasing au centre du toit)
        const visitedFree = new Uint8ClampedArray(blocked.length);
        const queueX = [];
        const queueY = [];

        const pushIfFree = (x, y) => {
            const idx = idxAt(x, y);
            if (visitedFree[idx] || blocked[idx]) return;
            visitedFree[idx] = 1;
            queueX.push(x);
            queueY.push(y);
        };

        // Flood-fill depuis les bords pour marquer l'extérieur libre
        for (let x = 0; x < mapImage.width; x++) {
            pushIfFree(x, 0);
            pushIfFree(x, mapImage.height - 1);
        }
        for (let y = 0; y < mapImage.height; y++) {
            pushIfFree(0, y);
            pushIfFree(mapImage.width - 1, y);
        }

        while (queueX.length) {
            const x = queueX.pop();
            const y = queueY.pop();
            if (x > 0) pushIfFree(x - 1, y);
            if (x + 1 < mapImage.width) pushIfFree(x + 1, y);
            if (y > 0) pushIfFree(x, y - 1);
            if (y + 1 < mapImage.height) pushIfFree(x, y + 1);
        }

        // Tout pixel libre non connecté au bord est un trou interne => on le bloque
        for (let i = 0; i < blocked.length; i++) {
            if (!blocked[i] && !visitedFree[i]) {
                blocked[i] = 1;
                        // Dilatation légère (1px) pour couvrir l'aliasing du toit
                        const dilated = new Uint8ClampedArray(blocked.length);
                        for (let y = 0; y < mapImage.height; y++) {
                            for (let x = 0; x < mapImage.width; x++) {
                                if (!blocked[idxAt(x, y)]) continue;
                                for (let dy = -1; dy <= 1; dy++) {
                                    for (let dx = -1; dx <= 1; dx++) {
                                        const nx = x + dx;
                                        const ny = y + dy;
                                        if (nx >= 0 && ny >= 0 && nx < mapImage.width && ny < mapImage.height) {
                                            dilated[idxAt(nx, ny)] = 1;
                                        }
                                    }
                                }
                            }
                        }
                        dilated.forEach((v, idx) => blocked[idx] = v);

                        // Remplir les petits trous internes des toits
                        const visitedFree = new Uint8ClampedArray(blocked.length);
                        const queueX = [];
                        const queueY = [];

                        const pushIfFree = (x, y) => {
                            const idx = idxAt(x, y);
                            if (visitedFree[idx] || blocked[idx]) return;
                            visitedFree[idx] = 1;
                            queueX.push(x);
                            queueY.push(y);
                        };

                        // Flood-fill depuis les bords pour marquer l'extérieur libre
                        for (let x = 0; x < mapImage.width; x++) {
                            pushIfFree(x, 0);
                            pushIfFree(x, mapImage.height - 1);
                        }
                        for (let y = 0; y < mapImage.height; y++) {
                            pushIfFree(0, y);
                            pushIfFree(mapImage.width - 1, y);
                        }

                        while (queueX.length) {
                            const x = queueX.pop();
                            const y = queueY.pop();
                            if (x > 0) pushIfFree(x - 1, y);
                            if (x + 1 < mapImage.width) pushIfFree(x + 1, y);
                            if (y > 0) pushIfFree(x, y - 1);
                            if (y + 1 < mapImage.height) pushIfFree(x, y + 1);
                        }

                        // Tout pixel libre non connecté au bord est un trou interne => on le bloque
                        for (let i = 0; i < blocked.length; i++) {
                            if (!blocked[i] && !visitedFree[i]) {
                                blocked[i] = 1;
                            }
                        }

                        // Transforme les pixels bloqués (toits) en rectangles contigus
                        const visited = new Uint8ClampedArray(mapImage.width * mapImage.height);
                        const rects = [];
                        for (let y = 0; y < mapImage.height; y++) {
                            let x = 0;
                            while (x < mapImage.width) {
                                // chercher début de run bloqué
                                while (x < mapImage.width && (!blocked[idxAt(x, y)] || visited[idxAt(x, y)])) x++;
                                if (x >= mapImage.width) break;
                                const startX = x;
                                while (x < mapImage.width && blocked[idxAt(x, y)] && !visited[idxAt(x, y)]) x++;
                                const endX = x - 1;
                                // essayer d'étendre verticalement tant que la bande reste pleine
                                let endY = y;
                                let canExtend = true;
                                while (canExtend && endY + 1 < mapImage.height) {
                                    for (let xx = startX; xx <= endX; xx++) {
                                        if (!blocked[idxAt(xx, endY + 1)] || visited[idxAt(xx, endY + 1)]) {
                                            canExtend = false;
                                            break;
                                        }
                                    }
                                    if (canExtend) endY++;
                                }
                                // marquer visité
                                for (let yy = y; yy <= endY; yy++) {
                                    for (let xx = startX; xx <= endX; xx++) {
                                        visited[idxAt(xx, yy)] = 1;
                                    }
                                }
                                rects.push({ x: startX, y: y, w: endX - startX + 1, h: endY - y + 1 });
                            }
                        }

                        window.obstacles.push(...rects.filter(r => r.w >= 1 && r.h >= 1));

                        if (!window.obstacles.length) {
                            console.warn("⚠️ Aucun obstacle détecté (vérifier les couleurs ou le chargement de l'image)");
                        }

                        // Couloir libre recentré (pont)
                        const bridgeClear = { x: 2250, y: 700, w: 100, h: 950 };
                        window.obstacles = window.obstacles.filter((o) => {
                            const overlapBridge = o.x < bridgeClear.x + bridgeClear.w && o.x + o.w > bridgeClear.x &&
                                                  o.y < bridgeClear.y + bridgeClear.h && o.y + o.h > bridgeClear.y;
                            return !overlapBridge;
                        });

                        // Ajouter les bordures
                        window.obstacles.unshift(
                            { x: 0, y: 0, w: mapImage.width, h: 16 },
                            { x: 0, y: mapImage.height - 16, w: mapImage.width, h: 16 },
                            { x: 0, y: 0, w: 16, h: mapImage.height },
                            { x: mapImage.width - 16, y: 0, w: 16, h: mapImage.height }
                        );

                        console.log(`✅ ${window.obstacles.length} obstacles détectés!`);
                        console.log(window.obstacles);
                let endY = y;
                let canExtend = true;
                while (canExtend && endY + 1 < mapImage.height) {
                    for (let xx = startX; xx <= endX; xx++) {
                        if (!blocked[idxAt(xx, endY + 1)] || visited[idxAt(xx, endY + 1)]) {
                            canExtend = false;
                            break;
                        }
                    }
                    if (canExtend) endY++;
                }
                // marquer visité
                for (let yy = y; yy <= endY; yy++) {
                    for (let xx = startX; xx <= endX; xx++) {
                        visited[idxAt(xx, yy)] = 1;
                    }
                }
                rects.push({ x: startX, y: y, w: endX - startX + 1, h: endY - y + 1 });
            }
        }

        window.obstacles.push(...rects.filter(r => r.w >= 1 && r.h >= 1));

        if (!window.obstacles.length) {
            console.warn("⚠️ Aucun obstacle détecté (vérifier les couleurs ou le chargement de l'image)");
        }

        // Couloir libre recentré (déplace plus à droite et un peu plus large)
        // Décalage plus à droite
        const bridgeClear = { x: 2250, y: 700, w: 100, h: 950 };
        window.obstacles = window.obstacles.filter((o) => {
            const overlapBridge = o.x < bridgeClear.x + bridgeClear.w && o.x + o.w > bridgeClear.x &&
                                  o.y < bridgeClear.y + bridgeClear.h && o.y + o.h > bridgeClear.y;
            return !overlapBridge;
        });

        // Ajouter les bordures
        window.obstacles.unshift(
            { x: 0, y: 0, w: mapImage.width, h: 16 },
            { x: 0, y: mapImage.height - 16, w: mapImage.width, h: 16 },
            { x: 0, y: 0, w: 16, h: mapImage.height },
            { x: mapImage.width - 16, y: 0, w: 16, h: mapImage.height }
        );

        // Plus de suppression de collisions dans des zones spécifiques (pont inclus)

        // (Plus de blocs manuels ici; contour rivière généré par boundary)

        console.log(`✅ ${window.obstacles.length} obstacles détectés!`);
        console.log(window.obstacles);
    };
}

// Lancer l'analyse au chargement
analyzeMapImage();

// COLLISION RECTANGLE vs RECTANGLE 
window.rectCollision = function(px, py, pw, ph, rx, ry, rw, rh) {
    return px < rx + rw &&
           px + pw > rx &&
           py < ry + rh &&
           py + ph > ry;
};

// DEBUG VISUEL F2 
let debugColliders = true;

window.addEventListener("keydown", e => {
    if (e.key === "F2") {
        debugColliders = !debugColliders;
        console.log(debugColliders ? '🔴 Collisions ON' : '⚫ Collisions OFF');
    }
});

// Cette fonction est appelée depuis game.js (après drawMap et drawPlayer)
window.drawCollidersOverlay = function(ctx, camera, zoom) {
    if (!debugColliders) return;

    ctx.save();
    ctx.strokeStyle = "rgba(255,0,0,0.75)";
    ctx.lineWidth = 2;

    for (const o of window.obstacles) {
        // Conversion monde → écran (ici seulement on utilise camera)
        const sx = (o.x - camera.x) * zoom;
        const sy = (o.y - camera.y) * zoom;
        const sw = o.w * zoom;
        const sh = o.h * zoom;

        ctx.strokeRect(sx, sy, sw, sh);
    }

    ctx.restore();
};