window.CollisionMaskUtils = (() => {
    function idxAt(x, y, width) {
        return y * width + x;
    }

    function isInBounds(x, y, width, height) {
        return x >= 0 && y >= 0 && x < width && y < height;
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
                        if (isInBounds(nx, ny, width, height)) {
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
            if (!mask[i] && !exterior[i]) mask[i] = 1;
        }
    }

    return { idxAt, dilateMask, blockInternalHoles };
})();
