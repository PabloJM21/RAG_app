import DocsPage from "./docs/page";
import { ResizableSplit } from "@/components/custom-ui/ResizableSplit";

export default function RagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--theme-panel-bg)",
        borderRadius: 12,
        padding: 4,
      }}
    >
      <ResizableSplit
        height="calc(100vh - 160px)"
        initialLeftWidth={300}
        minLeftWidth={240}
        minRightWidth={420}
        left={
          <aside
            style={{
              border: "1px solid var(--theme-card-border)",
              padding: 12,
              overflow: "auto",
              background: "var(--theme-inner-panel-bg)",
              color: "var(--theme-page-fg)",
              borderRadius: 12,
              height: "100%",
              boxShadow: "var(--theme-card-shadow)",
            }}
          >
            <DocsPage />
          </aside>
        }
        right={
          <div
            style={{
              overflow: "auto",
              background: "var(--theme-inner-panel-bg)",
              color: "var(--theme-page-fg)",
              border: "1px solid var(--theme-card-border)",
              borderRadius: 12,
              padding: 16,
              height: "100%",
              boxShadow: "var(--theme-card-shadow)",
            }}
          >
            {children}
          </div>
        }
      />
    </div>
  );
}