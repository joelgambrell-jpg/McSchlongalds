/**
 * NEXUS ONE-LINE EQUIPMENT POOL SIMPLIFICATION
 * =============================================
 * Engineering/setup page only.
 *
 * Required behavior:
 * - All is the permanent material/equipment reference list.
 * - Unplaced is the placement work queue.
 * - Placed remains removed as a separate tab.
 * - Selecting an empty Unplaced view must NEVER collapse the left panel or
 *   allow the diagram canvas to slide underneath it.
 * - All and Unplaced continue using the core renderer's original filtering.
 *
 * Mini Map, Properties, drag/drop, storage, and diagram behavior remain
 * untouched.
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

  function findTab(pool, label) {
    return Array.from(pool.querySelectorAll(".pool-tab")).find(
      function matchTab(tab) {
        return normalizedText(tab.textContent) === label;
      }
    ) || null;
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
          "Equipment Reference"
        );
      }
    });

    const heading = header.querySelector("h1,h2,h3,h4,strong,span:not(.count)");
    if (
      heading &&
      /equipment pool|unplaced equipment/i.test(String(heading.textContent || ""))
    ) {
      heading.textContent = String(heading.textContent).replace(
        /Equipment Pool|Unplaced Equipment/gi,
        "Equipment Reference"
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

  function unplacedViewIsActive(pool) {
    const tab = findTab(pool, "unplaced");
    return Boolean(
      tab &&
      (
        tab.classList.contains("active") ||
        tab.getAttribute("aria-selected") === "true"
      )
    );
  }

  function unplacedViewIsEmpty(pool) {
    if (!unplacedViewIsActive(pool)) return false;

    const visibleItems = Array.from(pool.querySelectorAll(".pool-item")).filter(
      function visibleItem(item) {
        return !item.hidden && getComputedStyle(item).display !== "none";
      }
    );

    return visibleItems.length === 0;
  }

  function keepEmptyUnplacedPanelOpen(pool) {
    if (!unplacedViewIsEmpty(pool)) return;

    const workspace = pool.closest(".workspace");
    if (!workspace) return;

    /*
     * The core renderer historically added .pool-hidden when the Unplaced
     * list reached zero. That caused the canvas to expand underneath the
     * panel. Remove only that automatic collapsed state while the empty
     * Unplaced tab is active. The normal manual hide button remains usable
     * from other pool views.
     */
    workspace.classList.remove("pool-hidden");
    pool.hidden = false;
    pool.removeAttribute("aria-hidden");
    pool.style.removeProperty("display");

    const empty = pool.querySelector(".pool-empty");
    if (empty) {
      empty.textContent = "All equipment has been placed.";
    }
  }

  function refreshPoolPresentation(pool) {
    renamePanel(pool);
    removePlacedTab(pool);
    keepEmptyUnplacedPanelOpen(pool);
  }

  function install(pool) {
    if (!pool || pool.dataset.poolSimplificationInstalled === "1") return;

    pool.dataset.poolSimplificationInstalled = "1";
    pool.classList.add("nx-unplaced-equipment-pool");

    refreshPoolPresentation(pool);

    let queued = false;
    const refresh = function queueRefresh() {
      if (queued) return;
      queued = true;

      window.requestAnimationFrame(function applyPresentationRules() {
        queued = false;
        refreshPoolPresentation(pool);
      });
    };

    const observer = new MutationObserver(refresh);
    observer.observe(pool, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "aria-selected", "hidden", "style"]
    });

    const workspace = pool.closest(".workspace");
    if (workspace) {
      const workspaceObserver = new MutationObserver(refresh);
      workspaceObserver.observe(workspace, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }
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
