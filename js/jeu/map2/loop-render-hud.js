window.Map2LoopRenderHud = {
    drawHudAndOverlays(now, clampFn) {
        const hudBottomY = canvas.height - uiStyles.expOffsetTop;
        const expBarHeight = uiStyles.expBarHeight;
        const barX = uiStyles.hpOffsetLeft;
        const barY = hudBottomY - expBarHeight;
        const barWidth = uiStyles.hpBarWidth;
        const barHeight = uiStyles.hpBarHeight;
        const hpRatio = playerController.player.hp / playerController.player.maxHp;

        ctx.fillStyle = uiStyles.hpBorderColor;
        ctx.fillRect(
            barX - uiStyles.barBorderPadding,
            barY - uiStyles.barBorderPadding,
            barWidth + uiStyles.barBorderPadding * 2,
            barHeight + uiStyles.barBorderPadding * 2
        );
        ctx.fillStyle = uiStyles.barBackgroundColor;
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = uiStyles.hpFillColor;
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        ctx.fillStyle = uiStyles.levelTextColor;
        ctx.font = uiStyles.levelFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.floor(playerController.player.hp)}/${Math.floor(playerController.player.maxHp)}`, barX + barWidth / 2, barY + barHeight / 2);

        const expBarWidth = uiStyles.expBarWidth;
        const expBarX = (canvas.width / 2) - (expBarWidth / 2);
        const expBarY = hudBottomY - expBarHeight;
        const expRatio = playerController.player.exp / playerController.player.maxExp;

        ctx.fillStyle = uiStyles.expBorderColor;
        ctx.fillRect(
            expBarX - uiStyles.barBorderPadding,
            expBarY - uiStyles.barBorderPadding,
            expBarWidth + uiStyles.barBorderPadding * 2,
            expBarHeight + uiStyles.barBorderPadding * 2
        );
        ctx.fillStyle = uiStyles.barBackgroundColor;
        ctx.fillRect(expBarX, expBarY, expBarWidth, expBarHeight);
        ctx.fillStyle = uiStyles.expFillColor;
        ctx.fillRect(expBarX, expBarY, expBarWidth * expRatio, expBarHeight);

        ctx.fillStyle = uiStyles.levelTextColor;
        ctx.font = uiStyles.levelFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`level : ${playerController.player.level}`, canvas.width / 2, expBarY + expBarHeight / 2);

        ctx.fillStyle = uiStyles.killTextColor;
        ctx.font = uiStyles.killFont;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(`Kills : ${killCount}`, canvas.width - uiStyles.killOffsetRight, uiStyles.killOffsetTop);

        const elapsedTime = window.GameUiUtils.formatElapsedTime(performance.now() - gameStartAt);
        ctx.fillStyle = uiStyles.timerTextColor;
        ctx.font = uiStyles.timerFont;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(`Temps : ${elapsedTime}`, canvas.width - uiStyles.timerOffsetRight, uiStyles.timerOffsetTop);

        const perkChoices = playerController.getCurrentPerkChoices();
        if (perkChoices) {
            drawPerkOverlay(perkChoices);
        }

        if (fireKnightBoss && fireKnightBoss.boss.hp > 0) {
            window.Map2BossSystem.drawBossHealthBar(ctx, canvas, clampFn, fireKnightBoss.boss, bossHealthBarSprites);
        }

        drawDeathCinematicOverlay(now);
        drawTeleportCinematicOverlay(now);
    },

    handleVictoryTransition() {
        if (isChangingMap) {
            return;
        }

        if (window.Map2Audio && typeof window.Map2Audio.markRestartOnNextLoad === "function") {
            window.Map2Audio.markRestartOnNextLoad();
        }
        if (window.Map2Audio && typeof window.Map2Audio.stopNow === "function") {
            window.Map2Audio.stopNow();
        }
        if (typeof playerController.clearPersistentProgress === "function") {
            playerController.clearPersistentProgress();
        }
        isChangingMap = true;
        window.location.href = "ville.html";
    }
};