window.CollisionRectUtils = (() => {
    function findHorizontalRun(mask, visited, idxAt, width, y, startX) {
        let x = startX;
        while (x < width && mask[idxAt(x, y, width)] && !visited[idxAt(x, y, width)]) x++;
        return x - 1;
    }

    function extendVertical(mask, visited, idxAt, width, height, startX, endX, y) {
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
        return endY;
    }

    function pixelsToRects(mask, width, height, idxAt) {
        const visited = new Uint8ClampedArray(mask.length);
        const rects = [];

        for (let y = 0; y < height; y++) {
            let x = 0;
            while (x < width) {
                while (x < width && (!mask[idxAt(x, y, width)] || visited[idxAt(x, y, width)])) x++;
                if (x >= width) break;

                const startX = x;
                const endX = findHorizontalRun(mask, visited, idxAt, width, y, startX);
                const endY = extendVertical(mask, visited, idxAt, width, height, startX, endX, y);

                for (let yy = y; yy <= endY; yy++) {
                    for (let xx = startX; xx <= endX; xx++) visited[idxAt(xx, yy, width)] = 1;
                }

                rects.push({ x: startX, y, w: endX - startX + 1, h: endY - y + 1 });
                x = endX + 1;
            }
        }

        return rects;
    }

    function createMapBorders(w, h, thickness) {
        return [
            { x: 0, y: 0, w, h: thickness },
            { x: 0, y: h - thickness, w, h: thickness },
            { x: 0, y: 0, w: thickness, h },
            { x: w - thickness, y: 0, w: thickness, h }
        ];
    }

    function checkRectOverlap(rect, clear) {
        return rect.x < clear.x + clear.w && rect.x + rect.w > clear.x &&
            rect.y < clear.y + clear.h && rect.y + rect.h > clear.y;
    }

    return { pixelsToRects, createMapBorders, checkRectOverlap };
})();
