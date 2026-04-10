window.CollisionColorUtils = (() => {
    function rgbToHsv(r, g, b) {
        const maxRGB = Math.max(r, g, b);
        const minRGB = Math.min(r, g, b);
        const delta = maxRGB - minRGB;
        const value = maxRGB;
        const sat = maxRGB === 0 ? 0 : delta / maxRGB;

        let hue = 0;
        if (delta !== 0) {
            if (maxRGB === r) hue = 60 * (((g - b) / delta) % 6);
            else if (maxRGB === g) hue = 60 * (((b - r) / delta) + 2);
            else hue = 60 * (((r - g) / delta) + 4);
        }
        if (hue < 0) hue += 360;

        return { hue, sat, value };
    }

    function isRoofColor(hue, sat, value) {
        const isGroundHue = hue >= 25 && hue <= 75;
        const isRoofBlue = sat > 0.25 && value > 50 && hue >= 190 && hue <= 250;
        const isRoofRed = sat > 0.25 && value > 60 && (hue <= 20 || hue >= 330);
        const isRoofBrown = sat > 0.18 && value > 50 && hue >= 20 && hue <= 45;
        const isRoofGrey = sat < 0.15 && value >= 70 && value <= 185 && !isGroundHue;
        return (isRoofBlue || isRoofRed || isRoofBrown || isRoofGrey) && !isGroundHue;
    }

    return { rgbToHsv, isRoofColor };
})();
