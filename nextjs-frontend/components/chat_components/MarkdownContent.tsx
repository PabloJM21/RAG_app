"use client";

import ReactMarkdown from "react-markdown";

/**
 * Renders markdown as styled HTML using the .md-content CSS class
 * defined in globals.css (no @tailwindcss/typography required).
 */
export function MarkdownContent({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={`md-content ${className}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
