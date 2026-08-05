/**
 * NEXUS ONE-LINE UNPLACED EQUIPMENT POOL
 * =======================================
 * Engineering/setup page only.
 *
 * Purpose:
 * - Rename "Equipment Pool" to "Unplaced Equipment".
 * - Remove the Placed tab from the placement workflow.
 * - Keep only All and Unplaced controls.
 * - Never show equipment already placed on the active diagram.
 * - Preserve Mini Map, Properties, diagram tools, drag/drop, storage,
 *   equipment deletion, and all existing renderer behavior.
 *
 * This is an additive DOM adapter so the core renderer remains unchanged.
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

    const candidates = Array.from(header.childNodes).filter(function findTextNode(node) {
      return node.nodeType === Node.TEXT_NODE && text(node.textContent).includes("equipment pool");
    });

    candidates.forEach(function replaceText(node) {
      node.textContent = node.textContent.replace(/Equipment Pool/gi, "Unplaced Equipment");
    });

    const heading = header.querySelector("h1,h2,h3,h4,strong,span:not(.count)");
    if (heading && text(heading.textContent).includes("equipment pool")) {
      heading.textContent = heading.textContent.replace(/Equipment Pool/gi, "Unplaced Equipment");
    }
  }

  function simplifyTabs(pool) {
    const tabs = Array.from(pool.querySelectorAll(".pool-tab"));

    tabs.forEach(function updateTab(tab) {
      const label = text(tab.textContent);

      if (label === "placed") {
        tab.remove();
        return;
      }

      if (label === "all" || label === "unplaced") {
        tab.hidden = false;
        tab.removeAttribute("aria-hidden");

        tab.addEventListener("click", function forceUnplacedView() {
          window.requestAnimationFrame(function refreshAfterTabClick() {
            filterPlacedItems(pool);
          });
        });
      }
    });

    const remaining = Array.from(pool.querySelectorAll(".pool-tab"));
    if (remaining.length) {
      const active = remaining.find(function findUnplaced(tab) {
        return text(tab.textContent) === "unplaced";
      }) || remaining[0];

      remaining.forEach(function setActive(tab) {
        tab.classList.toggle("active", tab === active);
        tab.setAttribute("aria-selected", tab === active ? "true" : "false");
      });
    }
  }

  function filterPlacedItems(pool) {
    const items = Array.from(pool.querySelectorAll(".pool-item"));
    let unplacedCount = 0;

    items.forEach(function updateItem(item) {
      const placed = isPlacedItem(item);
      item.hidden = placed;
      item.classList.toggle("nx-pool-item-hidden", placed);

      if (!placed) {
        unplacedCount += 1;
      }
    });

    const count = pool.querySelector(".panel-head .count");
    if (count) {
      count.textContent = String(unplacedCount);
      count.setAttribute("aria-label", unplacedCount + " unplaced equipment items");
    }

    pool.dataset.unplacedCount = String(unplacedCount);
  }

  function install(pool) {
    if (!pool || pool.dataset.unplacedPoolInstalled === "1") return;
    pool.dataset.unplacedPoolInstalled = "1";
    pool.classList.add("nx-unplaced-equipment-pool");

    renamePanel(pool);
    simplifyTabs(pool);
    filterPlacedItems(pool);

    let queued = false;
    const refresh = function refreshPool() {
      if (queued) return;
      queued = true;

      window.requestAnimationFrame(function applyPoolRules() {
        queued = false;
        renamePanel(pool);
        simplifyTabs(pool);
        filterPlacedItems(pool);
      });
    };

    const observer = new MutationObserver(refresh);
    observer.observe(pool, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "data-placed", "aria-placed"]
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
