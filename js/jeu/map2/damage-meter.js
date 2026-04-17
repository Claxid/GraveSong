(function initTowerDamageMeter() {
    const currentPath = window.location.pathname.replace(/\\/g, "/");
    const isTowerMap = currentPath.endsWith("/template/map1.html") || currentPath.endsWith("/template/map2.html");
    if (!isTowerMap) return;

    const STORAGE_KEY = "gravesong.towerDamageMeter.v1";
    const REFRESH_INTERVAL_MS = 3000;
    const MAX_EVENTS = 2000;

    const events = [];
    let collapsed = false;

    function saveState() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                collapsed,
                events
            }));
        } catch (_err) {
            // Ignore storage failures.
        }
    }

    function loadState() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                if (Array.isArray(parsed.events)) {
                    events.push(...parsed.events.filter((evt) => evt && Number.isFinite(evt.amount) && evt.amount > 0));
                    if (events.length > MAX_EVENTS) {
                        events.splice(0, events.length - MAX_EVENTS);
                    }
                }
                if (typeof parsed.collapsed === "boolean") {
                    collapsed = parsed.collapsed;
                }
            }
        } catch (_err) {
            // Ignore malformed state.
        }
    }

    const root = document.createElement("div");
    root.id = "tower-damage-meter";
    root.style.position = "fixed";
    root.style.right = "22px";
    root.style.bottom = "22px";
    root.style.width = "320px";
    root.style.maxWidth = "calc(100vw - 24px)";
    root.style.border = "1px solid rgba(255, 208, 120, 0.45)";
    root.style.borderRadius = "10px";
    root.style.background = "linear-gradient(180deg, rgba(12,16,28,0.95), rgba(6,8,14,0.94))";
    root.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.5)";
    root.style.backdropFilter = "blur(4px)";
    root.style.color = "#f3d9a2";
    root.style.fontFamily = "Georgia, 'Times New Roman', serif";
    root.style.zIndex = "9999";
    root.style.overflow = "hidden";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.padding = "8px 10px";
    header.style.borderBottom = "1px solid rgba(255, 208, 120, 0.2)";
    header.style.background = "linear-gradient(180deg, rgba(46,36,14,0.65), rgba(23,18,7,0.35))";

    const title = document.createElement("div");
    title.textContent = "Historique des degats";
    title.style.fontSize = "14px";
    title.style.fontWeight = "700";
    title.style.letterSpacing = "0.2px";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = "▾";
    toggleBtn.setAttribute("aria-label", "Masquer l'historique des degats");
    toggleBtn.style.width = "20px";
    toggleBtn.style.height = "20px";
    toggleBtn.style.border = "none";
    toggleBtn.style.borderRadius = "4px";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.background = "rgba(255, 214, 140, 0.16)";
    toggleBtn.style.color = "#f4dcad";
    toggleBtn.style.fontSize = "12px";
    toggleBtn.style.lineHeight = "20px";
    toggleBtn.style.padding = "0";

    const body = document.createElement("div");
    body.style.maxHeight = "180px";
    body.style.overflowY = "auto";

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    function makeTh(text, align) {
        const th = document.createElement("th");
        th.textContent = text;
        th.style.padding = "8px 10px";
        th.style.fontSize = "12px";
        th.style.fontWeight = "700";
        th.style.color = "#d8c28d";
        th.style.textAlign = align;
        th.style.borderBottom = "1px solid rgba(255, 208, 120, 0.15)";
        return th;
    }

    headerRow.appendChild(makeTh("Competence", "left"));
    headerRow.appendChild(makeTh("Degats", "right"));
    headerRow.appendChild(makeTh("Part", "right"));
    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");

    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.justifyContent = "space-between";
    footer.style.padding = "6px 10px";
    footer.style.borderTop = "1px solid rgba(255, 208, 120, 0.15)";
    footer.style.fontSize = "12px";
    footer.style.color = "#d8c28d";

    const totalEl = document.createElement("span");
    const refreshEl = document.createElement("span");
    refreshEl.textContent = "MAJ: 3s";

    footer.appendChild(totalEl);
    footer.appendChild(refreshEl);

    table.appendChild(thead);
    table.appendChild(tbody);
    body.appendChild(table);

    header.appendChild(title);
    header.appendChild(toggleBtn);

    root.appendChild(header);
    root.appendChild(body);
    root.appendChild(footer);
    document.body.appendChild(root);

    function formatNumber(value) {
        return Math.round(value).toLocaleString("fr-FR");
    }

    function computeRows() {
        const totals = new Map();
        let grandTotal = 0;

        for (const evt of events) {
            const key = evt.source || "Inconnu";
            const current = totals.get(key) || 0;
            totals.set(key, current + evt.amount);
            grandTotal += evt.amount;
        }

        const rows = Array.from(totals.entries())
            .map(([source, amount]) => ({ source, amount }))
            .sort((a, b) => b.amount - a.amount);

        return { rows, grandTotal };
    }

    function renderRows() {
        if (collapsed) return;

        const { rows, grandTotal } = computeRows();
        tbody.innerHTML = "";

        if (rows.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 3;
            td.textContent = "Aucun degat enregistre";
            td.style.padding = "10px";
            td.style.fontSize = "12px";
            td.style.color = "#bfa977";
            td.style.textAlign = "center";
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            for (const row of rows) {
                const tr = document.createElement("tr");

                const sourceTd = document.createElement("td");
                sourceTd.textContent = row.source;
                sourceTd.style.padding = "6px 10px";
                sourceTd.style.fontSize = "12px";
                sourceTd.style.color = "#f3e6c8";

                const amountTd = document.createElement("td");
                amountTd.textContent = formatNumber(row.amount);
                amountTd.style.padding = "6px 10px";
                amountTd.style.textAlign = "right";
                amountTd.style.fontSize = "12px";
                amountTd.style.color = "#f1c768";

                const shareTd = document.createElement("td");
                const pct = grandTotal > 0 ? (row.amount / grandTotal) * 100 : 0;
                shareTd.textContent = `${pct.toFixed(1)}%`;
                shareTd.style.padding = "6px 10px";
                shareTd.style.textAlign = "right";
                shareTd.style.fontSize = "12px";
                shareTd.style.color = "#e4d8bd";

                tr.appendChild(sourceTd);
                tr.appendChild(amountTd);
                tr.appendChild(shareTd);
                tbody.appendChild(tr);
            }
        }

        totalEl.textContent = `Total: ${formatNumber(grandTotal)}`;
    }

    function applyCollapsedState() {
        if (collapsed) {
            body.style.display = "none";
            footer.style.display = "none";
            root.style.width = "40px";
            root.style.height = "30px";
            root.style.bottom = "22px";
            root.style.right = "22px";
            header.style.padding = "4px";
            header.style.borderBottom = "none";
            title.style.display = "none";
            toggleBtn.textContent = "▸";
            toggleBtn.setAttribute("aria-label", "Afficher l'historique des degats");
        } else {
            body.style.display = "block";
            footer.style.display = "flex";
            root.style.width = "320px";
            root.style.height = "auto";
            header.style.padding = "8px 10px";
            header.style.borderBottom = "1px solid rgba(255, 208, 120, 0.2)";
            title.style.display = "block";
            toggleBtn.textContent = "▾";
            toggleBtn.setAttribute("aria-label", "Masquer l'historique des degats");
            renderRows();
        }
    }

    toggleBtn.addEventListener("click", () => {
        collapsed = !collapsed;
        applyCollapsedState();
        saveState();
    });

    window.recordTowerDamage = function recordTowerDamage(payload) {
        if (!payload || !Number.isFinite(payload.amount) || payload.amount <= 0) return;

        events.push({
            source: String(payload.source || "Inconnu"),
            amount: Math.max(0, Number(payload.amount)),
            at: Date.now()
        });

        if (events.length > MAX_EVENTS) {
            events.splice(0, events.length - MAX_EVENTS);
        }

        saveState();
    };

    loadState();

    setInterval(() => {
        renderRows();
    }, REFRESH_INTERVAL_MS);

    window.addEventListener("beforeunload", saveState);

    renderRows();
})();
