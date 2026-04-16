window.GameCinematics = (() => {
    function startDeath(state, onComplete) {
        if (state.active) return;
        state.active = true;
        state.startAt = performance.now();
        state.onComplete = onComplete;
    }

    function updateDeath(state, now, durationMs) {
        if (!state.active) return;
        const elapsed = now - state.startAt;
        if (elapsed < durationMs) return;

        const callback = state.onComplete;
        state.active = false;
        state.onComplete = null;
        if (typeof callback === "function") {
            callback();
        }
    }

    function startTeleport(state, targetHref) {
        if (state.active) return;
        state.active = true;
        state.startAt = performance.now();
        state.targetHref = targetHref;
    }

    function updateTeleport(state, now, durationMs) {
        if (!state.active) return;
        const elapsed = now - state.startAt;
        if (elapsed < durationMs) return;

        const targetHref = state.targetHref;
        state.active = false;
        state.targetHref = null;
        if (targetHref) {
            window.location.href = targetHref;
        }
    }

    function drawDeathOverlay(ctx, canvas, now, state, options) {
        if (!state.active) return;

        const clamp = window.GameUiUtils.clamp;
        const elapsed = now - state.startAt;
        const flashStartAt = 1200;
        const flashPhase1 = flashStartAt + options.flashInMs;
        const flashPhase2 = flashPhase1 + options.flashHoldMs;
        const flashPhase3 = flashPhase2 + options.flashOutMs;

        let whiteAlpha = 0;
        if (elapsed >= flashStartAt && elapsed <= flashPhase1) {
            whiteAlpha = clamp((elapsed - flashStartAt) / Math.max(1, options.flashInMs), 0, 1);
        } else if (elapsed <= flashPhase2) {
            whiteAlpha = 1;
        } else if (elapsed <= flashPhase3) {
            const fadeT = (elapsed - flashPhase2) / Math.max(1, options.flashOutMs);
            whiteAlpha = 1 - clamp(fadeT, 0, 1);
        }

        const statue0BaseAlpha = clamp(elapsed / 520, 0, 1);
        const statue1FadeIn = clamp((elapsed - flashPhase2) / 760, 0, 1);
        const statue0Alpha = statue0BaseAlpha * (1 - statue1FadeIn);
        const statue1Alpha = statue1FadeIn;
        const darkness = clamp((elapsed - 500) / 1200, 0, 1) * 0.45;

        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${darkness.toFixed(3)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const drawFittedImage = (image, alpha, offsetXRatio = 0, offsetYRatio = 0) => {
            if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || alpha <= 0.001) {
                return;
            }
            const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * options.statueScale;
            const drawW = image.naturalWidth * scale;
            const drawH = image.naturalHeight * scale;
            const drawX = (canvas.width - drawW) / 2 + offsetXRatio * canvas.width;
            const drawY = (canvas.height - drawH) / 2 + offsetYRatio * canvas.height;
            ctx.globalAlpha = alpha;
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(image, drawX, drawY, drawW, drawH);
        };

        const sprite0Ready = options.sprite0.complete && options.sprite0.naturalWidth > 0;
        const sprite1Ready = options.sprite1.complete && options.sprite1.naturalWidth > 0;

        if (sprite0Ready) drawFittedImage(options.sprite0, statue0Alpha, 0, 0);
        if (sprite1Ready) drawFittedImage(options.sprite1, statue1Alpha, options.statue1OffsetX, options.statue1OffsetY);

        if (!sprite0Ready && !sprite1Ready) {
            const fallbackAlpha = Math.max(statue0Alpha, statue1Alpha);
            const size = Math.min(canvas.width, canvas.height) * 0.6;
            ctx.globalAlpha = fallbackAlpha;
            ctx.fillStyle = "rgba(245, 245, 245, 0.9)";
            ctx.beginPath();
            ctx.moveTo(canvas.width * 0.5 - size * 0.16, canvas.height * 0.5 + size * 0.24);
            ctx.lineTo(canvas.width * 0.5 + size * 0.16, canvas.height * 0.5 + size * 0.24);
            ctx.lineTo(canvas.width * 0.5 + size * 0.13, canvas.height * 0.5 - size * 0.12);
            ctx.arc(canvas.width * 0.5, canvas.height * 0.5 - size * 0.12, size * 0.13, 0, Math.PI, true);
            ctx.closePath();
            ctx.fill();
        }

        if (whiteAlpha > 0.001) {
            ctx.globalAlpha = whiteAlpha * options.flashIntensity;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.restore();
    }

    function drawTeleportOverlay(ctx, canvas, now, state, options) {
        if (!state.active) return;

        const clamp = window.GameUiUtils.clamp;
        const elapsed = now - state.startAt;
        const flashStartAt = 180;
        const flashPhase1 = flashStartAt + options.flashInMs;
        const flashPhase2 = flashPhase1 + options.flashHoldMs;
        const flashPhase3 = flashPhase2 + options.flashOutMs;

        let glowAlpha = 0;
        if (elapsed >= flashStartAt && elapsed <= flashPhase1) {
            glowAlpha = clamp((elapsed - flashStartAt) / Math.max(1, options.flashInMs), 0, 1);
        } else if (elapsed <= flashPhase2) {
            glowAlpha = 1;
        } else if (elapsed <= flashPhase3) {
            const fadeT = (elapsed - flashPhase2) / Math.max(1, options.flashOutMs);
            glowAlpha = 1 - clamp(fadeT, 0, 1);
        }

        const outerAlpha = clamp((elapsed - 80) / 420, 0, 1) * 0.4;
        const pulseT = clamp(elapsed / options.durationMs, 0, 1);
        const pulseSize = 0.18 + pulseT * 0.42;

        ctx.save();
        ctx.fillStyle = `rgba(150, 220, 255, ${outerAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const gradient = ctx.createRadialGradient(
            canvas.width * 0.5,
            canvas.height * 0.5,
            Math.min(canvas.width, canvas.height) * 0.05,
            canvas.width * 0.5,
            canvas.height * 0.5,
            Math.min(canvas.width, canvas.height) * pulseSize
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, glowAlpha * 1.1)})`);
        gradient.addColorStop(0.35, `rgba(170, 235, 255, ${glowAlpha * 0.95})`);
        gradient.addColorStop(0.7, `rgba(75, 180, 255, ${glowAlpha * 0.45})`);
        gradient.addColorStop(1, "rgba(75, 180, 255, 0)");

        ctx.globalCompositeOperation = "screen";
        ctx.filter = `blur(${12 + glowAlpha * 18}px)`;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(canvas.width * 0.5, canvas.height * 0.5, Math.min(canvas.width, canvas.height) * pulseSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.filter = `blur(${4 + glowAlpha * 8}px)`;
        ctx.fillStyle = `rgba(230, 250, 255, ${glowAlpha * options.glowIntensity})`;
        ctx.beginPath();
        ctx.arc(canvas.width * 0.5, canvas.height * 0.5, Math.min(canvas.width, canvas.height) * (0.14 + pulseT * 0.2), 0, Math.PI * 2);
        ctx.fill();

        ctx.filter = "none";
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
    }

    return {
        startDeath,
        updateDeath,
        startTeleport,
        updateTeleport,
        drawDeathOverlay,
        drawTeleportOverlay
    };
})();
