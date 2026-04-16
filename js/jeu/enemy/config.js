window.ENEMY_TYPE_CONFIGS = {
    gobelin: {
        spriteSrc: "../assets/sprites/Characters(100x100)/Orc/Orc/Orc-Walk.png",
        attackSequenceSprites: [
            "../assets/sprites/Characters(100x100)/Orc/Orc/Orc-Attack01.png",
            "../assets/sprites/Characters(100x100)/Orc/Orc/Orc-Attack02.png"
        ],
        frameSize: 100,
        walkFrames: 6,
        speed: 1.52,
        walkAnimSpeed: 12,
        attackAnimSpeed: 10,
        scale: 2,
        hp: 20,
        maxhp: 20,
        hitW: 36,
        hitH: 54,
        attackHitW: 120,
        attackHitH: 120,
        minDistancePadding: 3,
        attackCooldownMs: 500,
        attackRange: 72
    },
    orc3: {
        spriteSrc: "../assets/sprites/Orc3/orc3_walk/orc3_walk_full.png",
        attackSequenceSprites: [
            "../assets/sprites/Orc3/orc3_attack/orc3_attack_full.png",
            "../assets/sprites/Orc3/orc3_run_attack/orc3_run_attack_full.png"
        ],
        frameSize: 64,
        walkFrames: 6,
        speed: 0.97,
        walkAnimSpeed: 16,
        attackAnimSpeed: 12,
        scale: 2.2,
        hp: 120,
        maxhp: 120,
        hitW: 46,
        hitH: 66,
        contactDamage: 14,
        minDistancePadding: 5,
        attackRange: 96
    },
    "flower-wolf": {
        spriteSrc: "../assets/sprites/Flower-Wolf/Walk.png",
        attackSequenceSprites: [
            "../assets/sprites/Flower-Wolf/Attack1.png",
            "../assets/sprites/Flower-Wolf/Attack2.png",
            "../assets/sprites/Flower-Wolf/Attack3.png",
            "../assets/sprites/Flower-Wolf/Attack4.png"
        ],
        frameSize: 96,
        walkFrames: 6,
        speed: 0.88,
        walkAnimSpeed: 14,
        attackAnimSpeed: 18,
        scale: 1.3,
        hp: 1500,
        maxhp: 1500,
        hitW: 76,
        hitH: 96,
        attackHitW: 128,
        attackHitH: 128,
        contactDamage: 12,
        minDistancePadding: 0,
        flipWhenFacingRight: true,
        freezeMovementDuringAttack: true,
        attackRange: 60
    },
    slime2: {
        spriteSrc: "../assets/sprites/Slime2/Without_shadow/Slime2_Walk_without_shadow.png",
        attackSpriteSrc: "../assets/sprites/Slime2/Without_shadow/Slime2_Attack_without_shadow.png",
        frameSize: 64,
        walkFrames: 8,
        attackFrames: 11,
        speed: 0.76,
        walkAnimSpeed: 11,
        attackAnimSpeed: 9,
        scale: 1.42,
        hp: 20,
        maxhp: 20,
        hitW: 28,
        hitH: 20,
        contactDamage: 4,
        minDistancePadding: 2,
        attackRange: 58
    }
};
