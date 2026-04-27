// Fireball spell module used by player controller.
(function initFireballSpellModule(globalScope) {
    const root = globalScope;
    root.PlayerSpells = root.PlayerSpells || {};

    root.PlayerSpells.createFireballSpell = function createFireballSpell({ ctx, camera, player, attackStats, applyEnemyDamage }) {
        const fireballSprite = new Image();
        fireballSprite.src = "../assets/sprites/Fireball/fireball_0.png";

        const fireballExplosionSprite = new Image();
        fireballExplosionSprite.src = "../assets/sprites/Fireball/toppng.com-explosion-sprite-png-2d-explosion-sprite-sheet-899x857.png";

        let fireballProcessedSprite = null;
        let explosionProcessedSprite = null;
        let fireballSkinRects = [];
        let explosionSkinRects = [];

        const state = {
            active: false,
            count: 0,
            cooldown: 3000,
            speed: 4.5,
            damageMultiplier: 1.6,
            size: 44,
            hitRadius: 20,
            maxTravel: 1000,
            lastCastAt: 0,
            skinFrames: 2,
            skinAnimSpeed: 5,
            explosionSize: 96,
            explosionAnimSpeed: 5,
            explosionFramesToUse: 2,
            explosionCols: 7,
            explosionRows: 7
        };

        const fireballs = [];
        const explosions = [];

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

        function setCount(count) {
            state.count = Math.max(0, Number(count) || 0);
            state.active = state.count > 0;
        }

        function spawnExplosion(x, y) {
            explosions.push({
                x,
                y,
                frame: 0,
                animCounter: 0
            });
        }

        function getNearestEnemies(enemies, sourceX, sourceY, maxTargets) {
            return enemies
                .filter((enemy) => enemy && enemy.hp > 0)
                .map((enemy) => {
                    const dx = enemy.x - sourceX;
                    const dy = enemy.y - sourceY;
                    return {
                        enemy,
                        dist: Math.sqrt(dx * dx + dy * dy)
                    };
                })
                .sort((a, b) => a.dist - b.dist)
                .slice(0, maxTargets)
                .map((entry) => entry.enemy);
        }

        fireballSprite.addEventListener("load", () => {
            try {
                const extracted = extractSpriteRectsFromSheet(fireballSprite, { removeNearBlack: true, maxRects: 2, minArea: 40 });
                fireballProcessedSprite = extracted.canvas;
                fireballSkinRects = extracted.rects;
            } catch (_err) {
                fireballProcessedSprite = null;
                fireballSkinRects = [];
            }
        });

        fireballExplosionSprite.addEventListener("load", () => {
            try {
                const extracted = extractSpriteRectsFromSheet(fireballExplosionSprite, { removeNearBlack: true, maxRects: 2, minArea: 140 });
                explosionProcessedSprite = extracted.canvas;
                explosionSkinRects = extracted.rects;
            } catch (_err) {
                explosionProcessedSprite = null;
                explosionSkinRects = [];
            }
        });

        function update(enemies, now) {
            if (!state.active) {
                return;
            }

            if (enemies.length > 0 && now - state.lastCastAt >= state.cooldown) {
                const fireballCount = Math.max(1, Math.min(6, state.count));
                const targets = getNearestEnemies(enemies, player.x, player.y, fireballCount);

                for (const target of targets) {
                    const dx = target.x - player.x;
                    const dy = target.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= 0.0001) continue;

                    const vx = (dx / distance) * state.speed;
                    const vy = (dy / distance) * state.speed;

                    fireballs.push({
                        x: player.x,
                        y: player.y,
                        vx,
                        vy,
                        frameX: Math.floor(Math.random() * Math.max(1, state.skinFrames)),
                        animCounter: 0,
                        traveled: 0
                    });
                }

                if (targets.length > 0) {
                    state.lastCastAt = now;
                }
            }

            const fireballDamage = Math.max(1, Math.round(attackStats.damage * state.damageMultiplier));

            for (let i = fireballs.length - 1; i >= 0; i--) {
                const fireball = fireballs[i];
                fireball.x += fireball.vx;
                fireball.y += fireball.vy;
                fireball.traveled += Math.sqrt(fireball.vx * fireball.vx + fireball.vy * fireball.vy);

                fireball.animCounter++;
                if (fireball.animCounter >= state.skinAnimSpeed) {
                    fireball.animCounter = 0;
                    fireball.frameX = (fireball.frameX + 1) % Math.max(1, state.skinFrames);
                }

                let hit = false;
                for (const enemy of enemies) {
                    if (!enemy || enemy.hp <= 0) continue;

                    const dx = enemy.x - fireball.x;
                    const dy = enemy.y - fireball.y;
                    const enemyRadius = Math.max(enemy.hitW, enemy.hitH) / 2;
                    const hitDistance = state.hitRadius + enemyRadius;

                    if ((dx * dx + dy * dy) > hitDistance * hitDistance) continue;

                    const appliedFireballDamage = enemy.type === "gobelin" ? enemy.hp : fireballDamage;
                    if (typeof applyEnemyDamage === "function") {
                        applyEnemyDamage(enemy, appliedFireballDamage, "Boule de feu");
                    } else {
                        enemy.hp = Math.max(0, enemy.hp - appliedFireballDamage);
                    }
                    spawnExplosion(fireball.x, fireball.y);
                    hit = true;
                    break;
                }

                if (hit || fireball.traveled >= state.maxTravel) {
                    fireballs.splice(i, 1);
                }
            }

            const explosionTotalFrames = Math.max(1, state.explosionFramesToUse);
            for (let i = explosions.length - 1; i >= 0; i--) {
                const explosion = explosions[i];
                explosion.animCounter++;

                if (explosion.animCounter >= state.explosionAnimSpeed) {
                    explosion.animCounter = 0;
                    explosion.frame++;
                }

                if (explosion.frame >= explosionTotalFrames) {
                    explosions.splice(i, 1);
                }
            }
        }

        function draw() {
            if (!state.active) {
                return;
            }

            const fireballSize = state.size * camera.zoom;
            for (const fireball of fireballs) {
                const centerX = (fireball.x - camera.x) * camera.zoom;
                const centerY = (fireball.y - camera.y) * camera.zoom;

                if (fireballSprite.complete && fireballSprite.naturalWidth > 0) {
                    const sourceImage = fireballProcessedSprite || fireballSprite;
                    const fallbackRect = {
                        sx: 0,
                        sy: 0,
                        sw: sourceImage.naturalWidth || sourceImage.width || 1,
                        sh: sourceImage.naturalHeight || sourceImage.height || 1
                    };
                    const frames = fireballSkinRects.length > 0 ? fireballSkinRects : [fallbackRect];
                    const frameIndex = fireball.frameX % Math.max(1, Math.min(state.skinFrames, frames.length));
                    const frameRect = frames[frameIndex] || frames[0];
                    const pivot = { x: frameRect.sw / 2, y: frameRect.sh / 2 };
                    const renderScale = fireballSize / Math.max(frameRect.sw, frameRect.sh);
                    const renderW = frameRect.sw * renderScale;
                    const renderH = frameRect.sh * renderScale;
                    const angle = Math.atan2(fireball.vy, fireball.vx);

                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.rotate(angle + Math.PI / 2);
                    ctx.drawImage(
                        sourceImage,
                        frameRect.sx,
                        frameRect.sy,
                        frameRect.sw,
                        frameRect.sh,
                        -pivot.x * renderScale,
                        -pivot.y * renderScale,
                        renderW,
                        renderH
                    );
                    ctx.restore();
                } else {
                    ctx.fillStyle = "#ff7a00";
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, fireballSize / 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            if (fireballExplosionSprite.complete && fireballExplosionSprite.naturalWidth > 0) {
                const sourceImage = explosionProcessedSprite || fireballExplosionSprite;
                const fallbackRect = {
                    sx: 0,
                    sy: 0,
                    sw: sourceImage.naturalWidth || sourceImage.width || 1,
                    sh: sourceImage.naturalHeight || sourceImage.height || 1
                };
                const frames = explosionSkinRects.length > 0 ? explosionSkinRects : [fallbackRect];
                const frameCount = Math.max(1, Math.min(state.explosionFramesToUse, frames.length));
                const explosionSize = state.explosionSize * camera.zoom;

                for (const explosion of explosions) {
                    const frame = explosion.frame % frameCount;
                    const frameRect = frames[frame] || frames[0];
                    const dx = (explosion.x - camera.x) * camera.zoom - explosionSize / 2;
                    const dy = (explosion.y - camera.y) * camera.zoom - explosionSize / 2;

                    ctx.drawImage(
                        sourceImage,
                        frameRect.sx,
                        frameRect.sy,
                        frameRect.sw,
                        frameRect.sh,
                        dx,
                        dy,
                        explosionSize,
                        explosionSize
                    );
                }
            }
        }

        return {
            state,
            setCount,
            update,
            draw
        };
    };
})(window);
