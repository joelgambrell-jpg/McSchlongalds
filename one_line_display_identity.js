/**
 * NEXUS ONE-LINE DISPLAY IDENTITY
 * ===============================
 *
 * Additive presentation layer for large office/VFM and QR field displays.
 *
 * FIELD HEADER CONTRACT
 * ---------------------
 * The field display intentionally shows only:
 * - NEXUS
 * - BUILDING identifier
 * - OVERALL or the active PHASE
 * - FIELD VIEW / READ ONLY
 *
 * Project names, project codes, site names, and "Data Science LLC" are
 * deliberately omitted so the diagram receives the maximum usable space.
 *
 * This module also moves the existing Fit / zoom controls into a compact
 * floating control group over the diagram. The original buttons are moved,
 * not duplicated, so all existing event handlers remain intact.
 */
(function initializeNexusOneLineDisplayIdentity() {
  "use strict";

  const PHASE_COLORS = [
    "#00f56a",
    "#1f7dff",
    "#ff7a00",
    "#b45cff",
    "#00e5ff",
    "#ff4fd8"
  ];

  function ensureCompactStylesheet() {
    if (document.querySelector('link[data-nexus-field-compact="1"]')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "one_line_field_compact.css?v=1";
    link.dataset.nexusFieldCompact = "1";
    document.head.appendChild(link);
  }

  function parameters() {
    return new URLSearchParams(window.location.search);
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function capitalize(letter) {
        return letter.toUpperCase();
      });
  }

  function isFieldView() {
    const params = parameters();
    return params.get("mode") === "view" &&
      (params.get("viewer") === "1" || params.get("presentation") === "field");
  }

  function buildIdentity() {
    const params = parameters();
    const buildingId = params.get("building") || "A";
    const diagramId = params.get("diagram") || "overall";

    return {
      buildingLabel: "BUILDING " + String(buildingId).toUpperCase(),
      diagramLabel: String(diagramId).toLowerCase() === "overall"
        ? "OVERALL"
        : titleCase(diagramId).toUpperCase()
    };
  }

  function addFieldBanner(root) {
    if (!isFieldView() || root.querySelector(".nx-display-identity")) return;

    const identity = buildIdentity();
    const banner = document.createElement("header");
    banner.className = "nx-display-identity";
    banner.setAttribute("aria-label", "Building and diagram identification");

    banner.innerHTML = [
      '<div class="nx-display-brand" aria-label="NEXUS">NE<span class="nx-brand-x">X</span>US</div>',
      '<div class="nx-display-building">',
      '<strong>' + identity.buildingLabel + "</strong>",
      '<span>' + identity.diagramLabel + "</span>",
      "</div>",
      '<div class="nx-display-state"><strong>FIELD VIEW</strong><span>READ ONLY</span></div>'
    ].join("");

    root.insertBefore(banner, root.firstChild);
  }

  function moveFieldControls(root) {
    if (!isFieldView() || root.querySelector(".nx-field-floating-controls")) return;

    const buttons = [
      root.querySelector('[data-action="fit"]'),
      root.querySelector('[data-action="zoom-out"]'),
      root.querySelector('[data-action="zoom-in"]')
    ].filter(Boolean);

    if (!buttons.length) return;

    const controls = document.createElement("div");
    controls.className = "nx-field-floating-controls";
    controls.setAttribute("aria-label", "Diagram zoom controls");

    buttons.forEach(function moveButton(button) {
      controls.appendChild(button);
    });

    root.appendChild(controls);
  }

  function phaseNumber(text) {
    const match = String(text || "").match(/PHASE\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  function decoratePhaseZones(root) {
    root.querySelectorAll(".zone").forEach(function decorateZone(group) {
      const text = group.querySelector("text");
      const rect = group.querySelector("rect");
      const label = text ? String(text.textContent || "").trim() : "";
      const number = phaseNumber(label);
      const color = number
        ? PHASE_COLORS[(number - 1) % PHASE_COLORS.length]
        : "#b8c2ce";

      group.dataset.phaseZone = number ? String(number) : "other";
      group.style.setProperty("--nx-phase-color", color);

      if (rect) rect.style.setProperty("--nx-phase-color", color);
      if (text) text.style.setProperty("--nx-phase-color", color);
    });
  }

  function install(root) {
    if (!root || root.dataset.displayIdentityInstalled === "1") return;
    root.dataset.displayIdentityInstalled = "1";

    addFieldBanner(root);
    moveFieldControls(root);
    decoratePhaseZones(root);

    let queued = false;
    const observer = new MutationObserver(function handleMutation() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function refreshIdentity() {
        queued = false;
        addFieldBanner(root);
        moveFieldControls(root);
        decoratePhaseZones(root);
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function scan() {
    document.querySelectorAll(".nexus-one-line").forEach(install);
  }

  ensureCompactStylesheet();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  const pageObserver = new MutationObserver(scan);
  pageObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
