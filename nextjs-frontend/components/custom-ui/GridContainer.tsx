import React from "react";

type GridContainerProps = {
  children: React.ReactNode;
};

export function GridContainer({ children }: GridContainerProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "repeat(4, 1fr)",
        height: "100vh",
      }}
    >
      {children}
    </div>
  );
}
