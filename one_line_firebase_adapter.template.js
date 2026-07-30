/**
 * ================================================================
 * NEXUS ONE-LINE FIREBASE ADAPTER TEMPLATE
 * FILE: one_line_firebase_adapter.template.js
 * ================================================================
 *
 * STATUS
 * ------
 * This file is intentionally NOT loaded by one_line_diagram.html.
 * The active project continues to use one_line_storage.js and
 * localStorage until the NEXUS Firebase migration is approved.
 *
 * FUTURE ENABLEMENT
 * -----------------
 * 1. Confirm the host NEXUS page has initialized Firebase and the
 *    signed-in user has access to the active project.
 * 2. Copy or rename this file to one_line_firebase_adapter.js.
 * 3. Set window.NEXUS_ONE_LINE_USE_FIREBASE = true before loading it.
 * 4. Load this file AFTER Firebase initialization and AFTER
 *    one_line_storage.js, but BEFORE one_line_diagram.js.
 *
 * This adapter deliberately replaces only the public interfaces:
 *
 *   window.NexusOneLineStorage
 *   window.NexusOneLineDataSource
 *
 * The diagram renderer and dashboard integration do not need to be
 * rebuilt when storage moves from localStorage to Firebase.
 *
 * FIREBASE API EXPECTATION
 * ------------------------
 * This template uses the Firebase Web SDK compatibility API:
 *
 *   window.firebase.firestore()
 *
 * If the main NEXUS application uses the modular SDK, retain the
 * public adapter methods below and replace only the internal Firebase
 * calls with getDoc, setDoc, onSnapshot, collection, query, and where.
 *
 * DATA OWNERSHIP
 * --------------
 * Diagram documents store layout only. Equipment documents remain
 * owned by the dashboard/project equipment registry.
 */
(function initializeNexusOneLineFirebaseAdapter() {
  "use strict";

  if (window.NEXUS_ONE_LINE_USE_FIREBASE !== true) {
    console.info(
      "[NEXUS One-Line] Firebase adapter is disabled; localStorage remains active."
    );
    return;
  }

  if (!window.firebase || typeof window.firebase.firestore !== "function") {
    console.error(
      "[NEXUS One-Line] Firebase adapter requested, but Firebase Firestore is not initialized."
    );
    return;
  }

  const db = window.firebase.firestore();

  /**
   * Adjust these collection names only if the primary NEXUS database
   * uses a different project hierarchy. Keep all path construction in
   * this one function so future schema changes stay isolated.
   *
   * Proposed layout document path:
   * projects/{projectId}/buildings/{buildingId}/oneLineDiagrams/{diagramId}
   */
  function getLayoutDocument(context) {
    const safe = normalizeContext(context);

    return db
      .collection("projects")
      .doc(safe.projectId)
      .collection("buildings")
      .doc(safe.buildingId)
      .collection("oneLineDiagrams")
      .doc(safe.diagramId);
  }

  /**
   * Proposed equipment collection path:
   * projects/{projectId}/equipment
   *
   * The building filter assumes each equipment record contains a
   * buildingId or building field. Change this query to match the
   * canonical NEXUS equipment registry when Firebase is connected.
   */
  function getEquipmentCollection(context) {
    const safe = normalizeContext(context);

    return db
      .collection("projects")
      .doc(safe.projectId)
      .collection("equipment");
  }

  function normalizeContext(context) {
    const supplied = context || {};

    return {
      projectId: String(supplied.projectId || "default-project"),
      buildingId: String(supplied.buildingId || "default-building"),
      diagramId: String(supplied.diagramId || "overall")
    };
  }

  function normalizeEquipmentSnapshot(snapshot, context) {
    const safe = normalizeContext(context);

    return snapshot.docs
      .map(function mapEquipmentDocument(documentSnapshot) {
        return {
          equipmentId: documentSnapshot.id,
          ...documentSnapshot.data()
        };
      })
      .filter(function filterBuilding(item) {
        const equipmentBuilding =
          item.buildingId !== undefined
            ? item.buildingId
            : item.building;

        return (
          equipmentBuilding === undefined ||
          String(equipmentBuilding) === safe.buildingId
        );
      });
  }

  /**
   * FIREBASE LAYOUT STORAGE CONTRACT
   * --------------------------------
   * load(context) returns Promise<layout|null>.
   * save(context, layout) returns Promise<void>.
   * subscribe(context, callback) returns unsubscribe().
   *
   * NOTE:
   * The current one-line engine supports synchronous localStorage.
   * Before enabling this async Firebase adapter, update storageLoad()
   * and storageSave() in one_line_diagram.js to await Promises, or
   * preload the first layout before mount and rely on subscribe().
   * This note is intentional so an engineer does not silently enable
   * an asynchronous adapter against synchronous calls.
   */
  const firebaseLayoutStorage = {
    async load(context) {
      const snapshot = await getLayoutDocument(context).get();

      if (!snapshot.exists) {
        return null;
      }

      const data = snapshot.data() || {};
      return data.layout || null;
    },

    async save(context, layout) {
      const safe = normalizeContext(context);

      await getLayoutDocument(safe).set(
        {
          projectId: safe.projectId,
          buildingId: safe.buildingId,
          diagramId: safe.diagramId,
          layout,
          schemaVersion: 1,
          updatedAt:
            window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy:
            window.firebase.auth && window.firebase.auth().currentUser
              ? window.firebase.auth().currentUser.uid
              : null
        },
        { merge: true }
      );
    },

    subscribe(context, callback) {
      return getLayoutDocument(context).onSnapshot(
        function handleLayoutSnapshot(snapshot) {
          if (!snapshot.exists) {
            callback(null);
            return;
          }

          const data = snapshot.data() || {};
          callback(data.layout || null);
        },
        function handleLayoutSubscriptionError(error) {
          console.error(
            "[NEXUS One-Line] Firebase layout subscription failed:",
            error
          );
        }
      );
    }
  };

  /**
   * FIREBASE EQUIPMENT DATA CONTRACT
   * --------------------------------
   * Equipment remains owned by the NEXUS dashboard registry.
   * The one-line viewer receives a normalized array and never writes
   * full equipment records into diagram layout storage.
   */
  const firebaseEquipmentDataSource = {
    async getEquipment(context) {
      const snapshot = await getEquipmentCollection(context).get();
      return normalizeEquipmentSnapshot(snapshot, context);
    },

    subscribeEquipment(context, callback) {
      return getEquipmentCollection(context).onSnapshot(
        function handleEquipmentSnapshot(snapshot) {
          callback(normalizeEquipmentSnapshot(snapshot, context));
        },
        function handleEquipmentSubscriptionError(error) {
          console.error(
            "[NEXUS One-Line] Firebase equipment subscription failed:",
            error
          );
        }
      );
    }
  };

  window.NexusOneLineStorage = firebaseLayoutStorage;
  window.NexusOneLineDataSource = firebaseEquipmentDataSource;

  console.info(
    "[NEXUS One-Line] Firebase adapter enabled."
  );
})();
