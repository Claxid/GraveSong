// Fichier principal du joueur
// Importe tous les modules du joueur et crée le contrôleur complet

console.log("📝 player.js chargé");

// Fonction principale qui crée le contrôleur du joueur complet
function createPlayerController(canvas, ctx, camera, isMap1 = false) {
    // Créer le contrôleur de base
    const controller = createPlayerMovementController(canvas, ctx, camera);

    // Ajouter le système d'attaques
    const attacks = createPlayerAttacks(controller.player, camera, isMap1);

    // Ajouter le système de perks
    const perks = createPlayerPerks(attacks.attackStats, attacks.syncDerivedAttackVisualStats);

    // Activer la hache si nécessaire
    if (attacks.attackStats.Axe) {
        attacks.axeState.active = true;
    }

    // Fonction update combinée
    function update(enemies = []) {
        controller.update(enemies);
        attacks.updateAttacks(enemies);
    }

    // Fonction draw combinée
    function draw() {
        controller.draw();
    }

    // Fonction drawAttacks déléguée
    function drawAttacks() {
        attacks.drawAttacks();
    }

    // Retourner l'interface complète
    return {
        player: controller.player,
        update,
        draw,
        drawAttacks,
        queuePerkChoices: perks.queuePerkChoices,
        getCurrentPerkChoices: perks.getCurrentPerkChoices,
        hasPendingPerks: perks.hasPendingPerks,
        applyPerkByIndex: perks.applyPerkByIndex,
        triggerHurt: controller.triggerHurt,
        getAttackStats: attacks.getAttackStats
    };
}