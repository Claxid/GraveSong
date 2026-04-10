// Boucle principale du jeu
// Fichier principal du jeu avec boucle, canvas, etc.

// CANVAS PLEIN ECRAN + RESPONSIVE
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Ajuste la taille du canvas à la taille de l'écran
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

// Je crée les contrôleurs pour la map, la caméra, le joueur et l'ennemi.
const mapRenderer = createMapRenderer(canvas, ctx);
const cameraController = createCameraController(canvas, mapRenderer.MAP_WIDTH, mapRenderer.MAP_HEIGHT);
const playerController = createPlayerController(canvas, ctx, cameraController.camera);
const enemyControllers = [];
const potions = [];
const potionSprite = new Image();
potionSprite.src = "../assets/sprites/potion/healing_potion.png";
const pnjControllers = [];

const ORC_POTION_DROP_CHANCE = 0.05;
const ORC3_POTION_DROP_CHANCE = 0.08;
const POTION_HEAL_AMOUNT = 15;
const SPAWN_RING_MIN = 500;
const SPAWN_RING_MAX = 700;
const BASE_SPAWN_INTERVAL_MS = 2200;
const MIN_SPAWN_INTERVAL_MS = 500;
const SPAWN_INTERVAL_DECAY_MS = 170;
const SPAWN_INTERVAL_DECAY_EVERY_MS = 15000;
const BASE_SPAWN_BATCH_SIZE = 1;
const MAX_SPAWN_BATCH_SIZE = 4;
const SPAWN_BATCH_GROWTH_EVERY_MS = 30000;
const INITIAL_ENEMY_COUNT = 4;
const BASE_MAX_ENEMIES = 7;
const ENEMY_GROWTH_EVERY_MS = 20000;
const ENEMIES_PER_GROWTH_STEP = 3;
const ABSOLUTE_MAX_ENEMIES = 300;
const ENEMY_KILL_EXP = 30;
const ENEMY_SPAWN_WEIGHTS = [
    { type: "orc", weight: 95 },
    { type: "orc3", weight: 5 }
];

const CONTACT_DAMAGE = 5;
const DAMAGE_COOLDOWN_MS = 500;
const SHOW_HITBOXES = false;
const isMap1 = window.location.pathname.replace(/\\/g, "/").endsWith("/template/map1.html");
const isVilleMap = window.location.pathname.replace(/\\/g, "/").endsWith("/template/ville.html");
const map1PortalZone = {
    x: 2270,
    y: 895,
    w: 2309 - 2270,
    h: 951 - 895
};
let isChangingMap = false;
let lastContactDamageAt = 0;
let lastProcessedLevel = playerController.player.level;
let gameStartAt = performance.now();
let lastSpawnAt = gameStartAt;
let killCount = 0;

function getCssVar(name, fallback) {
    const value = getComputedStyle(canvas).getPropertyValue(name).trim();
    return value || fallback;
}

function getCssNumber(name, fallback) {
    const value = Number.parseFloat(getCssVar(name, String(fallback)));
    return Number.isFinite(value) ? value : fallback;
}

function readUiStyles() {
    return {
        hpBarWidth: getCssNumber("--hud-hp-bar-width", 200),
        hpBarHeight: getCssNumber("--hud-hp-bar-height", 20),
        hpOffsetLeft: getCssNumber("--hud-hp-offset-left", 20),
        hpOffsetBottom: getCssNumber("--hud-hp-offset-bottom", 40),
        barBorderPadding: getCssNumber("--hud-bar-border-padding", 2),
        barBackgroundColor: getCssVar("--hud-bar-background-color", "#555"),
        hpBorderColor: getCssVar("--hud-hp-border-color", "#000"),
        hpFillColor: getCssVar("--hud-hp-fill-color", "rgb(140, 16, 16)"),

        expBarWidth: getCssNumber("--hud-exp-bar-width", 500),
        expBarHeight: getCssNumber("--hud-exp-bar-height", 17),
        expOffsetTop: getCssNumber("--hud-exp-offset-top", 10),
        expBorderColor: getCssVar("--hud-exp-border-color", "#000"),
        expFillColor: getCssVar("--hud-exp-fill-color", "rgb(196, 138, 31)"),

        levelTextColor: getCssVar("--hud-level-text-color", "#fff"),
        levelFont: getCssVar("--hud-level-font", "bold 11px Arial"),

        killTextColor: getCssVar("--hud-kill-text-color", "#fff"),
        killFont: getCssVar("--hud-kill-font", "bold 20px Arial"),
        killOffsetRight: getCssNumber("--hud-kill-offset-right", 20),
        killOffsetTop: getCssNumber("--hud-kill-offset-top", 20),

        hitboxPlayerColor: getCssVar("--hitbox-player-color", "#00ff00"),
        hitboxEnemyColor: getCssVar("--hitbox-enemy-color", "#ff0000"),

        perkOverlayBackdrop: getCssVar("--perk-overlay-backdrop", "rgba(0, 0, 0, 0.7)"),
        perkPanelBackground: getCssVar("--perk-panel-background", "rgba(24, 24, 24, 0.95)"),
        perkPanelBorderColor: getCssVar("--perk-panel-border-color", "#d4af37"),
        perkPanelBorderWidth: getCssNumber("--perk-panel-border-width", 2),
        perkTitleColor: getCssVar("--perk-title-color", "#f7e9ba"),
        perkTitleFont: getCssVar("--perk-title-font", "bold 28px Arial"),

        perkPanelMaxWidth: getCssNumber("--perk-panel-max-width", 900),
        perkPanelHeight: getCssNumber("--perk-panel-height", 260),
        perkPanelSideMargin: getCssNumber("--perk-panel-side-margin", 60),
        perkCardGap: getCssNumber("--perk-card-gap", 16),
        perkCardTopOffset: getCssNumber("--perk-card-top-offset", 70),
        perkCardHeight: getCssNumber("--perk-card-height", 160),

        perkCardBackground: getCssVar("--perk-card-background", "#2b2b2b"),
        perkCardBorderColor: getCssVar("--perk-card-border-color", "#8f7b3f"),
        perkNumberColor: getCssVar("--perk-number-color", "#f5d26a"),
        perkNumberFont: getCssVar("--perk-number-font", "bold 22px Arial"),
        perkNameColor: getCssVar("--perk-name-color", "#fff"),
        perkNameFont: getCssVar("--perk-name-font", "bold 18px Arial"),
        perkDescriptionColor: getCssVar("--perk-description-color", "#d1d1d1"),
        perkDescriptionFont: getCssVar("--perk-description-font", "15px Arial"),
        perkHintColor: getCssVar("--perk-hint-color", "#c0b080"),
        perkHintFont: getCssVar("--perk-hint-font", "bold 14px Arial")
    };
}

let uiStyles = readUiStyles();

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getRandomSpawnAroundPlayer(player) {
    const angle = Math.random() * Math.PI * 2;
    const radius = SPAWN_RING_MIN + Math.random() * (SPAWN_RING_MAX - SPAWN_RING_MIN);

    const rawX = player.x + Math.cos(angle) * radius;
    const rawY = player.y + Math.sin(angle) * radius;
    const margin = 32;

    return {
        x: clamp(rawX, margin, mapRenderer.MAP_WIDTH - margin),
        y: clamp(rawY, margin, mapRenderer.MAP_HEIGHT - margin)
    };
}

function pickWeightedEnemyType() {
    const totalWeight = ENEMY_SPAWN_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return "orc";

    let roll = Math.random() * totalWeight;
    for (const entry of ENEMY_SPAWN_WEIGHTS) {
        roll -= entry.weight;
        if (roll <= 0) {
            return entry.type;
        }
    }

    return ENEMY_SPAWN_WEIGHTS[ENEMY_SPAWN_WEIGHTS.length - 1].type;
}

function spawnEnemyNearPlayer() {
    const spawn = getRandomSpawnAroundPlayer(playerController.player);
    const enemyType = pickWeightedEnemyType();
    enemyControllers.push(createEnemyController(canvas, ctx, cameraController.camera, spawn.x, spawn.y, enemyType));
}

function spawnPnj(x, y) {
    pnjControllers.push(createpnjController(canvas, ctx, cameraController.camera, x, y));
}

function getMaxEnemyCount(now) {
    const elapsed = now - gameStartAt;
    const growthSteps = Math.floor(elapsed / ENEMY_GROWTH_EVERY_MS);
    return Math.min(ABSOLUTE_MAX_ENEMIES, BASE_MAX_ENEMIES + growthSteps * ENEMIES_PER_GROWTH_STEP);
}

function getSpawnInterval(now) {
    const elapsed = now - gameStartAt;
    const decaySteps = Math.floor(elapsed / SPAWN_INTERVAL_DECAY_EVERY_MS);
    return Math.max(MIN_SPAWN_INTERVAL_MS, BASE_SPAWN_INTERVAL_MS - decaySteps * SPAWN_INTERVAL_DECAY_MS);
}

function getSpawnBatchSize(now) {
    const elapsed = now - gameStartAt;
    const growthSteps = Math.floor(elapsed / SPAWN_BATCH_GROWTH_EVERY_MS);
    return Math.min(MAX_SPAWN_BATCH_SIZE, BASE_SPAWN_BATCH_SIZE + growthSteps);
}

function givePlayerExp(amount) {
    playerController.player.exp += amount;
    while (playerController.player.exp >= playerController.player.maxExp) {
        playerController.player.exp -= playerController.player.maxExp;
        playerController.player.level += 1;
        playerController.player.maxExp += playerController.player.maxExp * 0.2;
    }
}

for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
    if (!isMap1) break;
    spawnEnemyNearPlayer();
}

// SPAWN DES PNJ statiques (uniquement dans la ville)
if (isVilleMap) {
    spawnPnj(1700, 2000);
    spawnPnj(2200, 1250);
    spawnPnj(2200, 2250);
    spawnPnj(1975, 2500);
    spawnPnj(1350, 2375);
    spawnPnj(3150, 1225);
    spawnPnj(2875, 2950);
}

window.addEventListener("keydown", (e) => {
    if (!playerController.hasPendingPerks()) return;

    if (e.key === "1" || e.key === "2" || e.key === "3") {
        const perkIndex = Number(e.key) - 1;
        const applied = playerController.applyPerkByIndex(perkIndex);
        if (applied) {
            e.preventDefault();
        }
    }
});

canvas.addEventListener("click", (e) => {
    const choices = playerController.getCurrentPerkChoices();
    if (!choices) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const clickX = (e.clientX - canvasRect.left) * scaleX;
    const clickY = (e.clientY - canvasRect.top) * scaleY;

    const layout = getPerkOverlayLayout(choices.length);
    if (!layout) return;

    for (let i = 0; i < layout.cards.length; i++) {
        const card = layout.cards[i];
        const insideX = clickX >= card.x && clickX <= card.x + card.w;
        const insideY = clickY >= card.y && clickY <= card.y + card.h;
        if (!insideX || !insideY) continue;

        const applied = playerController.applyPerkByIndex(i);
        if (applied) e.preventDefault();
        break;
    }
});

function getEntityHitbox(entity) {
    return {
        x: entity.x - entity.hitW / 2,
        y: entity.y - entity.hitH / 2,
        w: entity.hitW,
        h: entity.hitH
    };
}

function isRectOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

window.addEventListener("resize", () => {
    resizeCanvas();
    cameraController.clamp();
    uiStyles = readUiStyles();
});

// Boucle du jeu
function loop() {
    const canUpdateWorld = !playerController.hasPendingPerks();

    // ── UPDATES ──────────────────────────────────────────
    if (canUpdateWorld) {
        const enemies = isMap1 ? enemyControllers.map((c) => c.enemy) : [];
        playerController.update(enemies);
    }

    if (canUpdateWorld && isMap1) {
        const now = performance.now();
        const maxEnemies = getMaxEnemyCount(now);
        const spawnInterval = getSpawnInterval(now);
        const spawnBatchSize = getSpawnBatchSize(now);

        if (enemyControllers.length < maxEnemies && now - lastSpawnAt >= spawnInterval) {
            const availableSlots = maxEnemies - enemyControllers.length;
            const spawnCount = Math.min(spawnBatchSize, availableSlots);
            for (let i = 0; i < spawnCount; i++) spawnEnemyNearPlayer();
            lastSpawnAt = now;
        }

        for (const ec of enemyControllers) ec.update(playerController.player);

        for (let i = enemyControllers.length - 1; i >= 0; i--) {
            if (enemyControllers[i].enemy.hp > 0) continue;

            const deadEnemy = enemyControllers[i].enemy;
            const deadX = deadEnemy.x;
            const deadY = deadEnemy.y;

            const potionDropChance = deadEnemy.type === "orc3"
                ? ORC3_POTION_DROP_CHANCE
                : ORC_POTION_DROP_CHANCE;

            if (Math.random() < potionDropChance) {
                potions.push({
                    x: deadX,
                    y: deadY,
                    w: 32,
                    h: 32,
                    healAmount: POTION_HEAL_AMOUNT
              });
        }


            enemyControllers.splice(i, 1);
            killCount += 1;
            givePlayerExp(ENEMY_KILL_EXP);
        }
    }

    // UPDATE des PNJ (pas de draw ici !)
    if (canUpdateWorld) {
        for (const pnj of pnjControllers) pnj.update();
    }

    if (playerController.player.level > lastProcessedLevel) {
        const gainedLevels = playerController.player.level - lastProcessedLevel;
        playerController.queuePerkChoices(gainedLevels);
        lastProcessedLevel = playerController.player.level;
    }

    const playerHitbox = getEntityHitbox(playerController.player);

    if (canUpdateWorld) {
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

    if (isVilleMap && !isChangingMap && isRectOverlap(playerHitbox, map1PortalZone)) {
        isChangingMap = true;
        window.location.href = "map1.html";
        return;
    }

    if (canUpdateWorld) {
        let touchingEnemy = false;
        let contactDamage = CONTACT_DAMAGE;
        for (const ec of enemyControllers) {
            if (!isRectOverlap(playerHitbox, getEntityHitbox(ec.enemy))) continue;
            touchingEnemy = true;
            contactDamage = Math.max(contactDamage, ec.enemy.contactDamage || CONTACT_DAMAGE);
        }
        if (touchingEnemy) {
            const now = performance.now();
            if (now - lastContactDamageAt >= DAMAGE_COOLDOWN_MS) {
                playerController.player.hp = Math.max(0, playerController.player.hp - contactDamage);
                playerController.triggerHurt();
                lastContactDamageAt = now;
            }
        }
    }

    if (playerController.player.hp <= 0) {
        if (!isVilleMap && !isChangingMap) {
            isChangingMap = true;
            window.location.href = "ville.html";
            return;
        }
        playerController.player.x = playerController.player.spawnX;
        playerController.player.y = playerController.player.spawnY;
        playerController.player.hp = playerController.player.maxHp;
        lastContactDamageAt = performance.now();
    }

    // CAMERA
    cameraController.centerOn(playerController.player.x, playerController.player.y);

    // Nettoyer le canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // FOND = MAP
    mapRenderer.draw(cameraController.camera);
     // PNJ
        for (const pnj of pnjControllers) {
            pnj.draw();
        }

    // JOUEUR
    playerController.draw();

    // ATTAQUES
    playerController.drawAttacks();

    // POTIONS (dessinees avant les ennemis => derriere eux)
    for (const potion of potions) {
        const size = 55 * cameraController.camera.zoom;
        const drawX = (potion.x - cameraController.camera.x) * cameraController.camera.zoom - size / 2;
        const drawY = (potion.y - cameraController.camera.y) * cameraController.camera.zoom - size / 2;

        if (potionSprite.complete) {
            ctx.drawImage(
                potionSprite,
                drawX,
                drawY,
                size,
                size
            );
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(drawX, drawY, size, size);
        }
    }

    // ENNEMIS
    for (const enemyController of enemyControllers) {
        enemyController.draw();
    }

    if (window.drawCollidersOverlay) {
        window.drawCollidersOverlay(ctx, cameraController.camera, cameraController.camera.zoom);
    }

    if (SHOW_HITBOXES) {
        ctx.save();
        ctx.lineWidth = 2;

        const pX = (playerHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
        const pY = (playerHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
        const pW = playerHitbox.w * cameraController.camera.zoom;
        const pH = playerHitbox.h * cameraController.camera.zoom;
        ctx.strokeStyle = uiStyles.hitboxPlayerColor;
        ctx.strokeRect(pX, pY, pW, pH);

        ctx.strokeStyle = uiStyles.hitboxEnemyColor;
        for (const enemyController of enemyControllers) {
            const enemyHitbox = getEntityHitbox(enemyController.enemy);
            const eX = (enemyHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
            const eY = (enemyHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
            const eW = enemyHitbox.w * cameraController.camera.zoom;
            const eH = enemyHitbox.h * cameraController.camera.zoom;
            ctx.strokeRect(eX, eY, eW, eH);
        }

        ctx.restore();
    }

    // HUD - Barre de vie (bas gauche)
    const barX = uiStyles.hpOffsetLeft;
    const barY = canvas.height - uiStyles.hpOffsetBottom;
    const barWidth = uiStyles.hpBarWidth;
    const barHeight = uiStyles.hpBarHeight;
    const hpRatio = playerController.player.hp / playerController.player.maxHp;

    ctx.fillStyle = uiStyles.hpBorderColor;
    ctx.fillRect(
        barX - uiStyles.barBorderPadding,
        barY - uiStyles.barBorderPadding,
        barWidth + uiStyles.barBorderPadding * 2,
        barHeight + uiStyles.barBorderPadding * 2
    );
    ctx.fillStyle = uiStyles.barBackgroundColor;
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = uiStyles.hpFillColor;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    ctx.fillStyle = uiStyles.levelTextColor;
    ctx.font = uiStyles.levelFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${playerController.player.hp}/${playerController.player.maxHp}`, barX + barWidth / 2, barY + barHeight / 2);

    // HUD - Barre d'expérience (haut centre)
    const expBarWidth = uiStyles.expBarWidth;
    const expBarHeight = uiStyles.expBarHeight;
    const expBarX = (canvas.width / 2) - (expBarWidth / 2);
    const expBarY = uiStyles.expOffsetTop;
    const expRatio = playerController.player.exp / playerController.player.maxExp;

    ctx.fillStyle = uiStyles.expBorderColor;
    ctx.fillRect(
        expBarX - uiStyles.barBorderPadding,
        expBarY - uiStyles.barBorderPadding,
        expBarWidth + uiStyles.barBorderPadding * 2,
        expBarHeight + uiStyles.barBorderPadding * 2
    );
    ctx.fillStyle = uiStyles.barBackgroundColor;
    ctx.fillRect(expBarX, expBarY, expBarWidth, expBarHeight);
    ctx.fillStyle = uiStyles.expFillColor;
    ctx.fillRect(expBarX, expBarY, expBarWidth * expRatio, expBarHeight);

    ctx.fillStyle = uiStyles.levelTextColor;
    ctx.font = uiStyles.levelFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`level : ${playerController.player.level}`, canvas.width / 2, expBarY + expBarHeight / 2);

    // HUD (Kills)
    ctx.fillStyle = uiStyles.killTextColor;
    ctx.font = uiStyles.killFont;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`Kills : ${killCount}`, canvas.width - uiStyles.killOffsetRight, uiStyles.killOffsetTop);

    const perkChoices = playerController.getCurrentPerkChoices();
    if (perkChoices) {
        drawPerkOverlay(perkChoices);
    }

    requestAnimationFrame(loop);
}

function getPerkOverlayLayout(choiceCount) {
    if (!choiceCount || choiceCount <= 0) return null;

    const panelWidth = Math.min(uiStyles.perkPanelMaxWidth, canvas.width - uiStyles.perkPanelSideMargin);
    const panelHeight = uiStyles.perkPanelHeight;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    const gap = uiStyles.perkCardGap;
    const cardY = panelY + uiStyles.perkCardTopOffset;
    const cardHeight = uiStyles.perkCardHeight;
    const cardWidth = (panelWidth - (gap * (choiceCount + 1))) / choiceCount;
    const cards = [];

    for (let i = 0; i < choiceCount; i++) {
        cards.push({
            x: panelX + gap + i * (cardWidth + gap),
            y: cardY,
            w: cardWidth,
            h: cardHeight
        });
    }

    return {
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        cards
    };
}

function drawPerkOverlay(choices) {
    const layout = getPerkOverlayLayout(choices.length);
    if (!layout) return;

    const panelWidth = layout.panelWidth;
    const panelHeight = layout.panelHeight;
    const panelX = layout.panelX;
    const panelY = layout.panelY;

    ctx.save();

    ctx.fillStyle = uiStyles.perkOverlayBackdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = uiStyles.perkPanelBackground;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = uiStyles.perkPanelBorderColor;
    ctx.lineWidth = uiStyles.perkPanelBorderWidth;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = uiStyles.perkTitleColor;
    ctx.font = uiStyles.perkTitleFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Choisis un perk", canvas.width / 2, panelY + 18);

    for (let i = 0; i < choices.length; i++) {
        const card = layout.cards[i];
        const cardX = card.x;
        const cardY = card.y;
        const cardWidth = card.w;
        const cardHeight = card.h;
        const perk = choices[i];

        ctx.fillStyle = uiStyles.perkCardBackground;
        ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
        ctx.strokeStyle = uiStyles.perkCardBorderColor;
        ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

        ctx.fillStyle = uiStyles.perkNumberColor;
        ctx.font = uiStyles.perkNumberFont;
        ctx.textAlign = "left";
        ctx.fillText(`${i + 1}`, cardX + 12, cardY + 10);

        ctx.fillStyle = uiStyles.perkNameColor;
        ctx.font = uiStyles.perkNameFont;
        ctx.fillText(perk.name, cardX + 12, cardY + 46);

        ctx.fillStyle = uiStyles.perkDescriptionColor;
        ctx.font = uiStyles.perkDescriptionFont;
        ctx.fillText(perk.description, cardX + 12, cardY + 82);

        ctx.fillStyle = uiStyles.perkHintColor;
        ctx.font = uiStyles.perkHintFont;
        ctx.fillText(`Touche ${i + 1}`, cardX + 12, cardY + 124);
    }

    ctx.restore();
}

loop();