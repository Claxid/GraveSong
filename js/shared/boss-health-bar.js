/**
 * Reusable Boss Health Bar Component
 * Handles proper rendering with clipping, layering, and text alignment
 */
window.BossHealthBarComponent = (() => {
    /**
     * Creates a boss health bar renderer
     * @param {Object} config Configuration options
     * @param {number} config.maxWidth Maximum bar width (default: 380px)
     * @param {number} config.screenWidthRatio Ratio of screen width to use (default: 0.31)
     * @param {number} config.topOffset Offset from top (default: 14px)
     * @param {boolean} config.showBossName Show boss name text (default: true)
     * @param {string} config.bossName Boss name to display (default: "BOSS")
     * @returns {Object} Health bar renderer object
     */
    function createHealthBar(config = {}) {
        const {
            maxWidth = 380,
            screenWidthRatio = 0.31,
            topOffset = 14,
            showBossName = true,
            bossName = "BOSS"
        } = config;

        // Clamp function
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        /**
         * Draws the health bar
         * @param {CanvasRenderingContext2D} ctx Canvas context
         * @param {HTMLCanvasElement} canvas Canvas element
         * @param {number} hp Current health
         * @param {number} maxHp Maximum health
         * @param {Object} sprites Sprite objects {under, progress, over}
         */
        function draw(ctx, canvas, hp, maxHp, sprites) {
            if (!sprites || !sprites.under || !sprites.progress || !sprites.over) {
                drawFallback(ctx, canvas, hp, maxHp);
                return;
            }

            const hpRatio = clamp(hp / Math.max(1, maxHp), 0, 1);
            const uiReady = checkSpritesReady(sprites);

            if (uiReady) {
                drawWithSprites(ctx, canvas, hpRatio, sprites, bossName);
            } else {
                drawFallback(ctx, canvas, hp, maxHp);
            }
        }

        /**
         * Checks if all sprite images are loaded
         */
        function checkSpritesReady(sprites) {
            return sprites.under.complete && sprites.progress.complete && sprites.over.complete &&
                   sprites.under.naturalWidth > 0 && sprites.progress.naturalWidth > 0 && sprites.over.naturalWidth > 0;
        }

        /**
         * Calculates bar dimensions
         */
        function calculateDimensions(canvas) {
            const barWidth = Math.min(canvas.width * screenWidthRatio, maxWidth);
            const barHeight = barWidth * 0.15; // Aspect ratio
            const barX = (canvas.width - barWidth) / 2;
            const barY = topOffset;

            return { barWidth, barHeight, barX, barY };
        }

        /**
         * Draws the health bar using sprites with proper clipping
         */
        function drawWithSprites(ctx, canvas, hpRatio, sprites, bossName) {
            const { barWidth, barHeight, barX, barY } = calculateDimensions(canvas);

            // LAYER 1: Background (under sprite)
            ctx.drawImage(sprites.under, barX, barY, barWidth, barHeight);

            // LAYER 2: Health fill with clipping
            drawHealthFill(ctx, barX, barY, barWidth, barHeight, hpRatio, sprites);

            // LAYER 3: Border/Overlay (over sprite)
            ctx.drawImage(sprites.over, barX, barY, barWidth, barHeight);

            // LAYER 4: Boss name text (above or on bar)
            if (showBossName && bossName) {
                drawBossName(ctx, canvas, barX, barY, barWidth, barHeight, bossName);
            }
        }

        /**
         * Draws the health fill with proper clipping
         */
        function drawHealthFill(ctx, barX, barY, barWidth, barHeight, hpRatio, sprites) {
            const fillInset = Math.max(3, Math.round(barHeight * 0.1));
            const fillX = barX + fillInset;
            const fillY = barY + fillInset;
            const fillWidth = Math.max(0, barWidth - fillInset * 2);
            const fillHeight = Math.max(0, barHeight - fillInset * 2);

            if (fillWidth <= 0 || fillHeight <= 0) return;

            // Calculate the portion of the sprite to draw
            const spriteSourceWidth = sprites.progress.naturalWidth;
            const spriteSourceHeight = sprites.progress.naturalHeight;
            const clippedSourceWidth = Math.max(0, Math.floor(spriteSourceWidth * hpRatio));
            const filledWidth = Math.max(0, Math.floor(fillWidth * hpRatio));

            if (clippedSourceWidth <= 0 || filledWidth <= 0) return;

            // Save canvas state, apply clipping, draw, restore
            ctx.save();
            {
                // Create rectangular clipping region
                ctx.beginPath();
                ctx.rect(fillX, fillY, filledWidth, fillHeight);
                ctx.clip();

                // Draw the progress bar within the clipped region
                ctx.drawImage(
                    sprites.progress,
                    0, 0,
                    clippedSourceWidth, spriteSourceHeight,
                    fillX, fillY,
                    filledWidth, fillHeight
                );
            }
            ctx.restore();
        }

        /**
         * Draws the boss name text above the health bar
         */
        function drawBossName(ctx, canvas, barX, barY, barWidth, barHeight, name) {
            const textBoxHeight = Math.max(16, Math.round(barHeight * 0.28));
            const textBoxY = barY - textBoxHeight - 4; // Position above the bar with spacing
            const textBoxInset = Math.max(30, Math.round(barWidth * 0.12));
            const textBoxX = barX + textBoxInset;
            const textBoxWidth = barWidth - textBoxInset * 2;

            if (textBoxWidth <= 0) return;

            ctx.save();
            {
                // Draw background box for text
                ctx.fillStyle = "rgba(12, 6, 6, 0.75)";
                ctx.fillRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);

                // Draw border
                ctx.strokeStyle = "rgba(240, 205, 120, 0.85)";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);

                // Draw text
                const fontSize = Math.max(12, Math.round(textBoxHeight * 0.65));
                ctx.fillStyle = "rgba(250, 240, 210, 0.98)";
                ctx.font = `700 ${fontSize}px Georgia, serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 1;
                ctx.fillText(name, textBoxX + textBoxWidth / 2, textBoxY + textBoxHeight / 2);

                // Clear shadow for next drawing operations
                ctx.shadowColor = "transparent";
            }
            ctx.restore();
        }

        /**
         * Fallback rendering without sprite images
         */
        function drawFallback(ctx, canvas, hp, maxHp) {
            const hpRatio = clamp(hp / Math.max(1, maxHp), 0, 1);
            const { barWidth, barHeight, barX, barY } = calculateDimensions(canvas);

            const actualHeight = Math.max(24, Math.round(barHeight));
            const actualY = barY + (barHeight - actualHeight) / 2;

            // Background
            ctx.fillStyle = "rgba(35, 12, 12, 0.9)";
            ctx.fillRect(barX, actualY, barWidth, actualHeight);

            // Health fill
            ctx.fillStyle = "rgba(200, 60, 60, 0.95)";
            ctx.fillRect(barX, actualY, barWidth * hpRatio, actualHeight);

            // Border
            ctx.strokeStyle = "rgba(240, 205, 120, 0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, actualY, barWidth, actualHeight);

            // Text fallback
            if (showBossName && bossName) {
                ctx.fillStyle = "rgba(250, 240, 210, 0.95)";
                ctx.font = "bold 14px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(bossName, canvas.width / 2, barY - 5);
            }
        }

        return {
            draw,
            calculateDimensions
        };
    }

    return {
        createHealthBar
    };
})();
