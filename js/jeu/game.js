// CANVAS PLEIN ECRAN + RESPONSIVE
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Ajuste la taille du canvas à la taille de l'écran
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

const mapRenderer = createMapRenderer(canvas, ctx);
const cameraController = createCameraController(canvas, mapRenderer.MAP_WIDTH, mapRenderer.MAP_HEIGHT);
const playerController = createPlayerController(canvas, ctx, cameraController.camera);
const enemyControllers = [];

const SPAWN_RING_MIN = 500;
const SPAWN_RING_MAX = 700;
const SPAWN_INTERVAL_MS = 2200;
const INITIAL_ENEMY_COUNT = 2;
const BASE_MAX_ENEMIES = 5;
const ENEMY_GROWTH_EVERY_MS = 20000;
const ABSOLUTE_MAX_ENEMIES = 18;
const ENEMY_KILL_EXP = 20;

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

function spawnEnemyNearPlayer() {
    const spawn = getRandomSpawnAroundPlayer(playerController.player);
    enemyControllers.push(createEnemyController(canvas, ctx, cameraController.camera, spawn.x, spawn.y));
}

function getMaxEnemyCount(now) {
    const elapsed = now - gameStartAt;
    const growthSteps = Math.floor(elapsed / ENEMY_GROWTH_EVERY_MS);
    return Math.min(ABSOLUTE_MAX_ENEMIES, BASE_MAX_ENEMIES + growthSteps);
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
});


function loop() {
    const canUpdateWorld = !playerController.hasPendingPerks();

    if (canUpdateWorld) {
        const enemies = isMap1 ? enemyControllers.map((controller) => controller.enemy) : [];
        playerController.update(enemies);
    }

    if (canUpdateWorld && isMap1) {
        const now = performance.now();
        const maxEnemies = getMaxEnemyCount(now);
        if (enemyControllers.length < maxEnemies && now - lastSpawnAt >= SPAWN_INTERVAL_MS) {
            spawnEnemyNearPlayer();
            lastSpawnAt = now;
        }

        for (const enemyController of enemyControllers) {
            enemyController.update(playerController.player);
        }

        for (let i = enemyControllers.length - 1; i >= 0; i--) {
            if (enemyControllers[i].enemy.hp > 0) continue;
            enemyControllers.splice(i, 1);
            givePlayerExp(ENEMY_KILL_EXP);
        }
    }

    if (playerController.player.level > lastProcessedLevel) {
        const gainedLevels = playerController.player.level - lastProcessedLevel;
        playerController.queuePerkChoices(gainedLevels);
        lastProcessedLevel = playerController.player.level;
    }

    const playerHitbox = getEntityHitbox(playerController.player);

    if (isVilleMap && !isChangingMap && isRectOverlap(playerHitbox, map1PortalZone)) {
        isChangingMap = true;
        window.location.href = "map1.html";
        return;
    }

    if (canUpdateWorld) {
        let touchingEnemy = false;
        for (const enemyController of enemyControllers) {
            const enemyHitbox = getEntityHitbox(enemyController.enemy);
            if (isRectOverlap(playerHitbox, enemyHitbox)) {
                touchingEnemy = true;
                break;
            }
        }

        if (touchingEnemy) {
            const now = performance.now();
            if (now - lastContactDamageAt >= DAMAGE_COOLDOWN_MS) {
                playerController.player.hp = Math.max(0, playerController.player.hp - CONTACT_DAMAGE);
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

    // Mettre à jour la caméra (centrer sur le joueur)
    cameraController.centerOn(playerController.player.x, playerController.player.y);

    // FOND = MAP
    mapRenderer.draw(cameraController.camera);

    // JOUEUR
    playerController.draw();

    // EFFETS D'ATTAQUE (dessinés après le joueur, avant les ennemis)
    playerController.drawAttacks();

    // ENNEMI
    for (const enemyController of enemyControllers) {
        enemyController.draw();
    }

    if (SHOW_HITBOXES) {
        ctx.save();
        ctx.lineWidth = 2;

        const pX = (playerHitbox.x - cameraController.camera.x) * cameraController.camera.zoom;
        const pY = (playerHitbox.y - cameraController.camera.y) * cameraController.camera.zoom;
        const pW = playerHitbox.w * cameraController.camera.zoom;
        const pH = playerHitbox.h * cameraController.camera.zoom;
        ctx.strokeStyle = "#00ff00";
        ctx.strokeRect(pX, pY, pW, pH);

        ctx.strokeStyle = "#ff0000";
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
    const barX = 20;
    const barY = canvas.height - 40;
    const barWidth = 200;
    const barHeight = 20;
    const hpRatio = playerController.player.hp / playerController.player.maxHp;

    ctx.fillStyle = "black";
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    ctx.fillStyle = "#555";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "rgb(140, 16, 16)";
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // HUD - Barre d'expérience (haut centre)
    const expBarWidth = 500;
    const expBarHeight = 17;
    const expBarX = (canvas.width / 2) - (expBarWidth / 2);
    const expBarY = 10;
    const expRatio = playerController.player.exp / playerController.player.maxExp;

    ctx.fillStyle = "black";
    ctx.fillRect(expBarX - 2, expBarY - 2, expBarWidth + 4, expBarHeight + 4);
    ctx.fillStyle = "#555";
    ctx.fillRect(expBarX, expBarY, expBarWidth, expBarHeight);
    ctx.fillStyle = "rgb(196, 138, 31)";
    ctx.fillRect(expBarX, expBarY, expBarWidth * expRatio, expBarHeight);

    ctx.fillStyle = "white";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`level : ${playerController.player.level}`, canvas.width / 2, expBarY + expBarHeight / 2);

    const perkChoices = playerController.getCurrentPerkChoices();
    if (perkChoices) {
        drawPerkOverlay(perkChoices);
    }

    requestAnimationFrame(loop);
}

function drawPerkOverlay(choices) {
    const panelWidth = Math.min(900, canvas.width - 60);
    const panelHeight = 260;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(24, 24, 24, 0.95)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = "#f7e9ba";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Choisis un perk", canvas.width / 2, panelY + 18);

    const gap = 16;
    const cardY = panelY + 70;
    const cardHeight = 160;
    const cardWidth = (panelWidth - (gap * 4)) / 3;

    for (let i = 0; i < choices.length; i++) {
        const cardX = panelX + gap + i * (cardWidth + gap);
        const perk = choices[i];

        ctx.fillStyle = "#2b2b2b";
        ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
        ctx.strokeStyle = "#8f7b3f";
        ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

        ctx.fillStyle = "#f5d26a";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`${i + 1}`, cardX + 12, cardY + 10);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Arial";
        ctx.fillText(perk.name, cardX + 12, cardY + 46);

        ctx.fillStyle = "#d1d1d1";
        ctx.font = "15px Arial";
        ctx.fillText(perk.description, cardX + 12, cardY + 82);

        ctx.fillStyle = "#c0b080";
        ctx.font = "bold 14px Arial";
        ctx.fillText(`Touche ${i + 1}`, cardX + 12, cardY + 124);
    }

    ctx.restore();
}
loop();