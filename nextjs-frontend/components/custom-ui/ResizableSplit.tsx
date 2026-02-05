"use client";

import * as React from "react";

type ResizableSplitProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  initialLeftWidth?: number; // px
  minLeftWidth?: number; // px
  minRightWidth?: number; // px
  height?: string; // e.g. "calc(100vh - 160px)"
  gap?: number; // px
};

export function ResizableSplit({
  left,
  right,
  initialLeftWidth = 300,
  minLeftWidth = 220,
  minRightWidth = 320,
  height = "calc(100vh - 160px)",
  gap = 12,
}: ResizableSplitProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const draggingRef = React.useRef(false);

  const [leftWidth, setLeftWidth] = React.useState(initialLeftWidth);
  const [dragging, setDragging] = React.useState(false);

  const clampLeftWidth = React.useCallback(
    (next: number) => {
      const el = containerRef.current;
      if (!el) return next;

      const total = el.getBoundingClientRect().width;
      const gutter = 8; // handle width
      const maxLeft = Math.max(minLeftWidth, total - minRightWidth - gutter - gap);

      return Math.min(Math.max(next, minLeftWidth), maxLeft);
    },
    [minLeftWidth, minRightWidth, gap],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    setDragging(true);

    // capture pointer so dragging keeps working outside the handle
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // prevent text selection / accidental clicks
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setLeftWidth(clampLeftWidth(x));
  };

  const stopDragging = (e?: React.PointerEvent) => {
    draggingRef.current = false;
    setDragging(false);
    if (e) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // nice UX: disable text selection while dragging
  React.useEffect(() => {
    if (!dragging) return;

    const prev = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onUp = () => {
      draggingRef.current = false;
      setDragging(false);
    };

    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      document.body.style.userSelect = prev;
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "grid",
        gridTemplateColumns: `${leftWidth}px 8px 1fr`,
        height,
        columnGap: 0,
        alignItems: "stretch",
      }}
    >
      <div style={{ minWidth: 0 }}>{left}</div>

      {/* Gutter / draggable boundary */}
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        style={{
          cursor: "col-resize",
          position: "relative",
          // widen hit area while keeping it visually subtle
          width: 8,
          background: "transparent",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {/* visible line + hover/drag highlight */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 3,
            width: 2,
            borderRadius: 2,
            background: dragging ? "#999" : "rgba(0,0,0,0.15)",
          }}
        />
      </div>

      <div style={{ minWidth: 0 }}>{right}</div>
    </div>
  );
}
