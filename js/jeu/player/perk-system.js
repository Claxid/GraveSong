window.GamePlayerPerkSystem = (() => {
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function createPlayerPerkSystem(deps) {
        const { player, attackStats, fireballState, chaosAuraState, blackHoleState, axeState } = deps;
        const ids = deps.ids;
        const levels = deps.levels;
        const getAxeCount = deps.getAxeCount;
        const getAxePerkCard = deps.getAxePerkCard;
        const isChaosAuraUnlocked = deps.isChaosAuraUnlocked;
        const isFireballUnlocked = deps.isFireballUnlocked;
        const isBlackHoleUnlocked = deps.isBlackHoleUnlocked;
        const getChaosAuraCooldownMs = deps.getChaosAuraCooldownMs;
        const syncDerivedAttackVisualStats = deps.syncDerivedAttackVisualStats;
        const pendingPerkChoices = [];

        const perkPool = [
            { id: "damage_up", name: "Serment sanglant", description: "+25% degats d'attaque.", apply: ({ attackStats: s }) => { s.damage = Math.round(s.damage * 1.25); } },
            { id: ids.lifeLeech, name: "Leech life", description: "+0.25% vol de vie par niveau de perk.", apply: ({ attackStats: s }) => { s.lifeLeechLevel = (Number(s.lifeLeechLevel) || 0) + 1; } },
            { id: "cooldown_down", name: "Ferveur noire", description: "Attaques 20% plus rapides.", apply: ({ attackStats: s }) => { s.cooldown = Math.max(250, Math.round(s.cooldown * 0.8)); } },
            { id: "range_up", name: "Lame allongee", description: "+20% de portee.", apply: ({ attackStats: s }) => { s.range = Math.round(s.range * 1.2); } },
            { id: "arc_up", name: "Croissant maudit", description: "Arc d'attaque +15 degres.", apply: ({ attackStats: s }) => { s.halfAngle = Math.min(Math.PI, s.halfAngle + (Math.PI / 12)); } },
            { id: ids.axe, name: "Hache runique", description: "Ajoute 1 hache orbitale.", apply: ({ attackStats: s }) => { s.Axe = Math.min(5, (Number(s.Axe) || 0) + 1); } },
            { id: ids.chaosAuraUnlock, name: "Halo profane", description: "Debloque l'aura du chaos.", apply: ({ attackStats: s }) => { s.ChaosAura = Math.max(1, (Number(s.ChaosAura) || 0) + 1); } },
            { id: ids.chaosAuraSize, name: "Voile vaste", description: "Aura: +10% de rayon.", apply: ({ chaosAuraState: a }) => { a.sizeMultiplier *= 1.1; } },
            { id: ids.chaosAuraDamage, name: "Brulure astrale", description: "Aura: +15% degats.", apply: ({ chaosAuraState: a }) => { a.damageMultiplier *= 1.15; } },
            { id: ids.chaosAuraCooldown, name: "Pulse interdit", description: "Aura: -10% cooldown.", apply: ({ chaosAuraState: a }) => { a.cooldownMultiplier *= 0.9; } },
            { id: ids.fireballUnlock, name: "Braise impie", description: "Debloque les fireballs.", apply: ({ attackStats: s }) => { s.Fireball = Math.max(1, (Number(s.Fireball) || 0) + 1); } },
            { id: ids.fireballCount, name: "Salve ardente", description: "Ajoute 1 fireball.", apply: ({ attackStats: s }) => { s.Fireball = (Number(s.Fireball) || 0) + 1; } },
            { id: ids.fireballCooldown, name: "Cendres vives", description: "Fireballs: -20% cooldown.", apply: ({ fireballState: f }) => { f.cooldown = Math.max(400, Math.round(f.cooldown * 0.8)); } },
            { id: ids.blackHoleUnlock, name: "Abyme", description: "Debloque le trou noir (5 s).", apply: ({ attackStats: s }) => { s.BlackHole = Math.max(1, (Number(s.BlackHole) || 0) + 1); } },
            { id: ids.blackHoleCount, name: "Faille jumelle", description: "Ajoute 1 trou noir.", apply: ({ attackStats: s }) => { s.BlackHole = (Number(s.BlackHole) || 0) + 1; } },
            { id: ids.blackHoleDamage, name: "Gueule obscure", description: "Trou noir: +15% degats.", apply: ({ blackHoleState: b }) => { b.damageMultiplier *= 1.15; } },
            { id: ids.blackHoleCooldown, name: "Flux du vide", description: "Trou noir: -10% cooldown.", apply: ({ blackHoleState: b }) => { b.cooldownMultiplier *= 0.9; } }
        ];

        function pickRandomPerks(count, forLevel = player.level) {
            if (forLevel === levels.axeUnlock) {
                const level5Choices = [getAxePerkCard(), perkPool.find((perk) => perk.id === ids.chaosAuraUnlock), perkPool.find((perk) => perk.id === ids.fireballUnlock), perkPool.find((perk) => perk.id === ids.blackHoleUnlock)].filter(Boolean);
                return shuffle(level5Choices.slice()).slice(0, Math.min(count, level5Choices.length)).map((perk) => ({ id: perk.id, name: perk.name, description: perk.description }));
            }

            const regularPerks = perkPool.filter((perk) => {
                if (perk.id === ids.axe && (forLevel < levels.axeUnlock || getAxeCount() >= 5)) return false;
                if (perk.id === ids.chaosAuraUnlock && forLevel < levels.chaosAuraUnlock) return false;
                if (perk.id === ids.chaosAuraUnlock && isChaosAuraUnlocked()) return false;
                if ((perk.id === ids.chaosAuraSize || perk.id === ids.chaosAuraDamage || perk.id === ids.chaosAuraCooldown) && !isChaosAuraUnlocked()) return false;
                if (perk.id === ids.fireballUnlock && forLevel < levels.fireballUnlock) return false;
                if (perk.id === ids.fireballUnlock && isFireballUnlocked()) return false;
                if ((perk.id === ids.fireballCount || perk.id === ids.fireballCooldown) && !isFireballUnlocked()) return false;
                if (perk.id === ids.blackHoleUnlock && forLevel < levels.blackHoleUnlock) return false;
                if (perk.id === ids.blackHoleUnlock && isBlackHoleUnlocked()) return false;
                if ((perk.id === ids.blackHoleCount || perk.id === ids.blackHoleDamage || perk.id === ids.blackHoleCooldown) && !isBlackHoleUnlocked()) return false;
                return true;
            });

            const eligiblePerks = forLevel === levels.axeUnlock ? regularPerks.filter((perk) => ids.skillPerks.has(perk.id)) : regularPerks;
            const selected = shuffle(eligiblePerks.slice()).slice(0, Math.min(count, eligiblePerks.length));
            return selected.map((perk) => perk.id === ids.axe ? getAxePerkCard() : ({ id: perk.id, name: perk.name, description: perk.description }));
        }

        function queuePerkChoices(levelsGained = 1) {
            const firstGainedLevel = Math.max(1, player.level - levelsGained + 1);
            for (let i = 0; i < levelsGained; i++) pendingPerkChoices.push(pickRandomPerks(3, firstGainedLevel + i));
        }

        function getCurrentPerkChoices() { return pendingPerkChoices.length === 0 ? null : pendingPerkChoices[0]; }
        function hasPendingPerks() { return pendingPerkChoices.length !== 0; }

        function applyPerkByIndex(idx) {
            if (!hasPendingPerks()) return null;
            const choices = pendingPerkChoices.shift();
            const choice = choices[idx];
            if (!choice) return null;
            const perk = perkPool.find((p) => p.id === choice.id);
            if (!perk) return null;
            perk.apply({ attackStats, fireballState, chaosAuraState, blackHoleState });
            axeState.count = getAxeCount();
            axeState.active = axeState.count > 0;
            chaosAuraState.active = isChaosAuraUnlocked();
            if (chaosAuraState.active && chaosAuraState.nextPulseAt <= 0) {
                chaosAuraState.nextPulseAt = performance.now() + Math.round(getChaosAuraCooldownMs() * 1.5);
            }
            fireballState.count = Math.max(0, Number(attackStats.Fireball) || 0);
            fireballState.active = fireballState.count > 0;
            blackHoleState.count = Math.max(0, Number(attackStats.BlackHole) || 0);
            blackHoleState.active = blackHoleState.count > 0;
            syncDerivedAttackVisualStats();
            return choice.id;
        }
        return {
            pendingPerkChoices,
            perkPool,
            queuePerkChoices,
            getCurrentPerkChoices,
            hasPendingPerks,
            applyPerkByIndex
        };
    }
    return { createPlayerPerkSystem };
})();
