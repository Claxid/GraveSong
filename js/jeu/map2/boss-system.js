window.Map2BossSystem = (() => {
    const controller = window.Map2FireKnightBossController;
    const ui = window.Map2FireKnightBossUi;

    return {
        createFireKnightBoss: controller.createFireKnightBoss,
        drawBossHealthBar: ui.drawBossHealthBar
    };
})();

