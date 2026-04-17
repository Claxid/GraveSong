// Axe spell module used by player controller.
(function initAxeSpellModule(globalScope) {
    const root = globalScope;
    root.PlayerSpells = root.PlayerSpells || {};

    root.PlayerSpells.createAxeSpell = function createAxeSpell({ ctx, camera, player, attackStats, normalizeAngle }) {
        const axeSprite = new Image();
        axeSprite.src = "../assets/sprites/axe.png";
        const infernalAxeSprite = new Image();
        infernalAxeSprite.src = "../assets/sprites/axe(2).png";

        let axeSourceRect = null;
        let axePivot = null;
        let infernalAxeSourceRect = null;
        let infernalAxePivot = null;

        const state = {
            active: false,
            count: 0,
            angle: 0,
            spinAngle: 0,
            spinSpeed: 0.10,
            radius: 72,
            angularSpeed: 0.045,
            damageMultiplier: 1.35,
            infernalDamageMultiplier: 3.25,
            hitCooldown: 220,
            size: 60,
            lastHitByEnemy: new Map()
        };

        function extractAxeBounds(image) {
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

        axeSprite.addEventListener("load", () => {
            try {
                const bounds = extractAxeBounds(axeSprite);
                axeSourceRect = bounds.sourceRect;
                axePivot = bounds.pivot;
            } catch (_err) {
                axeSourceRect = null;
                axePivot = null;
            }
        });

        infernalAxeSprite.addEventListener("load", () => {
            try {
                const bounds = extractAxeBounds(infernalAxeSprite);
                infernalAxeSourceRect = bounds.sourceRect;
                infernalAxePivot = bounds.pivot;
            } catch (_err) {
                infernalAxeSourceRect = null;
                infernalAxePivot = null;
            }
        });

        function setCount(count) {
            state.count = Math.max(0, Number(count) || 0);
            state.active = state.count > 0;
        }

        function update(enemies, now) {
            if (!state.active) return;

            state.angle = normalizeAngle(state.angle + state.angularSpeed);
            state.spinAngle = normalizeAngle(state.spinAngle + state.spinSpeed);

            const axeCount = Math.max(1, Math.min(5, state.count));
            const step = (Math.PI * 2) / axeCount;
            const axeHitRadius = 42;
            const useInfernalAxe = axeCount >= 5;
            const damageMultiplier = useInfernalAxe ? state.infernalDamageMultiplier : state.damageMultiplier;
            const axeDamage = Math.max(1, attackStats.damage * damageMultiplier);

            for (let axeIdx = 0; axeIdx < axeCount; axeIdx++) {
                const axeAngle = state.angle + step * axeIdx;
                const axeX = player.x + Math.cos(axeAngle) * state.radius;
                const axeY = player.y + Math.sin(axeAngle) * state.radius;

                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    if (!enemy || enemy.hp <= 0) continue;

                    const dx = enemy.x - axeX;
                    const dy = enemy.y - axeY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > axeHitRadius) continue;

                    const enemyId = enemy.id ?? i;
                    const cooldownKey = `${enemyId}:${axeIdx}`;
                    const lastHitTime = state.lastHitByEnemy.get(cooldownKey) ?? 0;
                    if (now - lastHitTime < state.hitCooldown) continue;

                    const appliedAxeDamage = enemy.type === "orc" ? enemy.hp : axeDamage;
                    enemy.hp = Math.max(0, enemy.hp - appliedAxeDamage);
                    state.lastHitByEnemy.set(cooldownKey, now);
                }
            }
        }

        function draw() {
            if (!state.active) return;

            const axeSize = state.size * camera.zoom;
            const axeCount = Math.max(1, Math.min(5, state.count));
            const step = (Math.PI * 2) / axeCount;
            const useInfernalAxe = axeCount >= 5 && infernalAxeSprite.complete && infernalAxeSprite.naturalWidth > 0;
            const activeSprite = useInfernalAxe ? infernalAxeSprite : axeSprite;
            const sourceRect = useInfernalAxe
                ? (infernalAxeSourceRect || { sx: 0, sy: 0, sw: activeSprite.naturalWidth || 1, sh: activeSprite.naturalHeight || 1 })
                : (axeSourceRect || { sx: 0, sy: 0, sw: activeSprite.naturalWidth || 1, sh: activeSprite.naturalHeight || 1 });
            const pivot = useInfernalAxe
                ? (infernalAxePivot || { x: sourceRect.sw / 2, y: sourceRect.sh / 2 })
                : (axePivot || { x: sourceRect.sw / 2, y: sourceRect.sh / 2 });

            for (let axeIdx = 0; axeIdx < axeCount; axeIdx++) {
                const axeAngle = state.angle + step * axeIdx;
                const axeX = (player.x + Math.cos(axeAngle) * state.radius - camera.x) * camera.zoom;
                const axeY = (player.y + Math.sin(axeAngle) * state.radius - camera.y) * camera.zoom;
                const renderScale = axeSize / Math.max(sourceRect.sw, sourceRect.sh);
                const renderW = sourceRect.sw * renderScale;
                const renderH = sourceRect.sh * renderScale;

                ctx.save();
                ctx.translate(axeX, axeY);
                ctx.rotate(axeAngle + Math.PI + state.spinAngle);
                if (activeSprite.complete && activeSprite.naturalWidth > 0) {
                    ctx.drawImage(
                        activeSprite,
                        sourceRect.sx,
                        sourceRect.sy,
                        sourceRect.sw,
                        sourceRect.sh,
                        -pivot.x * renderScale,
                        -pivot.y * renderScale,
                        renderW,
                        renderH
                    );
                }
                ctx.restore();
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
