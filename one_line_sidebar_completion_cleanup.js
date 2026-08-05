/**
 * NEXUS ONE-LINE SIDEBAR COMPLETION CLEANUP
 * ==========================================
 * Engineering editor only.
 *
 * The core diagram renderer owns a legacy Completion legend in the right
 * sidebar. The active completion key now lives on the diagram canvas, so this
 * module removes only that duplicate sidebar legend whenever the renderer
 * creates or redraws it.
 *
 * It does not modify the Mini Map, Project Summary, Selected Object,
 * Properties controls, or the floating canvas Completion Key.
 */
(function initializeSidebarCompletionCleanup() {
  "use strict";

  function isEditorPage() {
    return new URLSearchParams(window.location.search).get("mode") !== "view";
  }

  function normalizedText(element) {
    return String((element && element.textContent) || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isLegacyCompletionLegend(element) {
    if (!element || element.classList.contains("nx-canvas-legend")) return false;
    if (element.closest && element.closest(".nx-canvas-legend")) return false;

    const text = normalizedText(element);
    return (
      /^Completion(?:\s|$)/i.test(text) &&
      /100% Complete/i.test(text) &&
      /51[–-]99% Complete/i.test(text) &&
      /1[–-]50% Complete/i.test(text) &&
      /0% Complete/i.test(text) &&
      /No Data/i.test(text)
    );
  }

  function findRemovalTarget(legend) {
    let current = legend;

    while (current && current.parentElement) {
      const parent = current.parentElement;
      const parentText = normalizedText(parent);

      /*
       * Stop before reaching a container that also owns Project Summary,
       * Mini Map, Selected Object, or unrelated Properties content.
       */
      if (
        /Project Summary/i.test(parentText) ||
        /Mini Map/i.test(parentText) ||
        /Selected Object/i.test(parentText) ||
        /Building Overview/i.test(parentText)
      ) {
        break;
      }

      if (isLegacyCompletionLegend(parent)) {
        current = parent;
        continue;
      }

      break;
    }

    return current;
  }

  function removeDuplicateLegend(root) {
    if (!root) return;

    const candidates = Array.from(
      root.querySelectorAll("section, article, fieldset, div")
    );

    candidates.forEach(function inspect(candidate) {
      if (!candidate.isConnected || !isLegacyCompletionLegend(candidate)) return;

      const target = findRemovalTarget(candidate);
      if (target && target.isConnected) {
        target.remove();
      }
    });
  }

  function install(root) {
    if (!root || root.dataset.sidebarCompletionCleanup === "1") return;
    root.dataset.sidebarCompletionCleanup = "1";

    removeDuplicateLegend(root);

    let queued = false;
    const observer = new MutationObserver(function handleSidebarRedraw() {
      if (queued) return;
      queued = true;

      window.requestAnimationFrame(function cleanAfterRedraw() {
        queued = false;
        removeDuplicateLegend(root);
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true
    });
  }

  function scan() {
    if (!isEditorPage()) return;
    document.querySelectorAll(".nexus-one-line").forEach(install);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
