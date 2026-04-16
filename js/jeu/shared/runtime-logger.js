window.GameRuntimeLogger = (() => {
    const PREFIX = "[GraveSong]";

    function info(message, details) {
        if (details !== undefined) {
            console.info(`${PREFIX} ${message}`, details);
            return;
        }
        console.info(`${PREFIX} ${message}`);
    }

    function success(message, details) {
        if (details !== undefined) {
            console.log(`${PREFIX} [OK] ${message}`, details);
            return;
        }
        console.log(`${PREFIX} [OK] ${message}`);
    }

    function error(message, err) {
        if (err) {
            console.error(`${PREFIX} [ERROR] ${message}`, err);
            return;
        }
        console.error(`${PREFIX} [ERROR] ${message}`);
    }

    function trackStep(stepName, fn) {
        try {
            const result = fn();
            success(`${stepName} termine`);
            return result;
        } catch (err) {
            error(`${stepName} a echoue`, err);
            throw err;
        }
    }

    function trackImage(image, label, src) {
        if (!image) {
            error(`Image ${label} introuvable`);
            return;
        }

        image.addEventListener("load", () => {
            success(`Sprite charge: ${label}`, { src });
        });

        image.addEventListener("error", () => {
            error(`Echec de chargement sprite: ${label}`, { src });
        });
    }

    window.addEventListener("error", (event) => {
        const message = event?.message || "Erreur JS inconnue";
        error(`Erreur globale: ${message}`, event?.error || event);
    });

    window.addEventListener("unhandledrejection", (event) => {
        error("Promesse rejetee non geree", event?.reason || event);
    });

    info("Runtime logger initialise");

    return {
        info,
        success,
        error,
        trackStep,
        trackImage
    };
})();