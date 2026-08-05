/**
 * NEXUS ONE-LINE UNPLACED EQUIPMENT POOL
 * =======================================
 * Engineering/setup page only.
 *
 * Purpose:
 * - Rename "Equipment Pool" to "Unplaced Equipment".
 * - Remove the Placed tab from the placement workflow.
 * - Keep the existing All and Unplaced controls operational.
 * - Never show equipment already placed on the active diagram.
 * - Preserve Mini Map, Properties, diagram tools, drag/drop, storage,
 *   equipment deletion, and all existing renderer behavior.
 *
 * IMPORTANT:
 * The core renderer still owns tab selection, search, phase filtering,
 * drag/drop, and list rendering. This adapter only removes the Placed tab
 * and hides placed cards after the core renderer has applied its own filter.
 */
(function initializeNexusUnplacedEquipmentPool() {
  "use strict";

  function isEditorPage() {
    const parameters = new URLSearchParams(window.location.search);
    return parameters.get("mode") !== "view";
  }

  function text(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isPlacedItem(item) {
    if (!item) return false;

    if (
      item.classList.contains("placed") ||
      item.dataset.placed === "true" ||
      item.getAttribute("aria-placed") === "true"
    ) {
      return true;
    }

    const statusText = text(item.textContent);
    return /(?:^|[\s•·-])placed(?:$|[\s•·-])/.test(statusText) &&
      !statusText.includes("unplaced");
  }

  function renamePanel(pool) {
    const header = pool.querySelector(".panel-head");
    if (!header) return;

    Array.from(header.childNodes).forEach(function replaceTextNode(node) {
      if (
        node.nodeType === Node.TEXT_NODE &&
        text(node.textContent).includes("equipment pool")
      ) {
        node.textContent = node.textContent.replace(
          /Equipment Pool/gi,
          "Unplaced Equipment"
        );
      }
    });

    const heading = header.querySelector(
      "h1,h2,h3,h4,strong,span:not(.count)"
    );

    if (heading && text(heading.textContent).includes("equipment pool")) {
      heading.textContent = heading.textContent.replace(
        /Equipment Pool/gi,
        "Unplaced Equipment"
      );
    }
  }

  function removePlacedTab(pool) {
    Array.from(pool.querySelectorAll(".pool-tab")).forEach(
      function updateTab(tab) {
        if (text(tab.textContent) === "placed") {
          tab.remove();
        }
      }
    );

    /*
     * Do not assign the active tab here.
     * The diagram engine already manages All/Unplaced click state and its
     * own filters. Forcing Unplaced active after each DOM mutation was the
     * reason the All tab appeared not to work.
     */
  }

  function filterPlacedItems(pool) {
    const items = Array.from(pool.querySelectorAll(".pool-item"));
    let visibleUnplacedCount = 0;

    items.forEach(function updateItem(item) {
      const placed = isPlacedItem(item);

      if (placed) {
        item.hidden = true;
        item.classList.add("nx-pool-item-hidden");
      } else {
        /* Respect the core renderer's filtering. Only remove the hidden
         * state that this adapter previously applied itself. */
        if (item.classList.contains("nx-pool-item-hidden")) {
          item.hidden = false;
          item.classList.remove("nx-pool-item-hidden");
        }

        if (!item.hidden) {
          visibleUnplacedCount += 1;
        }
      }
    });

    const count = pool.querySelector(".panel-head .count");
    if (count) {
      count.textContent = String(visibleUnplacedCount);
      count.setAttribute(
        "aria-label",
        visibleUnplacedCount + " visible unplaced equipment items"
      );
    }

    pool.dataset.unplacedCount = String(visibleUnplacedCount);
  }

  function install(pool) {
    if (!pool || pool.dataset.unplacedPoolInstalled === "1") return;

    pool.dataset.unplacedPoolInstalled = "1";
    pool.classList.add("nx-unplaced-equipment-pool");

    renamePanel(pool);
    removePlacedTab(pool);
    filterPlacedItems(pool);

    let queued = false;

    const refresh = function refreshPool() {
      if (queued) return;
      queued = true;

      window.requestAnimationFrame(function applyPoolRules() {
        queued = false;
        renamePanel(pool);
        removePlacedTab(pool);
        filterPlacedItems(pool);
      });
    };

    const observer = new MutationObserver(refresh);
    observer.observe(pool, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "class",
        "hidden",
        "data-placed",
        "aria-placed",
        "aria-selected"
      ]
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
