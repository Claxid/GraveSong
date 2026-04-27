window.GameImageUtils = (() => {
    function createTrackedImage(label, src) {
        const image = new Image();
        window.GameRuntimeLogger?.trackImage(image, label, src);
        image.src = src;
        return image;
    }

    return {
        createTrackedImage
    };
})();
