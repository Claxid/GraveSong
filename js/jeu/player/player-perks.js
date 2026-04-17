// Perk system for the player controller.
(function initPlayerPerkSystem(globalScope) {
    const root = globalScope;
    root.PlayerSystems = root.PlayerSystems || {};

    root.PlayerSystems.createPlayerPerkSystem = function createPlayerPerkSystem({
        player,
        attackStats,
        fireballState,
        onAfterPerkApplied
    }) {
        const AXE_PERK_ID = "Axe";
        const AXE_UNLOCK_LEVEL = 5;
        const FIREBALL_UNLOCK_PERK_ID = "fireball_unlock";
        const FIREBALL_COUNT_PERK_ID = "fireball_count_up";
        const FIREBALL_COOLDOWN_PERK_ID = "fireball_cooldown_down";
        const FIREBALL_UNLOCK_LEVEL = 6;
        const SKILL_PERK_IDS = new Set([AXE_PERK_ID, FIREBALL_UNLOCK_PERK_ID, FIREBALL_COUNT_PERK_ID, FIREBALL_COOLDOWN_PERK_ID]);

        function isFireballUnlocked() {
            return (Number(attackStats.Fireball) || 0) > 0;
        }

        const perkPool = [
            { id: "damage_up", name: "+25% Degats", description: "Vos attaques frappent plus fort.", apply: ({ attackStats: s }) => { s.damage = Math.round(s.damage * 1.25); } },
            { id: "cooldown_down", name: "-20% Cooldown", description: "Vous attaquez plus souvent.", apply: ({ attackStats: s }) => { s.cooldown = Math.max(250, Math.round(s.cooldown * 0.8)); } },
            { id: "range_up", name: "+20% Portee", description: "Vous touchez de plus loin.", apply: ({ attackStats: s }) => { s.range = Math.round(s.range * 1.2); } },
            { id: "arc_up", name: "+15° Angle", description: "Votre attaque devient plus large.", apply: ({ attackStats: s }) => { s.halfAngle = Math.min(Math.PI, s.halfAngle + (Math.PI / 12)); } },
            { id: AXE_PERK_ID, name: "+1 hache", description: "Vous gagnez une puissante hache.", apply: ({ attackStats: s }) => { s.Axe = (Number(s.Axe) || 0) + 1; } },
            { id: FIREBALL_UNLOCK_PERK_ID, name: "Fireball", description: "Vous lancez des fireballs.", apply: ({ attackStats: s }) => { s.Fireball = Math.max(1, (Number(s.Fireball) || 0) + 1); } },
            { id: FIREBALL_COUNT_PERK_ID, name: "+1 fireball", description: "Lance une fireball supplementaire.", apply: ({ attackStats: s }) => { s.Fireball = (Number(s.Fireball) || 0) + 1; } },
            { id: FIREBALL_COOLDOWN_PERK_ID, name: "-20% de cooldown fireball", description: "Les fireballs sont lancees plus souvent.", apply: ({ fireballState: f }) => { f.cooldown = Math.max(400, Math.round(f.cooldown * 0.8)); } }
        ];

        const pendingPerkChoices = [];

        function pickRandomPerks(count, forLevel = player.level) {
            if (forLevel === AXE_UNLOCK_LEVEL) {
                const axePerk = perkPool.find((perk) => perk.id === AXE_PERK_ID);
                const fireballPerk = perkPool.find((perk) => perk.id === FIREBALL_UNLOCK_PERK_ID);
                const level5Choices = [axePerk, fireballPerk].filter(Boolean);
                return level5Choices.map((perk) => ({ id: perk.id, name: perk.name, description: perk.description }));
            }

            const regularPerks = perkPool.filter((perk) => {
                if (perk.id === AXE_PERK_ID && forLevel < AXE_UNLOCK_LEVEL) return false;
                if (perk.id === FIREBALL_UNLOCK_PERK_ID && forLevel < FIREBALL_UNLOCK_LEVEL) return false;
                if (perk.id === FIREBALL_UNLOCK_PERK_ID && isFireballUnlocked()) return false;
                if ((perk.id === FIREBALL_COUNT_PERK_ID || perk.id === FIREBALL_COOLDOWN_PERK_ID) && !isFireballUnlocked()) return false;
                return true;
            });

            const eligiblePerks = forLevel === AXE_UNLOCK_LEVEL
                ? regularPerks.filter((perk) => SKILL_PERK_IDS.has(perk.id))
                : regularPerks;

            const shuffled = eligiblePerks.slice();
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            const selected = shuffled.slice(0, Math.min(count, shuffled.length));
            return selected.map((perk) => ({ id: perk.id, name: perk.name, description: perk.description }));
        }

        function queuePerkChoices(levelsGained = 1) {
            const firstGainedLevel = Math.max(1, player.level - levelsGained + 1);
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

            perk.apply({ attackStats, fireballState });
            if (typeof onAfterPerkApplied === "function") {
                onAfterPerkApplied();
            }
            return choice.id;
        }

        return {
            queuePerkChoices,
            getCurrentPerkChoices,
            hasPendingPerks,
            applyPerkByIndex
        };
    };
})(window);
