// Contrôleur du joueur
// Combine mouvement, attaques et perks

function createPlayerController(canvas, ctx, camera, isMap1 = false) {
    const movement = createPlayerMovementController(canvas, ctx, camera);
    const combat = createPlayerAttacks(movement.player, camera, isMap1);

    const AXE_PERK_ID = "Axe";
    const AXE_UNLOCK_LEVEL = 5;

    const perkPool = [
        { id: "damage_up", name: "+25% Degats", description: "Vos attaques frappent plus fort.", apply: (s) => { s.damage = Math.round(s.damage * 1.25); } },
        { id: "cooldown_down", name: "-20% Cooldown", description: "Vous attaquez plus souvent.", apply: (s) => { s.cooldown = Math.max(250, Math.round(s.cooldown * 0.8)); } },
        { id: "range_up", name: "+20% Portee", description: "Vous touchez de plus loin.", apply: (s) => { s.range = Math.round(s.range * 1.2); } },
        { id: "arc_up", name: "+15° Angle", description: "Votre attaque couvre une zone plus large.", apply: (s) => { s.halfAngle = Math.min(Math.PI, s.halfAngle + (Math.PI / 12)); } },
        { id: AXE_PERK_ID, name: "+1 hache", description: "Vous gagnez une puissante hache.", apply: (s) => { s.Axe = (Number(s.Axe) || 0) + 1; } }
    ];

    const pendingPerkChoices = [];

    function getAxeSpawnChance(level) {
        if (level < AXE_UNLOCK_LEVEL) return 0;
        if (level === AXE_UNLOCK_LEVEL) return 1;
        const baseChance = 0.05;
        const growthPerLevel = 0.01;
        const maxChance = 0.20;
        return Math.min(maxChance, baseChance + (level - AXE_UNLOCK_LEVEL) * growthPerLevel);
    }

    function pickRandomPerks(count, forLevel = movement.player.level) {
        const regularPerks = perkPool.filter((perk) => perk.id !== AXE_PERK_ID);
        const shuffled = regularPerks.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const selected = shuffled.slice(0, Math.min(count, shuffled.length));
        const axeChance = getAxeSpawnChance(forLevel);
        if (Math.random() < axeChance) {
            const axePerk = perkPool.find((perk) => perk.id === AXE_PERK_ID);
            if (axePerk) {
                if (selected.length < count) {
                    selected.push(axePerk);
                } else if (selected.length > 0) {
                    const replaceIdx = Math.floor(Math.random() * selected.length);
                    selected[replaceIdx] = axePerk;
                }
            }
        }

        return selected.map((perk) => ({ id: perk.id, name: perk.name, description: perk.description }));
    }

    function queuePerkChoices(levelsGained = 1) {
        const firstGainedLevel = Math.max(1, movement.player.level - levelsGained + 1);
        for (let i = 0; i < levelsGained; i++) {
            const levelForThisChoice = firstGainedLevel + i;
            pendingPerkChoices.push(pickRandomPerks(3, levelForThisChoice));
        }
    }

    function getCurrentPerkChoices() {
        if (pendingPerkChoices.length === 0) return null;
        return pendingPerkChoices[0];
    }

    function hasPendingPerks() {
        return pendingPerkChoices.length > 0;
    }

    function applyPerkByIndex(idx) {
        if (!hasPendingPerks()) return null;
        const choices = pendingPerkChoices.shift();
        const choice = choices[idx];
        if (!choice) return null;
        const perk = perkPool.find((p) => p.id === choice.id);
        if (!perk) return null;
        perk.apply(combat.attackStats);
        combat.axeState.count = Math.max(0, Number(combat.attackStats.Axe) || 0);
        combat.axeState.active = combat.axeState.count > 0;
        combat.syncDerivedAttackVisualStats();
        return choice.id;
    }

    function update(enemies = []) {
        movement.update(enemies);
        combat.updateAttacks(enemies);
    }

    function draw() {
        movement.draw();
    }

    function drawAttacks() {
        combat.drawAttacks();
    }

    return {
        player: movement.player,
        update,
        draw,
        drawAttacks,
        queuePerkChoices,
        getCurrentPerkChoices,
        hasPendingPerks,
        applyPerkByIndex,
        triggerHurt: movement.triggerHurt,
        getAttackStats: combat.getAttackStats
    };
}
