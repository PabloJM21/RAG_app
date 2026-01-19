import React from "react";

type CellProps = {
  children: React.ReactNode;
  bordered?: boolean;
};

export function Cell({ children, bordered = true }: CellProps) {
  return (
    <section
      style={{
        borderBottom: bordered ? "1px solid #ddd" : undefined,
        padding: 12,
        overflow: "auto",
      }}
    >
      {children}
    </section>
  );
}
