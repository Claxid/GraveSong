function loop() {
    const now = performance.now();
    const fireKnightBoss = window.fireKnightBoss;
    const bossDefeated = window.bossDefeated;
    
    updateDeathCinematic(now);
    updateTeleportCinematic(now);

    const canUpdateWorld = !playerController.hasPendingPerks() && !deathCinematic.active && !teleportCinematic.active;
    const bossDeathAnimRunning = Boolean(
        fireKnightBoss &&
        typeof fireKnightBoss.isDeathAnimationFinished === "function" &&
        !fireKnightBoss.isDeathAnimationFinished()
    );
    const shouldDrawBoss = Boolean(
        fireKnightBoss &&
        fireKnightBoss.boss &&
        (fireKnightBoss.boss.hp > 0 || bossDefeated)
    );
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    window.Map2LoopUpdate.updateActorsAndEncounters(now, canUpdateWorld, bossDeathAnimRunning);
    window.Map2LoopPlayerState.queuePerksOnLevelGain();

    const playerHitbox = getEntityHitbox(playerController.player);
    window.Map2LoopPlayerState.collectPotions(canUpdateWorld, playerHitbox);
    window.Map2LoopPlayerState.handlePortalTransition(playerHitbox);
    window.Map2LoopPlayerState.applyContactDamage(canUpdateWorld);
    window.Map2LoopPlayerState.handlePlayerDeath();

    window.Map2LoopRenderScene.drawWorld(shouldDrawBoss, playerHitbox);
    window.Map2LoopRenderHud.drawHudAndOverlays(now, clamp);

    const shouldTransitionAfterVictory = window.Map2LoopRenderScene.drawFinishOverlay(now);
    if (shouldTransitionAfterVictory) {
        window.Map2LoopRenderHud.handleVictoryTransition();
        return;
    }

    requestAnimationFrame(loop);
}
