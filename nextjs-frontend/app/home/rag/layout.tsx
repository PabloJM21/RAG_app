import DocsPage from "./docs/page";
import { ResizableSplit } from "@/components/custom-ui/ResizableSplit";

export default function RagLayout({ children }: { children: React.ReactNode }) {
  return (
    <ResizableSplit
      height="calc(100vh - 160px)"
      initialLeftWidth={300}
      minLeftWidth={240}
      minRightWidth={420}
      left={
        <aside
          style={{
            borderRight: "1px solid #ddd",
            padding: 12,
            overflow: "auto",
            background: "white",
            borderRadius: 8,
            height: "100%",
          }}
        >
          <DocsPage />
        </aside>
      }
      right={
        <div
          style={{
            overflow: "auto",
            background: "white",
            borderRadius: 8,
            padding: 16,
            height: "100%",
          }}
        >
          {children}
        </div>
      }
    />
  );
}
