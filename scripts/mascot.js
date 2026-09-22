// Cursor tracking for the 3x3 direction sheets. Exposes window.Mascot.
(() => {
  // Row-major cell indices on the 3x3 sheet, clockwise from the right,
  // matching atan2 with y pointing down.
  const CLOCKWISE = [5, 8, 7, 6, 3, 0, 1, 2];
  const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
  const CENTER = 4;

  const position = (index) =>
    `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`;
  const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const sectorAt = (dx, dy) =>
    (Math.round(Math.atan2(dy, dx) / SECTOR) + CLOCKWISE.length) %
    CLOCKWISE.length;

  // No hoverable pointer means no cursor to follow.
  const supported = () =>
    matchMedia("(hover: hover) and (pointer: fine)").matches;

  const aimers = [];
  let pointer = null;
  let queued = false;

  const flush = () => {
    queued = false;
    if (!pointer) return;
    for (const aim of aimers) aim(pointer);
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(flush);
  };

  const subscribe = (aim) => {
    if (aimers.push(aim) > 1) return;
    addEventListener(
      "pointermove",
      (event) => {
        pointer = { x: event.clientX, y: event.clientY };
        schedule();
      },
      { passive: true },
    );
  };

  const follow = (node, { deadZone = 70, hysteresis = 0.12 } = {}) => {
    if (!node || !supported()) return;

    let sector = -1;

    subscribe(({ x, y }) => {
      const box = node.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);

      if (Math.hypot(dx, dy) < deadZone) {
        sector = -1;
        node.style.backgroundPosition = position(CENTER);
        return;
      }

      // Hold the current sector until the pointer is well past its edge.
      const angle = Math.atan2(dy, dx);
      if (
        sector !== -1 &&
        Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + hysteresis
      ) {
        return;
      }

      sector = sectorAt(dx, dy);
      node.style.backgroundPosition = position(CLOCKWISE[sector]);
    });

    addEventListener("scroll", schedule, { passive: true });
  };

  const wall = (
    container,
    { cellRatio, tileClass = "mascot", defaultTile = 150 } = {},
  ) => {
    if (!container || !supported()) return;

    // ?cols=8&rows=5 pins the grid; ?tile=120 only sets the width and fills the viewport.
    const params = new URLSearchParams(location.search);
    const asNumber = (key) => {
      const value = Number(params.get(key));
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    };

    let tiles = [];
    let centers = [];
    let deadZone = 0;

    const build = () => {
      const fixedCols = asNumber("cols");
      const fixedRows = asNumber("rows");
      const tileHint = asNumber("tile") || defaultTile;

      const cols = fixedCols || Math.max(1, Math.ceil(innerWidth / tileHint));
      const width = fixedCols ? tileHint : innerWidth / cols;
      const height = width * cellRatio;
      const rows = fixedRows || Math.max(1, Math.ceil(innerHeight / height));

      container.style.gridTemplateColumns = `repeat(${cols}, ${width}px)`;
      container.style.gridTemplateRows = `repeat(${rows}, ${height}px)`;
      container.replaceChildren(
        ...Array.from({ length: cols * rows }, () => {
          const tile = document.createElement("div");
          tile.className = tileClass;
          return tile;
        }),
      );

      tiles = [...container.children].map((node) => ({ node, index: CENTER }));
      // Measured once per layout; the wall never scrolls or reflows on its own.
      centers = tiles.map(({ node }) => {
        const box = node.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      });
      deadZone = width * 0.45;
    };

    build();

    addEventListener("resize", () => {
      build();
      schedule();
    });

    subscribe(({ x, y }) => {
      for (let i = 0; i < tiles.length; i++) {
        const dx = x - centers[i].x;
        const dy = y - centers[i].y;
        const next =
          Math.hypot(dx, dy) < deadZone ? CENTER : CLOCKWISE[sectorAt(dx, dy)];

        if (next !== tiles[i].index) {
          tiles[i].index = next;
          tiles[i].node.style.backgroundPosition = position(next);
        }
      }
    });
  };

  window.Mascot = { follow, wall };
})();
