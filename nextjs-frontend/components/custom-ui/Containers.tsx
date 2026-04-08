// MethodsContainerCard.tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MethodsContainerCardProps<T> = {
  title?: React.ReactNode;
  methods: T[];
  emptyText?: React.ReactNode;
  renderMethod: (method: T, index: number) => React.ReactNode;

  className?: string;
  headerClassName?: string;
  contentClassName?: string;

  /** Optional extra ring classes if you still want them */
  accentClassName?: string;
};

const themedContainerCardStyle: React.CSSProperties = {
  color: "var(--theme-card-fg)",
  borderColor: "var(--theme-accent-border)",
  boxShadow: [
    "var(--theme-card-shadow)",
    "0 0 0 1px var(--theme-accent-border)",
    "0 0 28px color-mix(in srgb, var(--theme-accent-glow) 45%, transparent)",
    "inset 0 1px 0 color-mix(in srgb, white 10%, transparent)",
  ].join(", "),
  background: [
    "linear-gradient(180deg, color-mix(in srgb, var(--theme-accent-ring) 32%, var(--theme-card-bg)) 0%, color-mix(in srgb, var(--theme-accent-ring) 22%, var(--theme-card-bg)) 100%)",
  ].join(", "),
};

const themedContainerInnerOverlayStyle: React.CSSProperties = {
  outlineColor: "var(--theme-accent-outline)",
  backgroundImage: [
    "linear-gradient(135deg, color-mix(in srgb, var(--theme-accent-ring) 24%, transparent) 0%, transparent 30%, color-mix(in srgb, var(--theme-accent-ring) 18%, transparent) 68%, transparent 100%)",
    "radial-gradient(1200px 260px at 20% 0%, color-mix(in srgb, white 22%, transparent), transparent 60%)",
    "radial-gradient(900px 280px at 80% 100%, color-mix(in srgb, black 16%, transparent), transparent 58%)",
    "radial-gradient(900px 400px at 50% -10%, color-mix(in srgb, var(--theme-accent-glow) 30%, transparent), transparent 70%)",
  ].join(", "),
};

const themedContainerTopLineStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, transparent, var(--theme-accent-top-line), transparent)",
  boxShadow: "0 0 12px var(--theme-accent-glow)",
};

const themedContainerHeaderGlowStyle: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(700px 140px at 20% 0%, color-mix(in srgb, var(--theme-accent-header-glow) 95%, transparent), transparent 72%)",
};

const themedContainerTitleStyle: React.CSSProperties = {
  color: "var(--theme-card-title)",
};

const themedContainerMutedStyle: React.CSSProperties = {
  color: "var(--theme-card-muted)",
};

const subtleHorizontalScrollbarVars: React.CSSProperties = {
  scrollbarWidth: "thin",
  scrollbarColor:
    "color-mix(in srgb, var(--theme-accent-ring) 26%, var(--theme-card-border)) transparent",
};

function ThemedScrollbarStyles({ scopeClass }: { scopeClass: string }) {
  return (
    <style>{`
      .${scopeClass}::-webkit-scrollbar {
        height: 8px;
      }

      .${scopeClass}::-webkit-scrollbar-track {
        background: transparent;
        margin-inline: 6px;
      }

      .${scopeClass}::-webkit-scrollbar-thumb {
        background: color-mix(
          in srgb,
          var(--theme-card-border) 78%,
          var(--theme-accent-ring) 22%
        );
        border-radius: 9999px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      .${scopeClass}:hover::-webkit-scrollbar-thumb {
        background: color-mix(
          in srgb,
          var(--theme-card-border) 58%,
          var(--theme-accent-ring) 42%
        );
      }

      .${scopeClass}::-webkit-scrollbar-corner {
        background: transparent;
      }
    `}</style>
  );
}

export function MethodsContainerCard<T>({
  title = "Pipeline",
  methods,
  emptyText = "No methods yet — add one above.",
  renderMethod,
  className,
  headerClassName,
  contentClassName,
  accentClassName,
}: MethodsContainerCardProps<T>) {
  const scrollClass = React.useMemo(
    () => `methods-scroll-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  return (
    <Card
      style={themedContainerCardStyle}
      className={cn(
        "relative w-full max-w-full min-h-0 rounded-xl",
        "border ring-1 ring-[var(--theme-accent-ring)]/40",
        "overflow-hidden",
        className,
        accentClassName,
      )}
    >
      <ThemedScrollbarStyles scopeClass={scrollClass} />

      {/* Inner ring + texture + vignette */}
      <div
        aria-hidden="true"
        style={themedContainerInnerOverlayStyle}
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl",
          "outline outline-1 outline-offset-[-6px]",
        )}
      />

      {/* Tiny sparkle line near top edge */}
      <div
        aria-hidden="true"
        style={themedContainerTopLineStyle}
        className="pointer-events-none absolute left-3 right-3 top-2 h-px"
      />

      <CardHeader className={cn("py-3 relative", headerClassName)}>
        <div
          aria-hidden="true"
          style={themedContainerHeaderGlowStyle}
          className="pointer-events-none absolute inset-0 opacity-90"
        />
        <CardTitle
          style={themedContainerTitleStyle}
          className="relative text-sm font-medium"
        >
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className={cn("pt-0 h-full min-h-0 relative", contentClassName)}>
        <div className="relative">
          <div
            className={cn(
              scrollClass,
              "flex items-stretch gap-4 overflow-x-auto overflow-y-hidden pb-3",
            )}
            style={subtleHorizontalScrollbarVars}
          >
            {methods.map((method, index) => (
              <div key={index} className="mt-3 shrink-0">
                {renderMethod(method, index)}
              </div>
            ))}
          </div>
        </div>

        {methods.length === 0 && (
          <div style={themedContainerMutedStyle} className="text-sm mt-2">
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Hierarchical Container
 */

type HierarchicalMethodsContainerCardProps<T> = {
  title?: React.ReactNode;
  methods: T[];
  emptyText?: React.ReactNode;
  renderMethod: (method: T, index: number) => React.ReactNode;

  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  accentClassName?: string;

  /**
   * Space between cards in the row
   */
  gapClassName?: string;

  /**
   * Whether to show arrows between cards
   */
  showConnectors?: boolean;
};

type Connector = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export function HierarchicalMethodsContainerCard<T>({
  title = "Pipeline",
  methods,
  emptyText = "No methods yet — add one above.",
  renderMethod,
  className,
  headerClassName,
  contentClassName,
  accentClassName,
  gapClassName = "gap-10",
  showConnectors = true,
}: HierarchicalMethodsContainerCardProps<T>) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const contentInnerRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const [connectors, setConnectors] = React.useState<Connector[]>([]);
  const [svgSize, setSvgSize] = React.useState({ width: 0, height: 0 });

  const scrollClass = React.useMemo(
    () => `hierarchical-scroll-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  const recalcConnectors = React.useCallback(() => {
    const scrollEl = scrollRef.current;
    const innerEl = contentInnerRef.current;
    if (!scrollEl || !innerEl || methods.length < 2) {
      setConnectors([]);
      return;
    }

    const innerRect = innerEl.getBoundingClientRect();
    const nextConnectors: Connector[] = [];

    for (let i = 0; i < methods.length - 1; i++) {
      const fromEl = itemRefs.current[i];
      const toEl = itemRefs.current[i + 1];

      if (!fromEl || !toEl) continue;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const x1 = fromRect.right - innerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - innerRect.top;

      const x2 = toRect.left - innerRect.left;
      const y2 = toRect.top + toRect.height / 2 - innerRect.top;

      nextConnectors.push({ x1, y1, x2, y2 });
    }

    setSvgSize({
      width: innerEl.scrollWidth,
      height: innerEl.scrollHeight,
    });
    setConnectors(nextConnectors);
  }, [methods.length]);

  React.useLayoutEffect(() => {
    recalcConnectors();
  }, [methods, recalcConnectors]);

  React.useEffect(() => {
    const scrollEl = scrollRef.current;
    const innerEl = contentInnerRef.current;
    if (!scrollEl || !innerEl) return;

    const ro = new ResizeObserver(() => {
      recalcConnectors();
    });

    ro.observe(scrollEl);
    ro.observe(innerEl);
    itemRefs.current.forEach((el) => {
      if (el) ro.observe(el);
    });

    const handleScroll = () => recalcConnectors();
    const handleResize = () => recalcConnectors();

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      ro.disconnect();
      scrollEl.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [methods, recalcConnectors]);

  return (
    <Card
      style={themedContainerCardStyle}
      className={cn(
        "relative w-full max-w-full min-h-0 rounded-xl",
        "border ring-1 ring-[var(--theme-accent-ring)]/40",
        "overflow-hidden",
        className,
        accentClassName,
      )}
    >
      <ThemedScrollbarStyles scopeClass={scrollClass} />

      <div
        aria-hidden="true"
        style={themedContainerInnerOverlayStyle}
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl",
          "outline outline-1 outline-offset-[-6px]",
        )}
      />

      <div
        aria-hidden="true"
        style={themedContainerTopLineStyle}
        className="pointer-events-none absolute left-3 right-3 top-2 h-px"
      />

      <CardHeader className={cn("py-3 relative", headerClassName)}>
        <div
          aria-hidden="true"
          style={themedContainerHeaderGlowStyle}
          className="pointer-events-none absolute inset-0 opacity-90"
        />
        <CardTitle
          style={themedContainerTitleStyle}
          className="relative text-sm font-medium"
        >
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className={cn("pt-0 h-full min-h-0 relative", contentClassName)}>
        <div className="relative">
          <div
            ref={scrollRef}
            className={cn(
              scrollClass,
              "relative flex items-stretch overflow-x-auto overflow-y-hidden pb-3",
            )}
            style={subtleHorizontalScrollbarVars}
          >
            <div
              ref={contentInnerRef}
              className={cn("relative flex min-w-max items-start", gapClassName)}
            >
              {showConnectors && methods.length > 1 && (
                <svg
                  className="pointer-events-none absolute inset-0 overflow-visible"
                  width={svgSize.width}
                  height={svgSize.height}
                  style={{ zIndex: 0 }}
                >
                  {connectors.map((c, i) => {
                    const arrowLength = 18;
                    const arrowWidth = 14;

                    const lineToArrowGap = 5;
                    const endGap = 2;

                    const tipX = c.x2 - endGap;
                    const tipY = c.y2;

                    const shaftEndX = tipX - arrowLength - lineToArrowGap;
                    const midX = (c.x1 + shaftEndX) / 2;

                    const d = `
                      M ${c.x1} ${c.y1}
                      L ${midX} ${c.y1}
                      L ${midX} ${tipY}
                      L ${shaftEndX} ${tipY}
                    `;

                    const arrowPoints = `
                      ${tipX},${tipY}
                      ${tipX - arrowLength},${tipY - arrowWidth / 2}
                      ${tipX - arrowLength},${tipY + arrowWidth / 2}
                    `;

                    return (
                      <g key={i}>
                        <path
                          d={d}
                          fill="none"
                          stroke="var(--theme-button-primary-bg)"
                          strokeWidth="2"
                          strokeDasharray="6 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        <polygon
                          points={arrowPoints}
                          fill="var(--theme-button-primary-bg)"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {methods.map((method, index) => (
                <div
                  key={index}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className="relative z-10 mt-3 shrink-0"
                >
                  {renderMethod(method, index)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {methods.length === 0 && (
          <div style={themedContainerMutedStyle} className="text-sm mt-2">
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  );
}