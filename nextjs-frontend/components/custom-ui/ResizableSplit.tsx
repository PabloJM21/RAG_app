"use client";

import * as React from "react";

import {
  themedResizerLineActiveStyle,
  themedResizerLineStyle,
} from "@/components/custom-ui/themeStyles";

type ResizableSplitProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  height?: string;
  gap?: number;
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
      const gutter = 8;
      const maxLeft = Math.max(minLeftWidth, total - minRightWidth - gutter - gap);

      return Math.min(Math.max(next, minLeftWidth), maxLeft);
    },
    [minLeftWidth, minRightWidth, gap],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
          width: 8,
          background: "transparent",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 3,
            width: 2,
            borderRadius: 2,
            ...(dragging ? themedResizerLineActiveStyle : themedResizerLineStyle),
          }}
        />
      </div>

      <div style={{ minWidth: 0 }}>{right}</div>
    </div>
  );
}