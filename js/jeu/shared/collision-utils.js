window.GameCollisionUtils = (() => {
    function getEntityHitbox(entity) {
        const hitOffsetX = Number(entity.hitOffsetX) || 0;
        const hitOffsetY = Number(entity.hitOffsetY) || 0;
        return {
            x: entity.x - entity.hitW / 2 + hitOffsetX,
            y: entity.y - entity.hitH / 2 + hitOffsetY,
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

    return {
        getEntityHitbox,
        isRectOverlap
    };
})();
