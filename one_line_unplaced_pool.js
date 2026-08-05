/**
 * NEXUS ONE-LINE EQUIPMENT POOL SIMPLIFICATION
 * =============================================
 * Engineering/setup page only.
 *
 * Keeps the core renderer's original, proven tab behavior:
 * - All shows every equipment record, including placed equipment.
 * - Unplaced shows only equipment not yet placed on the active diagram.
 *
 * This additive adapter only:
 * - Renames "Equipment Pool" to "Unplaced Equipment".
 * - Removes the separate Placed tab.
 *
 * It deliberately does not hide pool items, change counts, force the active
 * tab, or replace the core renderer's filtering. Mini Map, Properties,
 * drag/drop, selection, storage, and diagram behavior remain untouched.
 */
(function initializeNexusEquipmentPoolSimplification() {
  "use strict";

  function isEditorPage() {
    const parameters = new URLSearchParams(window.location.search);
    return parameters.get("mode") !== "view";
  }

  function normalizedText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function renamePanel(pool) {
    const header = pool.querySelector(".panel-head");
    if (!header) return;

    Array.from(header.childNodes).forEach(function renameTextNode(node) {
      if (
        node.nodeType === Node.TEXT_NODE &&
        /equipment pool/i.test(String(node.textContent || ""))
      ) {
        node.textContent = String(node.textContent).replace(
          /Equipment Pool/gi,
          "Unplaced Equipment"
        );
      }
    });

    const heading = header.querySelector("h1,h2,h3,h4,strong,span:not(.count)");
    if (heading && /equipment pool/i.test(String(heading.textContent || ""))) {
      heading.textContent = String(heading.textContent).replace(
        /Equipment Pool/gi,
        "Unplaced Equipment"
      );
    }
  }

  function removePlacedTab(pool) {
    Array.from(pool.querySelectorAll(".pool-tab")).forEach(
      function inspectTab(tab) {
        if (normalizedText(tab.textContent) === "placed") {
          tab.remove();
        }
      }
    );
  }

  function install(pool) {
    if (!pool || pool.dataset.poolSimplificationInstalled === "1") return;

    pool.dataset.poolSimplificationInstalled = "1";
    pool.classList.add("nx-unplaced-equipment-pool");

    renamePanel(pool);
    removePlacedTab(pool);

    let queued = false;
    const refresh = function refreshPresentationOnly() {
      if (queued) return;
      queued = true;

      window.requestAnimationFrame(function applyPresentationOnly() {
        queued = false;
        renamePanel(pool);
        removePlacedTab(pool);
      });
    };

    const observer = new MutationObserver(refresh);
    observer.observe(pool, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function scan() {
    if (!isEditorPage()) return;
    document.querySelectorAll(".pool").forEach(install);
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
