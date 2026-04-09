// Fichier principal du jeu
// Importe tous les modules et lance le jeu

// Imports des modules
// Note: En JavaScript vanilla, on utilise des scripts séparés dans le HTML
// Ces imports sont conceptuels pour montrer la structure modulaire

console.log("🎮 Chargement du jeu principal...");

// Les modules sont chargés via les scripts dans ville.html
// game-setup.js, game-enemies.js, game-interface.js, game-main-loop.js

function startGame() {
    console.log("🚀 Démarrage du jeu...");

    // Initialisation
    initGame();
    initSpawns();
    initUI();

    // Lancement de la boucle
    console.log("▶️ Boucle de jeu démarrée");
    loop();
}

// Attendre que tous les scripts soient chargés
window.addEventListener('load', () => {
    console.log("📦 Tous les scripts chargés, démarrage du jeu...");
    startGame();
});