const GOBELIN_POTION_DROP_CHANCE = 0.02;
const ORC3_POTION_DROP_CHANCE = 0.04;
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
    { type: "gobelin", weight: 95 },
    { type: "orc3", weight: 5 }
];
const BOSS_SPAWN_DELAY_MS = 5 * 60 * 1000;

const CONTACT_DAMAGE = 5;
const DAMAGE_COOLDOWN_MS = 500;
const DEATH_CINEMATIC_DURATION_MS = 3200;
const DEATH_FLASH_IN_MS = 420;
const DEATH_FLASH_HOLD_MS = 280;
const DEATH_FLASH_OUT_MS = 900;
const DEATH_FLASH_INTENSITY = 0.62;
const DEATH_STATUE_SCALE = 1;
const DEATH_STATUE1_OFFSET_X = 0;
const DEATH_STATUE1_OFFSET_Y = -0.04;
const TELEPORT_CINEMATIC_DURATION_MS = 1350;
const TELEPORT_FLASH_IN_MS = 220;
const TELEPORT_FLASH_HOLD_MS = 260;
const TELEPORT_FLASH_OUT_MS = 520;
const TELEPORT_GLOW_INTENSITY = 0.7;
const SHOW_HITBOXES = false;

const isMap1 = window.location.pathname.replace(/\\/g, "/").endsWith("/template/map1.html");
const isVilleMap = window.location.pathname.replace(/\\/g, "/").endsWith("/template/ville.html");
const map1PortalZone = {
    x: 2270,
    y: 895,
    w: 2309 - 2270,
    h: 951 - 895
};
const DEV_TEST_COMBO_KEY = "b";