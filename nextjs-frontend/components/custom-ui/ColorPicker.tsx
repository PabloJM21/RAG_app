"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const METHOD_COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Light Gray", value: "#f3f4f6" },
  { name: "Yellow", value: "#fef9c3" },
  { name: "Green", value: "#dcfce7" },
  { name: "Blue", value: "#dbeafe" },
  { name: "Purple", value: "#f3e8ff" },
  { name: "Pink", value: "#fce7f3" },
  { name: "Orange", value: "#ffedd5" },
] as const;

export function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (next: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Choose color"
          className="h-4 w-4 rounded-sm border border-input shadow-sm"
          style={{ backgroundColor: color }}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6}>
        <div className="grid grid-cols-4 gap-2 p-2">
          {METHOD_COLORS.map((c) => (
            <DropdownMenuItem
              key={c.value}
              className="p-0 focus:bg-transparent"
              onSelect={(e) => {
                e.preventDefault(); // keep menu behavior crisp
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
