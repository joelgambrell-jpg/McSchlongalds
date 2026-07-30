# NEXUS One-Line Integration Notes

## Purpose

The one-line system uses one rendering engine in two modes:

- `edit`: engineering workspace with placement and layout controls.
- `view`: read-only project visual for the dashboard and phase-door QR codes.

The dashboard remains the source of truth for equipment records. The diagram storage contains layout information only.

## Files

- `one_line_diagram.html` — standalone editor or viewer, controlled by URL parameters.
- `one_line_diagram.js` — shared rendering and editing engine.
- `one_line_diagram.css` — shared editor and viewer styles.
- `one_line_storage.js` — current localStorage adapter and storage subscription contract.
- `one_line_qr.html` — printable viewer-only QR sign generator.
- `one_line_firebase_adapter.template.js` — documented Firebase/Firestore adapter template; intentionally not loaded during localStorage development.

## URL parameters

### Engineering workspace

```text
one_line_diagram.html?mode=edit&project=Ohio&building=A&diagram=overall
```

### Viewer-only phase diagram

```text
one_line_diagram.html?mode=view&viewer=1&project=Ohio&building=A&diagram=phase-2
```

### Embedded dashboard viewer

```text
one_line_diagram.html?mode=view&embedded=1&project=Ohio&building=A&diagram=overall
```

`viewer=1` removes the Open Workspace button. It does not bypass authentication.

## Recommended dashboard integration

Direct mounting is preferred over an iframe when the dashboard already loads the one-line CSS and JavaScript:

```html
<div id="oneLineDashboardPane"></div>
```

```javascript
const oneLineController = NEXUS.OneLine.mount({
  container: "#oneLineDashboardPane",
  mode: "view",
  embedded: true,
  projectId: activeProjectId,
  buildingId: activeBuildingId,
  diagramId: "overall",
  equipment: dashboardEquipment,
  onOpenEquipment: function (equipmentId) {
    openDashboardEquipment(equipmentId);
  },
  onOpenWorkspace: function () {
    window.location.href =
      "one_line_diagram.html?mode=edit&project=" +
      encodeURIComponent(activeProjectId) +
      "&building=" + encodeURIComponent(activeBuildingId) +
      "&diagram=overall";
  }
});
```

When dashboard equipment changes:

```javascript
oneLineController.setEquipment(updatedDashboardEquipment);
```

The controller also exposes:

```javascript
oneLineController.getViewerUrl();
oneLineController.openViewerQr();
oneLineController.fit();
oneLineController.refresh();
```

## Iframe integration

Use this only when CSS or JavaScript isolation is necessary:

```html
<iframe
  src="one_line_diagram.html?mode=view&embedded=1&project=Ohio&building=A&diagram=overall"
  title="Live project one-line diagram"
  style="width:100%;height:700px;border:0"
></iframe>
```

The iframe page still requires an equipment data source. Do not duplicate dashboard equipment into diagram layout storage.

## Equipment data source contract

The standalone viewer checks for either:

```javascript
window.NEXUS_DASHBOARD_EQUIPMENT = dashboardEquipment;
```

or:

```javascript
window.NexusOneLineDataSource = {
  getEquipment: async function (context) {
    // Return Array<equipment> from Firebase/dashboard storage.
  },

  subscribeEquipment: function (context, callback) {
    // Call callback(updatedEquipmentArray) on every data change.
    // Return an unsubscribe function.
  }
};
```

The expected context is:

```javascript
{
  projectId,
  buildingId,
  diagramId
}
```

## Diagram storage adapter contract

The current local adapter supports:

```javascript
load(context)
save(context, layout)
subscribe(context, callback)
```

For production cross-device real-time operation, the Firebase adapter must implement:

```javascript
window.NexusOneLineStorage = {
  load: function (context) {
    // Return the most recent layout or null.
  },

  save: function (context, layout) {
    // Save layout data only.
  },

  subscribe: function (context, callback) {
    // Call callback(updatedLayout) whenever Firebase changes.
    // Return an unsubscribe function.
  }
};
```

`localStorage` only synchronizes other tabs on the same browser and device. It cannot provide real-time updates to phones scanning a QR code. Firebase is required for that production behavior.

## QR security

The QR code contains only a viewer URL with project, building, and diagram identifiers. It must never contain:

- Passwords
- Firebase credentials
- Authentication tokens
- Editing permissions

The host NEXUS application must enforce normal system authentication before displaying the viewer.

## Phase-door QR workflow

1. Open the desired phase diagram in the editor.
2. Select **Viewer QR**.
3. Print the generated door sign.
4. Mount the sign at the phase entrance.
5. Authorized users scan the QR code and receive the current read-only diagram.
6. Firebase layout and equipment subscriptions update the viewer without granting edit access.

## Data ownership rule

Dashboard/Firebase equipment records own:

- Equipment ID and name
- Type
- Building
- Phase
- POD/ROMP
- Breakers and circuits
- Source and destination data
- Completion and validation status

Diagram layout owns:

- Node positions and sizes
- Shape overrides
- Port placement overrides
- Connections and manual bends
- Labels and zones
- Collapse state

Do not store full duplicate equipment records inside the diagram layout.


## Current development backend: localStorage

The project must remain on `localStorage` until the core one-line editor, breaker/port model, dashboard viewer, and QR workflow are complete.

Current adapter:

```javascript
window.NexusOneLineStorage
```

Current methods:

```javascript
load(context)
save(context, layout)
subscribe(context, callback)
clear(context)
list()
getBackendInfo()
```

The local adapter is intentionally isolated in `one_line_storage.js`. Do not place Firebase calls inside the diagram renderer.

### Local real-time limitation

The browser `storage` event updates a viewer only when another tab on the same origin and device changes the layout. It does not synchronize different phones, tablets, or computers. During local development, a phase-door QR viewer can display the published page but will only see data available to that browser. Cross-device live updates begin when Firebase is enabled.

## Firebase migration hook

A commented script location has been added to `one_line_diagram.html`. The Firebase adapter must load in this order:

```html
<script src="one_line_storage.js"></script>

<script>
  window.NEXUS_ONE_LINE_USE_FIREBASE = true;
</script>
<script src="one_line_firebase_adapter.js"></script>

<script src="one_line_diagram.js"></script>
```

The local adapter loads first as a safe fallback. The enabled Firebase adapter then replaces the same public interfaces before the renderer mounts.

The included `one_line_firebase_adapter.template.js` contains:

- Proposed Firestore paths
- Layout load/save/subscription methods
- Equipment load/subscription methods
- Authentication metadata hook
- Separation between equipment records and drawing layout
- Error handling and handoff comments

It is intentionally named `.template.js` so GitHub Pages does not accidentally enable it.

## Required engine change before enabling Firebase

The active local adapter is synchronous. Firestore reads and writes are asynchronous. Before enabling the Firebase adapter, an engineer must update the following internal methods in `one_line_diagram.js` to support returned Promises:

```javascript
storageLoad(instance)
storageSave(instance, layout)
loadDiagram(instance, diagramId)
saveDiagramInstance(instance, manual)
```

Recommended approach:

1. Convert `storageLoad` and `storageSave` to `async`.
2. Await the initial layout before the first render.
3. Preserve `subscribe(context, callback)` for real-time updates after the initial load.
4. Show a loading state while the first Firestore document is retrieved.
5. Prevent duplicate saves while a previous write is pending.
6. Retain localStorage as an offline fallback only after conflict behavior is defined.

Do not simply enable the template while the engine assumes synchronous reads. The template contains a warning for this exact reason.

## Proposed Firestore structure

Diagram layout:

```text
projects/{projectId}/buildings/{buildingId}/oneLineDiagrams/{diagramId}
```

Suggested document fields:

```javascript
{
  projectId,
  buildingId,
  diagramId,
  schemaVersion: 1,
  layout: {
    nodes: [],
    zones: [],
    labels: [],
    connections: [],
    collapsed: false
  },
  updatedAt,
  updatedBy
}
```

Equipment remains in the canonical dashboard registry, proposed as:

```text
projects/{projectId}/equipment/{equipmentId}
```

The adapter must be changed to match the actual NEXUS Firebase schema rather than creating a second equipment database.

## Firebase security requirements

Before field deployment, Firestore rules must enforce:

- Signed-in users may read only projects they are assigned to.
- Viewer users may read diagram layouts and equipment records but may not write them.
- Engineer/authorized roles may update diagram layouts.
- QR parameters never grant access by themselves.
- Equipment records cannot be modified through the one-line viewer.
- Every write records the authenticated user and server timestamp.

The UI's `viewerOnly` flag is a presentation restriction, not a security boundary. Firebase rules and NEXUS authentication must enforce actual permissions.

## Local-to-Firebase migration checklist

1. Freeze the local layout schema version.
2. Confirm the canonical Firebase equipment collection and field names.
3. Implement the async engine changes listed above.
4. Rename/copy the adapter template to `one_line_firebase_adapter.js`.
5. Update its Firestore paths to the canonical NEXUS schema.
6. Add and test Firestore security rules.
7. Build a one-time migration utility that reads each local layout and writes it to the matching Firebase document.
8. Test editor-to-dashboard real-time updates on two different devices.
9. Test phase-door QR access with viewer permissions only.
10. Keep the local adapter available for rollback until production acceptance.
