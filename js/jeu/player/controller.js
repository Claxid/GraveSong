window.GamePlayerController = (() => {
    function createPlayerController(canvas, ctx, camera, worldBounds = null) {
        const ids = {
            axe: "Axe",
            lifeLeech: "life_leech_up",
            chaosAuraUnlock: "chaos_aura_unlock",
            chaosAuraSize: "chaos_aura_size_up",
            chaosAuraDamage: "chaos_aura_damage_up",
            chaosAuraCooldown: "chaos_aura_cooldown_down",
            fireballUnlock: "fireball_unlock",
            fireballCount: "fireball_count_up",
            fireballCooldown: "fireball_cooldown_down",
            blackHoleUnlock: "black_hole_unlock",
            blackHoleCount: "black_hole_count_up",
            blackHoleDamage: "black_hole_damage_up",
            blackHoleCooldown: "black_hole_cooldown_down"
        };
        ids.skillPerks = new Set([ids.axe, ids.chaosAuraUnlock, ids.fireballUnlock, ids.fireballCount, ids.fireballCooldown, ids.blackHoleUnlock]);

        const levels = { axeUnlock: 5, chaosAuraUnlock: 5, fireballUnlock: 6, blackHoleUnlock: 5 };
        const BASE_ATTACK_STATS = { cooldown: 2000, damage: 12, animSpeed: 4, sizeMultiplier: 3, range: 220, halfAngle: Math.PI / 3, lifeLeechLevel: 0, Axe: 0, Fireball: 0, ChaosAura: 0, BlackHole: 0 };

        const player = { spawnX: 1774, spawnY: 2200, x: 1774, y: 2200, speed: 1.5, frameX: 0, frameY: 0, frameSize: 100, maxFrames: 8, animCounter: 0, animSpeed: 10, scale: 2, hp: 100, maxHp: 100, exp: 0, maxExp: 100, level: 1, hitW: 24, hitH: 35 };
        const attackStats = { ...BASE_ATTACK_STATS };

        const sprite = new Image();
        sprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Walk.png";
        sprite.addEventListener("load", () => { player.maxFrames = Math.max(1, Math.floor(sprite.width / player.frameSize)); });

        const hurtSprite = new Image();
        hurtSprite.src = "../assets/sprites/Characters(100x100)/Soldier/Soldier/Soldier-Hurt.png";
        let hurtFrames = 1;
        const HURT_DURATION_MS = 140;
        let hurtUntil = 0;
        hurtSprite.addEventListener("load", () => { hurtFrames = Math.max(1, Math.floor(hurtSprite.width / 100)); });

        const input = window.GamePlayerMotion.createInputState();
        window.addEventListener("keydown", (e) => window.GamePlayerMotion.setKeyState(input, e, true));
        window.addEventListener("keyup", (e) => window.GamePlayerMotion.setKeyState(input, e, false));

        const normalizeAngle = (angle) => { while (angle <= -Math.PI) angle += Math.PI * 2; while (angle > Math.PI) angle -= Math.PI * 2; return angle; };
        const getAxeCount = () => Math.max(0, Math.min(5, Number(attackStats.Axe) || 0));
        const getAxePerkCard = () => getAxeCount() >= 4 ? ({ id: ids.axe, name: "Brasier infernal", description: "Derniere hache: sprite enflamme et gros boost de degats." }) : ({ id: ids.axe, name: "Hache runique", description: "Ajoute 1 hache orbitale." });
        const isFireballUnlocked = () => (Number(attackStats.Fireball) || 0) > 0;
        const isChaosAuraUnlocked = () => (Number(attackStats.ChaosAura) || 0) > 0;
        const isBlackHoleUnlocked = () => (Number(attackStats.BlackHole) || 0) > 0;
        const getLifeLeechRatio = () => Math.max(0, Math.min(0.95, (Number(attackStats.lifeLeechLevel) || 0) * 0.0025));

        const reportDamageDealt = (source, amount) => {
            if (!Number.isFinite(amount) || amount <= 0 || typeof window.recordTowerDamage !== "function") return;
            window.recordTowerDamage({ source: source || "Inconnu", amount });
        };

        const combatUtils = window.GamePlayerCombatUtils.createPlayerCombatUtils({ player, attackStats, reportDamageDealt, getLifeLeechRatio });
        const applyEnemyDamage = (enemy, damage, source) => combatUtils.applyEnemyDamage(enemy, damage, source);

        const meleeAttackSystem = window.PlayerSystems.createPlayerMeleeAttackSystem({ ctx, camera, player, attackStats, normalizeAngle, applyEnemyDamage });
        const axeSpell = window.PlayerSpells.createAxeSpell({ ctx, camera, player, attackStats, normalizeAngle, applyEnemyDamage });
        const fireballSpell = window.PlayerSpells.createFireballSpell({ ctx, camera, player, attackStats, applyEnemyDamage });
        const chaosAuraSpell = window.PlayerSpells.createChaosAuraSpell({ ctx, camera, player, applyEnemyDamage });
        const blackHoleSpell = window.PlayerSpells.createBlackHoleSpell({ ctx, camera, player, worldBounds, applyEnemyDamage });

        const axeState = axeSpell.state;
        const fireballState = fireballSpell.state;
        const chaosAuraState = chaosAuraSpell.state;
        const blackHoleState = blackHoleSpell.state;

        function syncDerivedAttackVisualStats() {
            const rangeRatio = attackStats.range / BASE_ATTACK_STATS.range;
            const angleRatio = attackStats.halfAngle / BASE_ATTACK_STATS.halfAngle;
            const cooldownRatio = BASE_ATTACK_STATS.cooldown / attackStats.cooldown;
            attackStats.sizeMultiplier = Number(Math.max(1.8, Math.min(8, BASE_ATTACK_STATS.sizeMultiplier * rangeRatio * Math.sqrt(angleRatio))).toFixed(2));
            attackStats.animSpeed = Math.max(1, Math.round(BASE_ATTACK_STATS.animSpeed / Math.sqrt(cooldownRatio)));
        }

        const perkSystem = window.GamePlayerPerkSystem.createPlayerPerkSystem({ player, attackStats, fireballState, chaosAuraState, blackHoleState, axeState, ids, levels, getAxeCount, getAxePerkCard, isChaosAuraUnlocked, isFireballUnlocked, isBlackHoleUnlocked, getChaosAuraCooldownMs: () => chaosAuraSpell.getCooldownMs(), syncDerivedAttackVisualStats });
        const pendingPerkChoices = perkSystem.pendingPerkChoices;

        const persistence = window.GamePlayerPersistence.createPlayerPersistenceSystem({ player, attackStats, fireballState, chaosAuraState, blackHoleState, pendingPerkChoices, getAxeCount, isChaosAuraUnlocked, isFireballUnlocked, isBlackHoleUnlocked, getChaosAuraCooldownMs: () => chaosAuraSpell.getCooldownMs(), syncDerivedAttackVisualStats, onAfterLoad: ({ axeCount, chaosAuraUnlocked, fireballUnlocked, blackHoleUnlocked, chaosAuraStartDelayMs }) => {
            axeSpell.setCount(axeCount);
            chaosAuraSpell.setActive(chaosAuraUnlocked);
            if (chaosAuraUnlocked && chaosAuraState.nextPulseAt <= 0) chaosAuraState.nextPulseAt = performance.now() + chaosAuraStartDelayMs;
            fireballSpell.setCount(fireballUnlocked ? Math.max(0, Number(attackStats.Fireball) || 0) : 0);
            blackHoleSpell.setCount(blackHoleUnlocked ? Math.max(0, Number(attackStats.BlackHole) || 0) : 0);
        } });

        function update(enemies = []) {
            window.GamePlayerMotion.updateMovement({ input, player, worldBounds });
            const now = performance.now();
            meleeAttackSystem.update(enemies, now);
            axeSpell.update(enemies, now);
            fireballSpell.update(enemies, now);
            chaosAuraSpell.update(enemies, now);
            blackHoleSpell.update(enemies, now);
        }

        function draw() {
            const size = player.frameSize * player.scale * camera.zoom;
            const drawX = (player.x - camera.x) * camera.zoom - size / 2;
            const drawY = (player.y - camera.y) * camera.zoom - size / 2;
            const hurtActive = performance.now() < hurtUntil && hurtSprite.complete && hurtSprite.naturalWidth > 0;
            const activeSprite = hurtActive ? hurtSprite : sprite;
            const activeMaxFrames = hurtActive ? hurtFrames : player.maxFrames;
            const activeFrameX = Math.min(player.frameX, activeMaxFrames - 1);
            const activeFrameY = hurtActive ? 0 : player.frameY;

            const drawCharacter = () => ctx.drawImage(activeSprite, activeFrameX * player.frameSize, activeFrameY * player.frameSize, player.frameSize, player.frameSize, 0, 0, size, size);
            ctx.save();
            if (input.facingLeft) {
                ctx.translate(drawX + size, drawY);
                ctx.scale(-1, 1);
            } else {
                ctx.translate(drawX, drawY);
            }
            drawCharacter();
            ctx.restore();
        }

        function drawAttacks() {
            blackHoleSpell.draw();
            chaosAuraSpell.draw();
            meleeAttackSystem.draw();
            axeSpell.draw();
            fireballSpell.draw();
        }

        function applyPerkByIndex(idx) {
            const applied = perkSystem.applyPerkByIndex(idx);
            if (!applied) return null;
            axeSpell.setCount(getAxeCount());
            fireballSpell.setCount(Math.max(0, Number(attackStats.Fireball) || 0));
            chaosAuraSpell.setActive(isChaosAuraUnlocked());
            blackHoleSpell.setCount(Math.max(0, Number(attackStats.BlackHole) || 0));
            return applied;
        }

        function applyDevTestLoadout() {
            attackStats.Axe = 5; attackStats.ChaosAura = 0; attackStats.BlackHole = 0; attackStats.Fireball = 0;
            axeSpell.setCount(5); fireballSpell.setCount(0); chaosAuraSpell.setActive(false);
            chaosAuraState.sizeMultiplier = 1; chaosAuraState.cooldownMultiplier = 1; chaosAuraState.damageMultiplier = 1; chaosAuraState.devMinCooldownMs = null;
            blackHoleState.cooldownMultiplier = 1; blackHoleState.damageMultiplier = 1; blackHoleSpell.setCount(0); blackHoleSpell.reset();
            player.level = Math.max(player.level, 5);
            pendingPerkChoices.length = 0;
            syncDerivedAttackVisualStats();
        }

        syncDerivedAttackVisualStats();

        return {
            player,
            update,
            draw,
            drawAttacks,
            queuePerkChoices: perkSystem.queuePerkChoices,
            getCurrentPerkChoices: perkSystem.getCurrentPerkChoices,
            hasPendingPerks: perkSystem.hasPendingPerks,
            applyPerkByIndex,
            triggerHurt: () => { hurtUntil = performance.now() + HURT_DURATION_MS; },
            applyDevTestLoadout,
            setLifeLeechLevel: (level) => { if (!Number.isFinite(level)) return false; attackStats.lifeLeechLevel = Math.max(0, Math.floor(level)); return true; },
            savePersistentProgress: persistence.savePersistentProgress,
            loadPersistentProgress: persistence.loadPersistentProgress,
            clearPersistentProgress: persistence.clearPersistentProgress,
            getAttackStats: () => ({ ...attackStats })
        };
    }

    return { createPlayerController };
})();
