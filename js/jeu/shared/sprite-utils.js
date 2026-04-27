window.GameSpriteUtils = (() => {
    function extractSpriteRectsFromSheet(image, { removeNearBlack = true, maxRects = 2, minArea = 24 } = {}) {
        const canvasProbe = document.createElement("canvas");
        canvasProbe.width = image.naturalWidth;
        canvasProbe.height = image.naturalHeight;
        const probeCtx = canvasProbe.getContext("2d", { willReadFrequently: true });
        if (!probeCtx) return { canvas: null, rects: [] };

        probeCtx.drawImage(image, 0, 0);
        const imageData = probeCtx.getImageData(0, 0, canvasProbe.width, canvasProbe.height);
        const data = imageData.data;
        const width = canvasProbe.width;
        const height = canvasProbe.height;
        const mask = new Uint8Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                const isNearBlack = removeNearBlack && (r < 26 && g < 26 && b < 26);
                if (a < 20 || isNearBlack) {
                    data[idx + 3] = 0;
                    continue;
                }
                mask[y * width + x] = 1;
            }
        }

        probeCtx.putImageData(imageData, 0, 0);

        const visited = new Uint8Array(width * height);
        const rects = [];
        const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const start = y * width + x;
                if (!mask[start] || visited[start]) continue;

                let minX = x;
                let minY = y;
                let maxX = x;
                let maxY = y;
                let pixelCount = 0;
                const queue = [start];
                visited[start] = 1;

                while (queue.length > 0) {
                    const current = queue.pop();
                    const cx = current % width;
                    const cy = Math.floor(current / width);
                    pixelCount++;

                    if (cx < minX) minX = cx;
                    if (cy < minY) minY = cy;
                    if (cx > maxX) maxX = cx;
                    if (cy > maxY) maxY = cy;

                    for (const [dx, dy] of neighbors) {
                        const nx = cx + dx;
                        const ny = cy + dy;
                        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                        const ni = ny * width + nx;
                        if (!mask[ni] || visited[ni]) continue;
                        visited[ni] = 1;
                        queue.push(ni);
                    }
                }

                if (pixelCount < minArea) continue;
                const pad = 1;
                const sx = Math.max(0, minX - pad);
                const sy = Math.max(0, minY - pad);
                const sw = Math.min(width - sx, (maxX - minX + 1) + pad * 2);
                const sh = Math.min(height - sy, (maxY - minY + 1) + pad * 2);
                rects.push({ sx, sy, sw, sh, area: pixelCount });
            }
        }

        rects.sort((a, b) => (a.sy - b.sy) || (a.sx - b.sx));
        return {
            canvas: canvasProbe,
            rects: rects.slice(0, Math.max(1, maxRects)).map((r) => ({ sx: r.sx, sy: r.sy, sw: r.sw, sh: r.sh }))
        };
    }

    function extractAxeSpriteBounds(image) {
        const probeCanvas = document.createElement("canvas");
        probeCanvas.width = image.naturalWidth;
        probeCanvas.height = image.naturalHeight;
        const probeCtx = probeCanvas.getContext("2d", { willReadFrequently: true });
        if (!probeCtx) return { sourceRect: null, pivot: null };

        probeCtx.drawImage(image, 0, 0);
        const data = probeCtx.getImageData(0, 0, probeCanvas.width, probeCanvas.height).data;

        let minX = probeCanvas.width;
        let minY = probeCanvas.height;
        let maxX = -1;
        let maxY = -1;
        let sumX = 0;
        let sumY = 0;
        let sumWeight = 0;

        for (let y = 0; y < probeCanvas.height; y++) {
            for (let x = 0; x < probeCanvas.width; x++) {
                const idx = (y * probeCanvas.width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                if (a < 20 || (r < 20 && g < 20 && b < 20)) continue;

                const weight = Math.max(1, a);
                sumX += x * weight;
                sumY += y * weight;
                sumWeight += weight;

                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }

        if (maxX < minX || maxY < minY) {
            return { sourceRect: null, pivot: null };
        }

        const pad = 2;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(probeCanvas.width - sx, (maxX - minX + 1) + pad * 2);
        const sh = Math.min(probeCanvas.height - sy, (maxY - minY + 1) + pad * 2);

        return {
            sourceRect: { sx, sy, sw, sh },
            pivot: sumWeight > 0
                ? {
                    x: (sumX / sumWeight) - sx,
                    y: (sumY / sumWeight) - sy
                }
                : null
        };
    }

    return {
        extractSpriteRectsFromSheet,
        extractAxeSpriteBounds
    };
})();
