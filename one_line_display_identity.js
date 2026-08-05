/**
 * NEXUS ONE-LINE DISPLAY IDENTITY
 * ===============================
 *
 * Additive presentation layer for large office/VFM displays.
 *
 * - Adds an unmistakable project/building/diagram banner to field view.
 * - Adds a read-only field-status badge.
 * - Makes phase zones easier to identify in every presentation.
 * - Does not alter diagram data, equipment data, storage, routing, or editing.
 *
 * Optional URL parameters:
 *   project=CMH037
 *   projectName=Project%20Line%20Master
 *   site=NEXUS%20Data%20Center%20Campus
 *   building=A
 *   diagram=overall
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
    const projectId = params.get("project") || "PROJECT LINE MASTER";
    const projectName = params.get("projectName") ||
      (projectId === "sample-project" ? "PROJECT LINE MASTER" : titleCase(projectId));
    const siteName = params.get("site") || "NEXUS PROJECT ONE-LINE";
    const buildingId = params.get("building") || "A";
    const diagramId = params.get("diagram") || "overall";

    return {
      projectId: projectId === "sample-project" ? "" : projectId,
      projectName,
      siteName,
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
    banner.setAttribute("aria-label", "Project and building identification");

    banner.innerHTML = [
      '<div class="nx-display-brand"><span>NE<span class="nx-brand-x">X</span>US</span><small>DATA SCIENCE LLC</small></div>',
      '<div class="nx-display-project">',
      '<span class="nx-project-name">' + identity.projectName + "</span>",
      identity.projectId ? '<span class="nx-project-id">' + identity.projectId + "</span>" : "",
      '<small>' + identity.siteName + "</small>",
      "</div>",
      '<div class="nx-display-building">',
      '<strong>' + identity.buildingLabel + "</strong>",
      '<span>' + identity.diagramLabel + "</span>",
      "</div>",
      '<div class="nx-display-state"><strong>FIELD VIEW</strong><span>READ ONLY</span></div>'
    ].join("");

    root.insertBefore(banner, root.firstChild);
  }

  function phaseNumber(text) {
    const match = String(text || "").match(/PHASE\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  function decoratePhaseZones(root) {
    root.querySelectorAll(".zone").forEach(function decorateZone(group, index) {
      const text = group.querySelector("text");
      const rect = group.querySelector("rect");
      const label = text ? String(text.textContent || "").trim() : "";
      const number = phaseNumber(label);
      const color = number
        ? PHASE_COLORS[(number - 1) % PHASE_COLORS.length]
        : "#b8c2ce";

      group.dataset.phaseZone = number ? String(number) : "other";
      group.style.setProperty("--nx-phase-color", color);

      if (rect) {
        rect.style.setProperty("--nx-phase-color", color);
      }
      if (text) {
        text.style.setProperty("--nx-phase-color", color);
      }
    });
  }

  function install(root) {
    if (!root || root.dataset.displayIdentityInstalled === "1") return;
    root.dataset.displayIdentityInstalled = "1";

    addFieldBanner(root);
    decoratePhaseZones(root);

    let queued = false;
    const observer = new MutationObserver(function handleMutation() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function refreshIdentity() {
        queued = false;
        addFieldBanner(root);
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
