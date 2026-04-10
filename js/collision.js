window.obstacles = [];

if (window.CollisionAnalyzer && window.CollisionDebugOverlay) {
    window.CollisionAnalyzer.analyzeMapImage();
    window.CollisionDebugOverlay.installToggle();

    window.rectCollision = window.CollisionDebugOverlay.rectCollision;
    window.drawCollidersOverlay = window.CollisionDebugOverlay.drawCollidersOverlay;
} else {
    console.error("Les modules de collision ne sont pas charges correctement.");
}