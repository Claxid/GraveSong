// TESTS D'ÉVÉNEMENTS - POUR LE DÉVELOPPEMENT
// ==========================================
//
// CE FICHIER SERT À TESTER LES ÉVÉNEMENTS MANUELLEMENT
// AU LIEU D'ATTENDRE QU'ILS SE DÉCLENCHENT ALÉATOIREMENT
//
// COMMENT ÇA MARCHE :
// - Ouvre la console du navigateur (F12)
// - Tape les commandes pour tester chaque événement
//
// COMMANDES DISPONIBLES :
// tn()  = Test 🌑 Nuit noire (vision réduite)
// tr()  = Test 🔥 Rage (ennemis rapides)
// tp()  = Test 💀 Pluie de sang (double spawn)
// tb()  = Test ✨ Bénédiction (régénération)
// stop() = Arrêter l'événement actuel
// status() = Voir l'état actuel
//
// EXEMPLE D'UTILISATION :
// 1. Lance le jeu
// 2. Ouvre F12 → Console
// 3. Tape "tn()" → vois l'écran s'assombrir
// 4. Tape "stop()" → reviens à la normale
//
// ==========================================

// Test des événements - Version simplifiée
console.log("🧪 Tests chargés");

// Test rapide d'un événement
window.test = (id) => {
    currentEvent = EVENTS[id];
    eventStart = now();
    eventEnd = eventStart + currentEvent.dur;
    applyEffect(true);
    msg = `${currentEvent.name} !`;
    msgTime = now();
    console.log(`🧪 ${currentEvent.name}`);
};

// Alias pour chaque événement
window.tn = () => test('nuit_noire');   // 🌑
window.tr = () => test('rage');         // 🔥
window.tp = () => test('pluie_sang');   // 💀
window.tb = () => test('benediction');  // ✨

// Arrêter et status
window.stop = () => { if (currentEvent) endEvent(); };
window.status = () => console.log('État:', currentEvent?.name || 'Aucun', getEventMult());