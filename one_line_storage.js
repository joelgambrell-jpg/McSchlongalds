window.NexusOneLineStorage = (() => {
  "use strict";

  const PREFIX = "nexus-one-line-v4:";

  /**
   * Build a storage key.
   *
   * Supported:
   *
   * load("overall")
   *
   * load({
   *   projectId:"Ohio",
   *   buildingId:"A",
   *   diagramId:"overall"
   * })
   */
  function buildKey(input) {

    // Legacy support
    if (typeof input === "string") {
      return PREFIX + input;
    }

    input = input || {};

    const project =
      input.projectId || "default-project";

    const building =
      input.buildingId || "default-building";

    const diagram =
      input.diagramId || "overall";

    return `${PREFIX}${project}:${building}:${diagram}`;
  }

  function load(input) {
    try {

      const raw = localStorage.getItem(buildKey(input));

      if (!raw) return null;

      return JSON.parse(raw);

    } catch (err) {

      console.warn(
        "Diagram load failed",
        err
      );

      return null;
    }
  }

  function save(input, state) {

    // Legacy compatibility:
    //
    // save("overall",state)

    if (typeof input === "string") {

      localStorage.setItem(
        buildKey(input),
        JSON.stringify({
          ...state,
          updatedAt: new Date().toISOString()
        })
      );

      return true;
    }

    try {

      localStorage.setItem(
        buildKey(input),
        JSON.stringify({
          ...state,
          updatedAt: new Date().toISOString()
        })
      );

      return true;

    } catch (err) {

      console.warn(
        "Diagram save failed",
        err
      );

      return false;
    }
  }

  function clear(input) {
    localStorage.removeItem(buildKey(input));
  }

  function list() {

    const results = [];

    for (let i = 0; i < localStorage.length; i++) {

      const key = localStorage.key(i);

      if (
        key &&
        key.startsWith(PREFIX)
      ) {

        results.push(
          key.substring(PREFIX.length)
        );

      }

    }

    return results.sort();

  }

  return {

    load,
    save,
    clear,
    list

  };

})();
