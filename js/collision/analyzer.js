window.CollisionAnalyzer = (() => {
    const { mapImageSrc, bridgeClear, bridgeSideBlocks, mapBorderThickness, firstDilationRadius, secondDilationRadius } = window.CollisionConfig;
    const { idxAt, dilateMask, blockInternalHoles } = window.CollisionMaskUtils;
    const { rgbToHsv, isRoofColor } = window.CollisionColorUtils;
    const { pixelsToRects, createMapBorders, checkRectOverlap } = window.CollisionRectUtils;

    function analyzeMapImage() {
        const mapImage = new Image();
        mapImage.src = mapImageSrc;

        mapImage.onerror = (err) => {
            console.error("Impossible de charger la map pour les collisions", err);
        };

        mapImage.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = mapImage.width;
            canvas.height = mapImage.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(mapImage, 0, 0);

            let imageData;
            try {
                imageData = ctx.getImageData(0, 0, mapImage.width, mapImage.height);
            } catch (e) {
                console.error("getImageData a échoué (CORS ou file://). Servez les fichiers via un serveur local ou enlevez les restrictions CORS.", e);
                return;
            }

            const { data } = imageData;
            const width = mapImage.width;
            const height = mapImage.height;
            const mask = new Uint8ClampedArray(width * height);

            for (let i = 0; i < data.length; i += 4) {
                const { hue, sat, value } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
                if (isRoofColor(hue, sat, value)) mask[i / 4] = 1;
            }

            let dilated = dilateMask(mask, width, height, firstDilationRadius);
            blockInternalHoles(dilated, width, height);
            dilated = dilateMask(dilated, width, height, secondDilationRadius);
            blockInternalHoles(dilated, width, height);

            const rects = pixelsToRects(dilated, width, height, idxAt)
                .filter((r) => r.w >= 1 && r.h >= 1)
                .filter((o) => !checkRectOverlap(o, bridgeClear));

            window.obstacles = [
                ...createMapBorders(width, height, mapBorderThickness),
                ...rects,
                ...bridgeSideBlocks
            ];

            if (!window.obstacles.length) console.warn("Aucun obstacle détecté (vérifier les couleurs ou le chargement de l'image)");
            else console.log(`${window.obstacles.length} obstacles détectés`);
        };
    }

    return { analyzeMapImage };
})();
