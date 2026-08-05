# NEXUS One-Line Field Readiness Integration

## Purpose

This document explains the additive readiness presentation implemented by:

- `one_line_readiness.js`
- `one_line_readiness.css`

The existing `one_line_diagram.js` engine remains the source of editing, layout, zoom, pan, connections, labels, zones, equipment navigation, and storage behavior.

## Presentation rules

### SME / Engineering setup

URL:

```text
one_line_diagram.html?mode=edit&project=<projectId>&building=<buildingId>&diagram=<diagramId>
```

Behavior:

- Existing white Bluebeam-style editor is preserved.
- Existing editing functions remain available.
- Authorized SME/engineering users receive an additional energization panel.
- Red is manually controlled here only.

### Desktop dashboard

URL:

```text
one_line_diagram.html?mode=view&embedded=1&project=<projectId>&building=<buildingId>&diagram=<diagramId>
```

Behavior:

- Traditional white background.
- Read-only.
- Intended for desktop dashboard panes.
- Equipment click-through remains available through `onOpenEquipment`.

### Field / QR viewer

URL:

```text
one_line_diagram.html?mode=view&viewer=1&project=<projectId>&building=<buildingId>&diagram=<diagramId>
```

Behavior:

- Dark background.
- Neon equipment outlines and connection lines.
- Read-only.
- Pan, fit, zoom, and mobile pinch navigation remain available.
- Equipment can be opened in NEXUS, but cannot be moved or edited.

`presentation=field` may also be used to explicitly request the field presentation.

## Readiness colors

| State | Meaning | Color |
|---|---|---|
| Gray | 0% or no progress | `#8b929b` |
| Blue | 1–25% | `#1f7dff` |
| Orange | 26–60% | `#ff7a00` |
| Yellow | 61–99% | `#ffe600` |
| Green | 100%, ready for energization | `#00f56a` |
| Red | Engineer/SME confirmed energized | `#ff2438` |

Red is not percentage-derived.

## Energized-state workflow

1. Open the setup page in `mode=edit`.
2. Select an equipment node.
3. Equipment must be at 100% completion.
4. Use **Mark as Energized** in the Engineer / SME Energization panel.
5. Confirm the action.
6. Add an optional note.
7. The module records:
   - equipment ID
   - project ID
   - building ID
   - authenticated user email/UID when available
   - timestamp
   - optional note
8. The field viewer displays the equipment in red.

Removing the energized state also requires the setup page and confirmation.

## Current localStorage contract

Energized records are currently stored separately from diagram layout:

```text
nexus-one-line-energized-v1:<projectId>:<buildingId>
```

Example record:

```javascript
{
  "SWGR-A-01": {
    energized: true,
    equipmentId: "SWGR-A-01",
    projectId: "Ohio",
    buildingId: "A",
    updatedAt: "2026-08-05T12:00:00.000Z",
    updatedBy: "engineer@example.com",
    note: "Energization authorization complete"
  }
}
```

This localStorage implementation is for development and same-device testing only.

## Firebase migration contract

When Firebase is enabled, energized state should move to an authenticated Firestore path such as:

```text
projects/{projectId}/buildings/{buildingId}/energization/{equipmentId}
```

Recommended document fields:

```javascript
{
  equipmentId,
  energized: true,
  updatedAt: serverTimestamp(),
  updatedBy: request.auth.uid,
  note
}
```

Firestore rules must enforce:

- authenticated project members may read;
- only approved SME/engineering/admin roles may write;
- field and dashboard viewers cannot change energized state;
- the UI is not the security boundary;
- every write uses a server timestamp and authenticated user ID.

The future Firebase adapter should expose an energized-state source with load/save/subscribe behavior matching the current additive module. Do not store credentials or permissions in QR URLs.

## Connection-line rule

In the field presentation, a connection uses the least-complete readiness state of the equipment at its two ends.

- A green-to-yellow connection is yellow.
- A green-to-green connection is green.
- A red-to-red connection is red.
- Red connected to equipment that is not energized does not make the entire connection red.

This keeps the diagram a visual representation of readiness for energization rather than a deviation or issue display.

## Equipment navigation

The one-line engine continues to own the click event and calls the configured callback.

Current standalone example:

```javascript
onOpenEquipment: function (equipmentOrId) {
  const equipmentId = typeof equipmentOrId === "string"
    ? equipmentOrId
    : equipmentOrId.equipmentId || equipmentOrId.id;

  window.open(
    "equipment.html?eq=" + encodeURIComponent(equipmentId),
    "_blank",
    "noopener,noreferrer"
  );
}
```

The dashboard may replace this callback with its own router. Equipment records remain owned by the NEXUS Equipment Registry; the one-line stores display/layout information only.

## Non-regression rule

The readiness feature is additive. Do not remove or replace these existing capabilities:

- equipment pool;
- node movement and resize;
- connections and bend points;
- labels and zones;
- undo/redo;
- automatic fit;
- phase filtering;
- mini-map;
- equipment click-through;
- QR viewer;
- dashboard embedding;
- localStorage layout persistence;
- Firebase adapter hooks.

## Testing checklist

- Edit mode remains white and fully editable.
- Embedded dashboard mode remains white and read-only.
- QR viewer is dark, neon, and read-only.
- Completion thresholds show the correct colors.
- Only 100% equipment can be marked energized.
- Energized state is red in the field viewer.
- Field viewer cannot expose energization controls.
- Removing energized state requires confirmation.
- Equipment click-through still opens the correct equipment record.
- Pan, zoom, fit, and pinch gestures continue to work.
- Two tabs on the same origin reflect local energized-state changes.
- Firebase rules are tested before cross-device production rollout.
