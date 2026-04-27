window.Map2LoopRenderScene = {
    drawWorld(shouldDrawBoss, playerHitbox) {
        const fireKnightBoss = window.fireKnightBoss;
        cameraController.centerOn(playerController.player.x, playerController.player.y);

        mapRenderer.draw(cameraController.camera);
        playerController.draw();
        playerController.drawAttacks();

        if (shouldDrawBoss && fireKnightBoss) {
            fireKnightBoss.draw();
        }

        for (const enemyController of enemyControllers) {
            enemyController.draw();
        }

        for (const potion of potions) {
            const size = 55 * cameraController.camera.zoom;
            const drawX = (potion.x - cameraController.camera.x) * cameraController.camera.zoom - size / 2;
            const drawY = (potion.y - cameraController.camera.y) * cameraController.camera.zoom - size / 2;

            if (potionSprite.complete) {
                ctx.drawImage(potionSprite, drawX, drawY, size, size);
            } else {
                ctx.fillStyle = "red";
                ctx.fillRect(drawX, drawY, size, size);
            }
        }

        if (window.drawCollidersOverlay) {
            window.drawCollidersOverlay(ctx, cameraController.camera, cameraController.camera.zoom);
        }

        if (!SHOW_HITBOXES) {
            return;
        }

        ctx.save();
        ctx.lineWidth = 2;

        const pX = (playerHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
        const pY = (playerHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
        const pW = playerHitbox.w * cameraController.camera.zoom;
        const pH = playerHitbox.h * cameraController.camera.zoom;
        ctx.strokeStyle = uiStyles.hitboxPlayerColor;
        ctx.strokeRect(pX, pY, pW, pH);

        ctx.strokeStyle = uiStyles.hitboxEnemyColor;
        for (const enemyController of enemyControllers) {
            const enemyHitbox = getEntityHitbox(enemyController.enemy);
            const eX = (enemyHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
            const eY = (enemyHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
            const eW = enemyHitbox.w * cameraController.camera.zoom;
            const eH = enemyHitbox.h * cameraController.camera.zoom;
            ctx.strokeRect(eX, eY, eW, eH);
        }

        ctx.restore();
    },

    drawFinishOverlay(now) {
        if (!gameFinished) {
            return false;
        }

        ctx.save();
        if (victoryParchmentSprite.complete && victoryParchmentSprite.naturalWidth > 0) {
            ctx.drawImage(victoryParchmentSprite, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(34, 20, 10, 0.22)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#d9c19a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = "#f4ecc9";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 84px Georgia";
        ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
        ctx.shadowBlur = 5;
        ctx.fillText("FIN", canvas.width / 2, canvas.height / 2 - 12);
        ctx.shadowBlur = 3;
        ctx.font = "700 24px Georgia";
        ctx.fillText("Le Fire Demon est vaincu.", canvas.width / 2, canvas.height / 2 + 44);
        ctx.restore();

        return now - gameFinishedAt >= GAME_FINISH_HOLD_MS;
    }
};