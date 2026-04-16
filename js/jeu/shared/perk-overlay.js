window.GamePerkOverlay = (() => {
    function getLayout(canvas, uiStyles, choiceCount) {
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

    function draw(ctx, canvas, uiStyles, choices) {
        const layout = getLayout(canvas, uiStyles, choices.length);
        if (!layout) return;

        ctx.save();
        ctx.fillStyle = uiStyles.perkOverlayBackdrop;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = uiStyles.perkPanelBackground;
        ctx.fillRect(layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight);
        ctx.strokeStyle = uiStyles.perkPanelBorderColor;
        ctx.lineWidth = uiStyles.perkPanelBorderWidth;
        ctx.strokeRect(layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight);

        ctx.fillStyle = uiStyles.perkTitleColor;
        ctx.font = uiStyles.perkTitleFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("Choisis un perk", canvas.width / 2, layout.panelY + 18);

        for (let i = 0; i < choices.length; i++) {
            const card = layout.cards[i];
            const perk = choices[i];

            ctx.fillStyle = uiStyles.perkCardBackground;
            ctx.fillRect(card.x, card.y, card.w, card.h);
            ctx.strokeStyle = uiStyles.perkCardBorderColor;
            ctx.strokeRect(card.x, card.y, card.w, card.h);

            ctx.fillStyle = uiStyles.perkNumberColor;
            ctx.font = uiStyles.perkNumberFont;
            ctx.textAlign = "left";
            ctx.fillText(`${i + 1}`, card.x + 12, card.y + 10);

            ctx.fillStyle = uiStyles.perkNameColor;
            ctx.font = uiStyles.perkNameFont;
            ctx.fillText(perk.name, card.x + 12, card.y + 46);

            ctx.fillStyle = uiStyles.perkDescriptionColor;
            ctx.font = uiStyles.perkDescriptionFont;
            ctx.fillText(perk.description, card.x + 12, card.y + 82);

            ctx.fillStyle = uiStyles.perkHintColor;
            ctx.font = uiStyles.perkHintFont;
            ctx.fillText(`Touche ${i + 1}`, card.x + 12, card.y + 124);
        }

        ctx.restore();
    }

    return {
        getLayout,
        draw
    };
})();
