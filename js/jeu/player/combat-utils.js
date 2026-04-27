window.GamePlayerCombatUtils = (() => {
    function createPlayerCombatUtils({ player, attackStats, reportDamageDealt, getLifeLeechRatio }) {
        function applyLifeLeechFromDamage(damageDealt) {
            if (!Number.isFinite(damageDealt) || damageDealt <= 0) return;
            const ratio = getLifeLeechRatio();
            if (ratio <= 0) return;
            const healAmount = damageDealt * ratio;
            if (healAmount <= 0) return;
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
        }

        function dealDamage(enemy, rawDamage) {
            if (!enemy || !Number.isFinite(enemy.hp)) return 0;
            const beforeHp = Math.max(0, enemy.hp);
            if (beforeHp <= 0) return 0;
            const amount = Math.max(1, Math.round(Number.isFinite(rawDamage) ? rawDamage : attackStats.damage));
            const afterHp = Math.max(0, beforeHp - amount);
            enemy.hp = afterHp;
            return beforeHp - afterHp;
        }

        function applyEnemyDamage(enemy, damage, source) {
            const damageDealt = dealDamage(enemy, damage);
            applyLifeLeechFromDamage(damageDealt);
            reportDamageDealt(source, damageDealt, enemy);
            return damageDealt;
        }

        function applyDamageAndKnockback(enemy, damage, sourceX, sourceY, knockbackStrength = 8) {
            applyEnemyDamage(enemy, damage, "Impact");
            const kx = enemy.x - sourceX;
            const ky = enemy.y - sourceY;
            const mag = Math.sqrt(kx * kx + ky * ky) || 1;
            enemy.x += (kx / mag) * knockbackStrength;
            enemy.y += (ky / mag) * knockbackStrength;
        }

        return {
            applyLifeLeechFromDamage,
            dealDamage,
            applyEnemyDamage,
            applyDamageAndKnockback
        };
    }

    return {
        createPlayerCombatUtils
    };
})();
