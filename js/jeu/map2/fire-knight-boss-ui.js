window.Map2FireKnightBossUi = (() => {
    const FIRE_DEMON_LABEL_SCALE = 0.17;
    const FIRE_DEMON_LABEL_MIN_PX = 8;
    const FIRE_DEMON_LABEL_FONT_FAMILY = '"Press Start 2P", "Pixelify Sans", "VT323", monospace';
    const FIRE_DEMON_LABEL_Y_RATIO = 0.48;

    function drawBossHealthBar(ctx, canvas, clamp, bossEnemy, sprites) {
        if (!bossEnemy) return;

        const hpRatio = clamp(bossEnemy.hp / Math.max(1, bossEnemy.maxhp), 0, 1);
        const uiReady = sprites.under.complete && sprites.progress.complete &&
            sprites.under.naturalWidth > 0 && sprites.progress.naturalWidth > 0;

        const targetWidth = Math.min(canvas.width * 0.31, 380);
        const targetHeight = targetWidth * (sprites.under.naturalHeight / Math.max(1, sprites.under.naturalWidth));
        const x = (canvas.width - targetWidth) / 2;
        const y = 14;

        if (uiReady) {
            ctx.drawImage(sprites.under, x, y, targetWidth, targetHeight);

            const fullSourceWidth = sprites.progress.naturalWidth;
            const sourceHeight = sprites.progress.naturalHeight;
            const filledSourceWidth = Math.max(0, Math.floor(fullSourceWidth * hpRatio));
            const progressInset = Math.max(3, Math.round(targetHeight * 0.09));
            const progressX = Math.round(x + progressInset);
            const progressY = Math.round(y + progressInset);
            const progressW = Math.max(0, Math.floor(targetWidth - progressInset * 2));
            const progressH = Math.max(0, Math.floor(targetHeight - progressInset * 2));
            const safetyPx = 2;
            const maxFillWidth = Math.max(0, progressW - safetyPx);
            const filledTargetWidth = Math.max(0, Math.floor(maxFillWidth * hpRatio));

            if (filledSourceWidth > 0 && filledTargetWidth > 0 && progressH > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(progressX, progressY, Math.max(0, progressW - safetyPx), progressH);
                ctx.clip();
                ctx.drawImage(
                    sprites.progress,
                    0,
                    0,
                    filledSourceWidth,
                    sourceHeight,
                    progressX,
                    progressY,
                    filledTargetWidth,
                    progressH
                );
                ctx.restore();
            }

            ctx.save();
            const labelSize = Math.max(FIRE_DEMON_LABEL_MIN_PX, Math.round(targetHeight * FIRE_DEMON_LABEL_SCALE));
            const labelX = x + targetWidth / 2;
            const labelY = y + targetHeight * FIRE_DEMON_LABEL_Y_RATIO;

            ctx.imageSmoothingEnabled = false;
            ctx.font = `700 ${labelSize}px ${FIRE_DEMON_LABEL_FONT_FAMILY}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(1, Math.round(labelSize * 0.2));
            ctx.strokeStyle = "rgba(58, 18, 26, 0.95)";
            ctx.strokeText("FIRE DEMON", labelX, labelY);
            ctx.fillStyle = "rgba(236, 236, 236, 0.9)";
            ctx.fillText("FIRE DEMON", labelX, labelY);
            ctx.restore();
        } else {
            const fallbackH = 24;
            const fallbackY = y + (targetHeight - fallbackH) / 2;
            ctx.fillStyle = "rgba(35, 12, 12, 0.9)";
            ctx.fillRect(x, fallbackY, targetWidth, fallbackH);
            ctx.fillStyle = "rgba(196, 56, 56, 0.95)";
            ctx.fillRect(x, fallbackY, targetWidth * hpRatio, fallbackH);
            ctx.strokeStyle = "rgba(240, 205, 120, 0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, fallbackY, targetWidth, fallbackH);

            const fallbackLabelSize = Math.max(FIRE_DEMON_LABEL_MIN_PX, Math.round(fallbackH * 0.4));
            ctx.font = `700 ${fallbackLabelSize}px ${FIRE_DEMON_LABEL_FONT_FAMILY}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(1, Math.round(fallbackLabelSize * 0.2));
            ctx.strokeStyle = "rgba(58, 18, 26, 0.95)";
            ctx.strokeText("FIRE DEMON", canvas.width / 2, fallbackY + fallbackH * 0.53);
            ctx.fillStyle = "rgba(236, 236, 236, 0.9)";
            ctx.fillText("FIRE DEMON", canvas.width / 2, fallbackY + fallbackH * 0.53);
        }
    }

    return {
        drawBossHealthBar
    };
})();