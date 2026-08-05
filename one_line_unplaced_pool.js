/**
 * NEXUS ONE-LINE EQUIPMENT POOL SIMPLIFICATION
 * =============================================
 * Engineering/setup page only.
 *
 * Required behavior:
 * - All is the permanent material/equipment reference list.
 * - Unplaced is a temporary work queue.
 * - Placed remains removed as a separate tab.
 * - When no unplaced equipment remains, the Unplaced tab disappears and
 *   the pool automatically returns to All instead of hiding the whole panel.
 * - If equipment is removed from the diagram or new equipment is added,
 *   Unplaced automatically reappears.
 *
 * Mini Map, Properties, drag/drop, storage, and diagram behavior remain
 * untouched. The core renderer still owns all filtering and tab actions.
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
    if (heading && /equipment pool|unplaced equipment/i.test(String(heading.textContent || ""))) {
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

  function countUnplacedItems(pool) {
    return Array.from(pool.querySelectorAll(".pool-item")).filter(
      function countItem(item) {
        return !item.classList.contains("placed");
      }
    ).length;
  }

  function updateUnplacedAvailability(pool) {
    const allTab = findTab(pool, "all");
    const unplacedTab = findTab(pool, "unplaced");
    if (!allTab || !unplacedTab) return;

    const unplacedCount = countUnplacedItems(pool);
    const unplacedIsActive = unplacedTab.classList.contains("active") ||
      unplacedTab.getAttribute("aria-selected") === "true";

    if (unplacedCount === 0) {
      unplacedTab.hidden = true;
      unplacedTab.setAttribute("aria-hidden", "true");

      if (unplacedIsActive) {
        /*
         * Use the original All-tab click handler so the renderer updates its
         * own instance.poolTab state and rebuilds the full reference list.
         */
        allTab.click();
      }
    } else {
      unplacedTab.hidden = false;
      unplacedTab.removeAttribute("aria-hidden");
    }
  }

  function keepReferencePanelAvailable(pool) {
    const workspace = pool.closest(".workspace");
    const allTab = findTab(pool, "all");

    if (
      workspace &&
      workspace.classList.contains("pool-hidden") &&
      allTab
    ) {
      const unplacedTab = findTab(pool, "unplaced");
      const unplacedIsActive = unplacedTab &&
        (unplacedTab.classList.contains("active") ||
         unplacedTab.getAttribute("aria-selected") === "true");

      if (unplacedIsActive && countUnplacedItems(pool) === 0) {
        allTab.click();
      }
    }
  }

  function refreshPoolPresentation(pool) {
    renamePanel(pool);
    removePlacedTab(pool);
    updateUnplacedAvailability(pool);
    keepReferencePanelAvailable(pool);
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
      attributeFilter: ["class", "aria-selected"]
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
