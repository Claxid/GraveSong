// ÉVÉNEMENTS ALÉATOIRES - EXPLICATION SIMPLE
// ==========================================
//
// CE FICHIER CONTIENT TOUT LE SYSTÈME D'ÉVÉNEMENTS :
//
// 1. EVENTS = configuration des 4 événements
// 2. Variables globales = état actuel (currentEvent, multiplicateurs, etc.)
// 3. startEvent() = démarre un événement aléatoire
// 4. endEvent() = termine l'événement actuel
// 5. updateEvents() = appelée chaque frame pour gérer le timing
// 6. drawEffects() = dessine les effets visuels
// 7. drawMsg() = affiche les messages
// 8. API publique = fonctions accessibles depuis les autres fichiers
//
// COMMENT ÇA MARCHE :
// - updateEvents() vérifie chaque frame si il faut déclencher un événement
// - Quand un événement démarre, applyEffect(true) change les multiplicateurs
// - drawEffects() dessine les effets visuels selon l'événement actif
// - Après la durée, endEvent() remet tout à zéro
//
// ==========================================

// Événements aléatoires - Version simplifiée
console.log("🎲 Événements chargés");

// Configuration des événements
const EVENTS = {
    nuit_noire: { name: "🌑 Nuit noire", desc: "Vision réduite", dur: 15000, eff: "vision" },
    rage: { name: "🔥 Rage", desc: "Ennemis + rapides", dur: 20000, eff: "speed" },
    pluie_sang: { name: "🩸 Pluie de sang", desc: "Spawn x2", dur: 25000, eff: "spawn" },
    benediction: { name: "✨ Bénédiction", desc: "Régénération", dur: 18000, eff: "regen" }
};

// État global
let currentEvent = null;
let eventStart = 0;
let eventEnd = 0;
let lastCheck = 0;
let msg = "";
let msgTime = 0;
let speedMult = 1;
let spawnMult = 1;

// Fonctions utilitaires
const randEvent = () => EVENTS[Object.keys(EVENTS)[Math.floor(Math.random() * 4)]];
const now = () => performance.now();

// Gestion des événements
function startEvent() {
    if (currentEvent) return;
    currentEvent = randEvent();
    eventStart = now();
    eventEnd = eventStart + currentEvent.dur;
    applyEffect(true);
    msg = `${currentEvent.name} activé`;
    msgTime = now();
    console.log(`🎲 ${currentEvent.name}`);
}

function endEvent() {
    if (!currentEvent) return;
    applyEffect(false);
    msg = `${currentEvent.name} terminé`;
    msgTime = now();
    console.log(`🏁 ${currentEvent.name} terminé`);
    currentEvent = null;
}

function applyEffect(apply) {
    const mult = apply ? 1 : 0;
    switch (currentEvent.eff) {
        case "speed": speedMult = apply ? 1.5 : 1; break;
        case "spawn": spawnMult = apply ? 2 : 1; break;
    }
}

// Mise à jour
function updateEvents() {
    const t = now();
    if (!currentEvent && t - lastCheck > 60000 + Math.random() * 60000) {
        startEvent();
        lastCheck = t;
    }
    if (currentEvent && t >= eventEnd) endEvent();
    
    // BÉNÉDICTION : régénération simple et fiable
    if (currentEvent?.eff === "regen" && playerController?.player) {
        const regenRate = 10; // HP par seconde
        const deltaTime = (t - (updateEvents.lastTime || t)) / 1000;
        const regenAmount = regenRate * deltaTime;
        playerController.player.hp = Math.min(
            playerController.player.maxHp,
            playerController.player.hp + regenAmount
        );
        console.log(`✨ Régénération: +${regenAmount.toFixed(1)} HP (Total: ${playerController.player.hp.toFixed(1)})`);
    }
    
    updateEvents.lastTime = t;
}

// Rendu
function drawEffects() {
    if (!currentEvent) return;
    const n = now();
    switch (currentEvent.eff) {
        case "vision":
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            break;
        case "spawn":
            ctx.save();
            for (let i = 0; i < 20; i++) {
                const x = (i * 37 + n * 0.1) % canvas.width;
                const y = (i * 23 + n * 0.05) % canvas.height;
                ctx.fillStyle = "rgba(139,0,0,0.3)";
                ctx.fillRect(x, y, 2, 6);
            }
            ctx.restore();
            break;
        case "regen":
            if (!playerController?.player) return;
            ctx.save();
            const p = playerController.player;
            const sx = (p.x - cameraController.camera.x) * cameraController.camera.zoom;
            const sy = (p.y - cameraController.camera.y) * cameraController.camera.zoom;
            const r = 50 * cameraController.camera.zoom;

            ctx.strokeStyle = "rgba(255,215,0,0.5)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, 6.28);
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
                const a = (n * 0.002 + i * 0.785) % 6.28;
                const d = r + Math.sin(n * 0.003 + i) * 10;
                const px = sx + Math.cos(a) * d;
                const py = sy + Math.sin(a) * d;
                ctx.fillStyle = "rgba(255,215,0,0.8)";
                ctx.fillRect(px - 2, py - 2, 4, 4);
            }
            ctx.restore();
            break;
    }
}

function drawMsg() {
    if (!msg || now() - msgTime > 2200) return;
    ctx.save();
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const paddingX = 14;
    const paddingY = 8;
    const textWidth = Math.min(ctx.measureText(msg).width, canvas.width * 0.85);
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = 32 + paddingY * 2;
    const boxX = (canvas.width - boxWidth) / 2;
    const expGap = (typeof uiStyles !== 'undefined' ? uiStyles.expOffsetTop + uiStyles.expBarHeight : 40);
    const boxY = expGap + 12;

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillText(msg, canvas.width / 2, boxY + boxHeight / 2);
    ctx.restore();
}

// API publique
window.getEventMult = () => ({ enemySpeed: speedMult, spawnRate: spawnMult });
window.getCurrentEvent = () => currentEvent;
window.updateRandomEvents = updateEvents;
window.drawEventEffects = drawEffects;
window.drawEventMessage = drawMsg;
window.getEventMultipliers = window.getEventMult;

// TEST : déclencher un événement manuellement
window.testEvent = (eventName) => {
    if (EVENTS[eventName]) {
        currentEvent = EVENTS[eventName];
        eventStart = now();
        eventEnd = eventStart + currentEvent.dur;
        applyEffect(true);
        msg = `${currentEvent.name} (TEST) commence !`;
        msgTime = now();
        console.log(`🧪 TEST: ${currentEvent.name} déclenché manuellement`);
    } else {
        console.log(`❌ Événement "${eventName}" inconnu. Événements disponibles:`, Object.keys(EVENTS));
    }
};