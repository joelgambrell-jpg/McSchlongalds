/**
 * NEXUS COMPLETION KEY CLEANUP
 * Engineering editor only.
 *
 * Keeps the movable completion key on the diagram, including when collapsed,
 * and removes the duplicate legacy Completion legend from the right sidebar.
 */
(function initializeNexusCompletionKeyCleanup() {
  "use strict";

  function isEditorPage() {
    return new URLSearchParams(window.location.search).get("mode") !== "view";
  }

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function removeSidebarCompletion(root) {
    const wrap = root.querySelector(".properties-wrap");
    if (!wrap) return;

    const headings = Array.from(
      wrap.querySelectorAll("h1,h2,h3,h4,h5,h6,legend,.section-title,.panel-title,strong")
    );

    headings.forEach(function inspectHeading(heading) {
      if (normalize(heading.textContent).toLowerCase() !== "completion") return;
      if (heading.closest(".nx-smart-health")) return;

      let section = heading;
      while (section.parentElement && section.parentElement !== wrap) {
        section = section.parentElement;
      }

      if (section !== wrap && !section.classList.contains("nx-smart-health")) {
        section.remove();
      }
    });

    Array.from(wrap.children).forEach(function inspectDirectChild(child) {
      if (child.classList.contains("nx-smart-health")) return;
      const text = normalize(child.textContent);
      if (
        /^Completion(?:\s|$)/i.test(text) &&
        /100% Complete/i.test(text) &&
        /No Data/i.test(text)
      ) {
        child.remove();
      }
    });
  }

  function keepDiagramKeyVisible(root) {
    const legend = root.querySelector(".canvas-viewport .nx-canvas-legend");
    if (!legend) return;

    legend.hidden = false;
    legend.removeAttribute("hidden");

    const close = legend.querySelector(".nx-legend-close");
    if (close) close.remove();

    const restore = root.querySelector(".nx-key-restore");
    if (restore) restore.remove();

    try {
      const parameters = new URLSearchParams(window.location.search);
      const key = [
        "nexus-one-line-key",
        parameters.get("project") || "sample-project",
        parameters.get("building") || "A",
        parameters.get("diagram") || "overall"
      ].join(":");
      const state = JSON.parse(localStorage.getItem(key) || "{}");
      state.hidden = false;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      /* localStorage can be unavailable in restricted browser modes. */
    }
  }

  function apply(root) {
    removeSidebarCompletion(root);
    keepDiagramKeyVisible(root);
  }

  function install(root) {
    if (!root || root.dataset.completionKeyCleanupInstalled === "1") return;
    root.dataset.completionKeyCleanupInstalled = "1";

    apply(root);

    let queued = false;
    const observer = new MutationObserver(function queueCleanup() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function runCleanup() {
        queued = false;
        apply(root);
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden"]
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
