/**
 * NEXUS ONE-LINE READINESS COLOR HOTFIX
 * ======================================
 *
 * Why this exists:
 * The core diagram engine can use its internal sample equipment when the
 * host page does not pass an equipment array. The additive readiness module
 * originally looked only at the host-supplied equipment map, so sample nodes
 * resolved as "no data" and all appeared gray.
 *
 * This additive patch reads the completion percentage already rendered in
 * each node's .pct text, then applies the approved readiness color. It does
 * not remove or replace any editor, dashboard, QR, storage, navigation,
 * gesture, or Firebase-hook behavior.
 */
(function initializeNexusReadinessColorHotfix() {
  "use strict";

  const COLORS = {
    gray: "#8b929b",
    blue: "#1f7dff",
    orange: "#ff7a00",
    yellow: "#ffe600",
    green: "#00f56a",
    red: "#ff2438"
  };

  function readinessFromText(text) {
    const normalized = String(text || "").trim().toUpperCase();

    if (normalized.includes("ENERGIZED")) {
      return { key: "red", color: COLORS.red, rank: 5 };
    }

    const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*%/);
    if (!match) {
      return { key: "gray", color: COLORS.gray, rank: 0 };
    }

    const percent = Math.max(0, Math.min(100, Number(match[1])));

    if (percent <= 0) return { key: "gray", color: COLORS.gray, rank: 0 };
    if (percent <= 25) return { key: "blue", color: COLORS.blue, rank: 1 };
    if (percent <= 60) return { key: "orange", color: COLORS.orange, rank: 2 };
    if (percent < 100) return { key: "yellow", color: COLORS.yellow, rank: 3 };
    return { key: "green", color: COLORS.green, rank: 4 };
  }

  function nodeInfo(group) {
    const idElement = group.querySelector(".id");
    const percentElement = group.querySelector(".pct");

    return {
      id: idElement ? String(idElement.textContent || "").trim() : "",
      readiness: readinessFromText(percentElement ? percentElement.textContent : "")
    };
  }

  function decorateNodes(root) {
    root.querySelectorAll(".node").forEach(function decorateNode(group) {
      const info = nodeInfo(group);
      group.dataset.equipmentId = info.id;
      group.dataset.readiness = info.readiness.key;
      group.style.setProperty("--nx-readiness-color", info.readiness.color);
    });
  }

  function nearestNodeId(point, geometry) {
    let winner = "";
    let bestDistance = Infinity;

    geometry.forEach(function compare(node) {
      const dx = point.x - node.x;
      const dy = point.y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < bestDistance) {
        bestDistance = distance;
        winner = node.id;
      }
    });

    return winner;
  }

  function decorateConnections(root) {
    const geometry = Array.from(root.querySelectorAll(".node")).map(function mapNode(group) {
      const info = nodeInfo(group);
      const matrix = group.transform && group.transform.baseVal
        ? group.transform.baseVal.consolidate()
        : null;
      const box = group.getBBox();
      const x = (matrix ? matrix.matrix.e : 0) + box.x + box.width / 2;
      const y = (matrix ? matrix.matrix.f : 0) + box.y + box.height / 2;

      return {
        id: info.id,
        readiness: info.readiness,
        x,
        y
      };
    });

    root.querySelectorAll(".connection").forEach(function decorateConnection(path) {
      try {
        const length = path.getTotalLength();
        const fromId = nearestNodeId(path.getPointAtLength(0), geometry);
        const toId = nearestNodeId(path.getPointAtLength(length), geometry);
        const from = geometry.find(function find(item) { return item.id === fromId; });
        const to = geometry.find(function find(item) { return item.id === toId; });

        if (!from || !to) return;

        let state;
        if (from.readiness.key === "red" && to.readiness.key === "red") {
          state = { key: "red", color: COLORS.red, rank: 5 };
        } else {
          const eligible = [from.readiness, to.readiness]
            .filter(function excludeRed(item) { return item.key !== "red"; })
            .sort(function lowestFirst(a, b) { return a.rank - b.rank; });

          state = eligible[0] || { key: "gray", color: COLORS.gray, rank: 0 };
        }

        path.dataset.readiness = state.key;
        path.dataset.fromEquipmentId = fromId;
        path.dataset.toEquipmentId = toId;
        path.style.setProperty("--nx-readiness-color", state.color);
      } catch (error) {
        // Geometry may be temporarily unavailable during an SVG redraw.
      }
    });
  }

  function apply(root) {
    if (!root || !root.classList.contains("nexus-field-readiness")) return;
    decorateNodes(root);
    decorateConnections(root);
  }

  function install(root) {
    if (!root || root.dataset.readinessHotfixInstalled === "1") return;
    root.dataset.readinessHotfixInstalled = "1";

    let queued = false;
    const queueApply = function queueApply() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function runApply() {
        queued = false;
        apply(root);
      });
    };

    const observer = new MutationObserver(queueApply);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "transform"]
    });

    queueApply();
  }

  function scan() {
    document.querySelectorAll(".nexus-one-line").forEach(install);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  const pageObserver = new MutationObserver(scan);
  pageObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
