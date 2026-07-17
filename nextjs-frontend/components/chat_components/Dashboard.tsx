"use client";

import { DashboardItem, TreeNode } from '@/api/rag/chat/useStore'
import { Badge } from "@/../components/ui/badge"
import { useState } from 'react'
import { MarkdownContent } from "@/../components/chat_components/MarkdownContent"

interface DashboardProps {
  items: DashboardItem[]
}

export function Dashboard({ items }: DashboardProps) {
  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-muted-foreground text-sm">No dashboard data yet.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {items.map((item, index) => (
        <DashboardCard key={index} item={item} index={index} />
      ))}
    </div>
  )
}

// ─── Standalone Graph View (new tab) ────────────────────────────────────────

export function RetrievalGraphView({ items }: DashboardProps) {
  const itemsWithTree = items.filter(
    item => item.metadata.tree && Object.keys(item.metadata.tree).length > 0
  )

  if (itemsWithTree.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-muted-foreground text-sm">No retrieval graph data yet.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {itemsWithTree.map((item, index) => (
        <div key={index} className="flex flex-col items-center">
          <p className="text-sm font-semibold mb-4 self-start">
            Project: <span className="font-bold">{item.project}</span>
          </p>
          {Object.entries(item.metadata.tree!).map(([docTitle, treeData]) => (
            <RetrievalTree key={docTitle} docTitle={docTitle} tree={treeData as TreeNode} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Dashboard Card ──────────────────────────────────────────────────────────

function DashboardCard({ item, index }: { item: DashboardItem; index: number }) {
  const rowCount = item.metadata.Chunk.length
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <div className="border rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
          <span className="font-bold">{item.project}</span>
        </div>
        <div className="flex items-center gap-2">
          {typeof item.score === "number" && (
            <Badge variant="secondary">Score: {item.score.toFixed(3)}</Badge>
          )}
          <Badge variant="outline">{item.time}s</Badge>
        </div>
      </div>

      {/* Answer */}
      <div className="bg-muted rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">Answer</p>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => setShowAnswer(prev => !prev)}
          >
            {showAnswer ? 'Hide answer' : 'Show answer'}
          </button>
        </div>
        {showAnswer && <MarkdownContent content={item.answer} />}
      </div>

      {/* Metadata Table */}
      {rowCount > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">Retrieved Chunks</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              {expandedRow === null && (
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Document</th>
                    <th className="text-left p-2 font-medium">Level</th>
                    <th className="text-left p-2 font-medium">Number</th>
                    <th className="text-left p-2 font-medium">Chunk</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {Array.from({ length: rowCount }).map((_, i) => {
                  const isExpanded = expandedRow === i
                  if (expandedRow !== null && !isExpanded) return null

                  if (isExpanded) {
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td colSpan={5} className="p-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-xs text-muted-foreground">
                              Chunk {i + 1} — {item.metadata.Document[i]}
                            </span>
                            <button
                              className="text-xs text-primary hover:underline flex-shrink-0"
                              onClick={() => setExpandedRow(null)}
                            >
                              Show less
                            </button>
                          </div>
                          <MarkdownContent content={item.metadata.Chunk[i]} />
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2">{item.metadata.Document[i]}</td>
                      <td className="p-2">{item.metadata.Level[i]}</td>
                      <td className="p-2">{item.metadata.Number[i]}</td>
                      <td className="p-2 max-w-xs">
                        <ChunkCell content={item.metadata.Chunk[i]} onExpand={() => setExpandedRow(i)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ChunkCell({ content, onExpand }: { content: string; onExpand: () => void }) {
  const isLong = content.length > 120
  return (
    <div>
      <p className="whitespace-pre-wrap line-clamp-2">{content}</p>
      {isLong && (
        <button className="text-xs text-primary mt-1 hover:underline" onClick={onExpand}>
          Show more
        </button>
      )}
    </div>
  )
}

// ─── Retrieval Tree SVG ──────────────────────────────────────────────────────

const NODE_W = 48
const NODE_H = 28
const H_GAP = 20
const V_GAP = 64  // increased vertical gap to avoid label/node overlap
const LABEL_W = 96
const GRAPH_GAP = 36
const GRAPH_CONTENT_W = 420

function RetrievalTree({ docTitle, tree }: { docTitle: string; tree: TreeNode }) {
  const { level_order, nodes, edges } = tree
  const visibleLevels = level_order.filter(lvl => nodes[lvl]?.length > 0)

  const nodePos: Record<string, { cx: number; cy: number }> = {}

  let maxRowWidth = 0
  visibleLevels.forEach(lvl => {
    const nums = nodes[lvl] ?? []
    const rowWidth = nums.length * NODE_W + (nums.length - 1) * H_GAP
    if (rowWidth > maxRowWidth) maxRowWidth = rowWidth
  })

  const svgPadX = 16
  const svgPadY = 24
  const graphStartX = LABEL_W + GRAPH_GAP

  visibleLevels.forEach((lvl, rowIdx) => {
    const nums = nodes[lvl] ?? []
    const rowWidth = nums.length * NODE_W + (nums.length - 1) * H_GAP
    // Use a fixed chart area so the document node stays aligned across graphs
    const startX = graphStartX + (GRAPH_CONTENT_W - rowWidth) / 2
    const cy = svgPadY + rowIdx * (NODE_H + V_GAP) + NODE_H / 2

    nums.forEach((num, i) => {
      const cx = startX + i * (NODE_W + H_GAP) + NODE_W / 2
      nodePos[`${lvl}:${num}`] = { cx, cy }
    })
  })

  const svgWidth = LABEL_W + GRAPH_GAP + GRAPH_CONTENT_W
  const svgHeight = svgPadY * 2 + visibleLevels.length * (NODE_H + V_GAP) - V_GAP + NODE_H

  return (
    <div className="mb-6 w-full">
      <div className="mx-auto w-full max-w-[980px]">
        <p className="text-xs font-medium text-muted-foreground mb-3 text-left">{docTitle}</p>
        <div className="overflow-x-auto flex justify-center">
          <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
            {/* Level labels - aligned on the left */}
            {visibleLevels.map((lvl, rowIdx) => {
              const cy = svgPadY + rowIdx * (NODE_H + V_GAP) + NODE_H / 2
              return (
                <text
                  key={lvl}
                  x={12}
                  y={cy + 4}
                  fontSize={10}
                  fill="currentColor"
                  opacity={0.55}
                  fontFamily="ui-monospace, monospace"
                >
                  {lvl}
                </text>
              )
            })}

            {/* Separator between labels and graph area */}
            <line
              x1={LABEL_W}
              y1={svgPadY - 8}
              x2={LABEL_W}
              y2={svgHeight - svgPadY + 8}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />

            {/* Edges */}
          {edges.map((e, i) => {
            const p = nodePos[`${e.parent_level}:${e.parent_num}`]
            const c = nodePos[`${e.child_level}:${e.child_num}`]
            if (!p || !c) return null
            const my = (p.cy + c.cy) / 2
            return (
              <path
                key={i}
                d={`M ${p.cx} ${p.cy + NODE_H / 2} C ${p.cx} ${my}, ${c.cx} ${my}, ${c.cx} ${c.cy - NODE_H / 2}`}
                fill="none"
                stroke="var(--theme-button-primary-bg)"
                strokeWidth={1.5}
                opacity={0.5}
              />
            )
          })}

          {/* Nodes */}
          {visibleLevels.map(lvl =>
            (nodes[lvl] ?? []).map(num => {
              const pos = nodePos[`${lvl}:${num}`]
              if (!pos) return null
              const isLeaf = lvl === visibleLevels[visibleLevels.length - 1]
              const displayLabel = lvl.toLowerCase() === 'document' ? '' : String(num)

              return (
                <g key={`${lvl}:${num}`}>
                  <rect
                    x={pos.cx - NODE_W / 2}
                    y={pos.cy - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    fill={isLeaf ? 'var(--theme-button-primary-bg)' : 'var(--theme-inner-panel-bg)'}
                    stroke="var(--theme-card-border)"
                    strokeWidth={1}
                  />
                  <text
                    x={pos.cx}
                    y={pos.cy + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={isLeaf ? 600 : 400}
                    fill={isLeaf ? 'var(--theme-button-primary-fg)' : 'var(--theme-page-fg)'}
                    fontFamily="ui-monospace, monospace"
                  >
                    {displayLabel}
                  </text>
                </g>
              )
            })
          )}
          </svg>
        </div>
      </div>
    </div>
  )
}
