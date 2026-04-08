"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const SOFT_METHOD_COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Light Gray", value: "#f3f4f6" },
  { name: "Gray", value: "#e5e7eb" },
  { name: "Amber", value: "#fef3c7" },
  { name: "Yellow", value: "#fde68a" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Peach", value: "#ffedd5" },
  { name: "Rose", value: "#ffe4e6" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Lavender", value: "#e9d5ff" },
  { name: "Purple", value: "#ddd6fe" },
  { name: "Sky", value: "#bae6fd" },
  { name: "Blue", value: "#dbeafe" },
  { name: "Cyan", value: "#cffafe" },
  { name: "Mint", value: "#d1fae5" },
  { name: "Green", value: "#bbf7d0" },
] as const;

export function ColorPicker({
  color,
  onChange,
  variant = "spectrum",
}: {
  color: string;
  onChange: (next: string) => void;
  variant?: "spectrum" | "soft";
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Choose ${variant} color`}
          className="h-5 w-5 rounded-sm border border-input shadow-sm"
          style={{ backgroundColor: color }}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="p-2">
        {variant === "spectrum" ? (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">Choose any color</div>

            <button
              type="button"
              className="relative h-10 w-24 overflow-hidden rounded-md border"
              onClick={() => inputRef.current?.click()}
              style={{
                background:
                  "linear-gradient(90deg, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
              }}
            >
              <span className="sr-only">Open color spectrum</span>
              <input
                ref={inputRef}
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Choose any color"
              />
            </button>

            <div
              className="h-6 w-full rounded-sm border"
              style={{ backgroundColor: color }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {SOFT_METHOD_COLORS.map((c) => (
              <DropdownMenuItem
                key={c.value}
                className="p-0 focus:bg-transparent"
                onSelect={(e) => {
                  e.preventDefault();
                  onChange(c.value);
                }}
              >
                <div
                  className="h-6 w-6 rounded-sm border border-input"
                  title={c.name}
                  style={{ backgroundColor: c.value }}
                />
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}