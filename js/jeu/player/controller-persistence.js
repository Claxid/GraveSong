window.GamePlayerPersistence = (() => {
    function createPlayerPersistenceSystem({
        player,
        attackStats,
        fireballState,
        chaosAuraState,
        blackHoleState,
        pendingPerkChoices,
        getAxeCount,
        isChaosAuraUnlocked,
        isFireballUnlocked,
        isBlackHoleUnlocked,
        getChaosAuraCooldownMs,
        syncDerivedAttackVisualStats,
        onAfterLoad
    }) {
        const STORAGE_KEY = "gravesong.playerProgress.v1";
        const SKIP_NEXT_SAVE_KEY = "gravesong.playerProgress.skipNextSave";

        function savePersistentProgress() {
            try {
                const skipNextSave = sessionStorage.getItem(SKIP_NEXT_SAVE_KEY) === "1";
                if (skipNextSave) {
                    sessionStorage.removeItem(SKIP_NEXT_SAVE_KEY);
                    sessionStorage.removeItem(STORAGE_KEY);
                    return false;
                }

                const payload = {
                    version: 1,
                    savedAt: Date.now(),
                    player: {
                        hp: player.hp,
                        maxHp: player.maxHp,
                        exp: player.exp,
                        maxExp: player.maxExp,
                        level: player.level
                    },
                    attackStats: { ...attackStats },
                    fireballState: { cooldown: fireballState.cooldown },
                    chaosAuraState: {
                        sizeMultiplier: chaosAuraState.sizeMultiplier,
                        damageMultiplier: chaosAuraState.damageMultiplier,
                        cooldownMultiplier: chaosAuraState.cooldownMultiplier
                    },
                    blackHoleState: {
                        cooldownMultiplier: blackHoleState.cooldownMultiplier,
                        damageMultiplier: blackHoleState.damageMultiplier
                    },
                    pendingPerkChoices: pendingPerkChoices.map((choices) => choices.map((choice) => ({
                        id: choice.id,
                        name: choice.name,
                        description: choice.description
                    })))
                };

                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
                return true;
            } catch (_err) {
                return false;
            }
        }

        function clearPersistentProgress() {
            try {
                sessionStorage.setItem(SKIP_NEXT_SAVE_KEY, "1");
                sessionStorage.removeItem(STORAGE_KEY);
                return true;
            } catch (_err) {
                return false;
            }
        }

        function loadPersistentProgress() {
            try {
                const raw = sessionStorage.getItem(STORAGE_KEY);
                if (!raw) return false;

                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== "object") return false;

                const savedPlayer = parsed.player || {};
                if (Number.isFinite(savedPlayer.maxHp)) player.maxHp = Math.max(1, Number(savedPlayer.maxHp));
                if (Number.isFinite(savedPlayer.hp)) player.hp = Math.max(0, Math.min(player.maxHp, Number(savedPlayer.hp)));
                if (Number.isFinite(savedPlayer.level)) player.level = Math.max(1, Math.floor(Number(savedPlayer.level)));
                if (Number.isFinite(savedPlayer.maxExp)) player.maxExp = Math.max(1, Number(savedPlayer.maxExp));
                if (Number.isFinite(savedPlayer.exp)) player.exp = Math.max(0, Number(savedPlayer.exp));

                while (player.exp >= player.maxExp) {
                    player.exp -= player.maxExp;
                    player.level += 1;
                    player.maxExp += player.maxExp * 0.2;
                }

                const savedAttackStats = parsed.attackStats || {};
                for (const key of Object.keys(attackStats)) {
                    if (!Number.isFinite(savedAttackStats[key])) continue;
                    attackStats[key] = Number(savedAttackStats[key]);
                }

                const savedFireball = parsed.fireballState || {};
                if (Number.isFinite(savedFireball.cooldown)) fireballState.cooldown = Math.max(400, Math.round(Number(savedFireball.cooldown)));

                const savedChaosAura = parsed.chaosAuraState || {};
                if (Number.isFinite(savedChaosAura.sizeMultiplier)) chaosAuraState.sizeMultiplier = Math.max(0.1, Number(savedChaosAura.sizeMultiplier));
                if (Number.isFinite(savedChaosAura.damageMultiplier)) chaosAuraState.damageMultiplier = Math.max(0.1, Number(savedChaosAura.damageMultiplier));
                if (Number.isFinite(savedChaosAura.cooldownMultiplier)) chaosAuraState.cooldownMultiplier = Math.max(0.05, Number(savedChaosAura.cooldownMultiplier));

                const savedBlackHole = parsed.blackHoleState || {};
                if (Number.isFinite(savedBlackHole.cooldownMultiplier)) blackHoleState.cooldownMultiplier = Math.max(0.05, Number(savedBlackHole.cooldownMultiplier));
                if (Number.isFinite(savedBlackHole.damageMultiplier)) blackHoleState.damageMultiplier = Math.max(0.1, Number(savedBlackHole.damageMultiplier));

                pendingPerkChoices.length = 0;
                if (Array.isArray(parsed.pendingPerkChoices)) {
                    for (const choices of parsed.pendingPerkChoices) {
                        if (!Array.isArray(choices)) continue;
                        const sanitized = choices
                            .filter((choice) => choice && typeof choice === "object")
                            .map((choice) => ({ id: String(choice.id || ""), name: String(choice.name || ""), description: String(choice.description || "") }))
                            .filter((choice) => choice.id.length > 0);
                        if (sanitized.length > 0) pendingPerkChoices.push(sanitized);
                    }
                }

                if (typeof onAfterLoad === "function") {
                    onAfterLoad({
                        axeCount: getAxeCount(),
                        chaosAuraUnlocked: isChaosAuraUnlocked(),
                        fireballUnlocked: isFireballUnlocked(),
                        blackHoleUnlocked: isBlackHoleUnlocked(),
                        chaosAuraStartDelayMs: Math.round(getChaosAuraCooldownMs() * 1.5)
                    });
                }

                syncDerivedAttackVisualStats();
                return true;
            } catch (_err) {
                return false;
            }
        }

        return {
            savePersistentProgress,
            loadPersistentProgress,
            clearPersistentProgress
        };
    }

    return {
        createPlayerPersistenceSystem
    };
})();
