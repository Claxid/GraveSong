

function createPlayerController(canvas, ctx, camera, worldBounds = null) {
    if (!window.GamePlayerController || typeof window.GamePlayerController.createPlayerController !== "function") {
        throw new Error("GamePlayerController module is not loaded.");
    }

    return window.GamePlayerController.createPlayerController(canvas, ctx, camera, worldBounds);
}
