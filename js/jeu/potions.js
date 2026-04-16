window.PotionSystem = (() => {
    const DEFAULTS = {
        spriteSrc: "../assets/sprites/potion/healing_potion.png",
        potionSize: 55,
        healAmount: 15,
        dropChancesByType: {
            orc: 0.05,
            orc3: 0.08
        },
        defaultDropChance: 0.05
    };

    function createPotionSystem({
        ctx,
        cameraController,
        potions,
        spriteSrc = DEFAULTS.spriteSrc,
        potionSize = DEFAULTS.potionSize,
        healAmount = DEFAULTS.healAmount,
        dropChancesByType = DEFAULTS.dropChancesByType,
        defaultDropChance = DEFAULTS.defaultDropChance
    }) {
        const potionSprite = new Image();
        potionSprite.src = spriteSrc;

        function maybeDropPotion(enemy) {
            if (!enemy) return;

            const dropChance = Object.prototype.hasOwnProperty.call(dropChancesByType, enemy.type)
                ? dropChancesByType[enemy.type]
                : defaultDropChance;

            if (Math.random() >= dropChance) return;

            potions.push({
                x: enemy.x,
                y: enemy.y,
                w: potionSize,
                h: potionSize,
                healAmount
            });
        }

        function collectPotions(playerHitbox, isRectOverlap, playerController) {
            for (let i = potions.length - 1; i >= 0; i--) {
                const potion = potions[i];
                const potionHitbox = {
                    x: potion.x - potion.w / 2,
                    y: potion.y - potion.h / 2,
                    w: potion.w,
                    h: potion.h
                };

                if (!isRectOverlap(playerHitbox, potionHitbox)) continue;

                playerController.player.hp = Math.min(
                    playerController.player.maxHp,
                    playerController.player.hp + potion.healAmount
                );
                potions.splice(i, 1);
            }
        }

        function draw() {
            for (const potion of potions) {
                const size = potion.w * cameraController.camera.zoom;
                const drawX = (potion.x - cameraController.camera.x) * cameraController.camera.zoom - size / 2;
                const drawY = (potion.y - cameraController.camera.y) * cameraController.camera.zoom - size / 2;

                if (potionSprite.complete) {
                    ctx.drawImage(potionSprite, drawX, drawY, size, size);
                } else {
                    ctx.fillStyle = "red";
                    ctx.fillRect(drawX, drawY, size, size);
                }
            }
        }

        return {
            maybeDropPotion,
            collectPotions,
            draw
        };
    }

    return {
        DEFAULTS,
        createPotionSystem
    };
})();
