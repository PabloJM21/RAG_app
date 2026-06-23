// components/chat_components/Dashboard.tsx

import { DashboardItem } from '@/api/rag/chat/useStore'
import {Badge} from "@/../components/ui/badge";
import {
  useState,
} from 'react'

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

function DashboardCard({ item, index }: { item: DashboardItem; index: number }) {
  const rowCount = item.metadata.Chunk.length

  return (
    <div className="border rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">
            #{index + 1}
          </span>
          <span className="font-bold">{item.project}</span>
        </div>

        <div className="flex items-center gap-2">
          {item.score !== undefined && (
            <Badge variant="secondary">
              Score: {item.score.toFixed(3)}
            </Badge>
          )}
          <Badge variant="outline">
            {item.time}s
          </Badge>
        </div>
      </div>

      {/* Answer */}
      <div className="bg-muted rounded-md p-3">
        <p className="text-sm font-medium mb-1 text-muted-foreground">Answer</p>
        <p className="text-sm whitespace-pre-wrap">{item.answer}</p>
      </div>

      {/* Metadata Table */}
      {rowCount > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">
            Retrieved Chunks
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">#</th>
                  <th className="text-left p-2 font-medium">Document</th>
                  <th className="text-left p-2 font-medium">Level</th>
                  <th className="text-left p-2 font-medium">Number</th>
                  <th className="text-left p-2 font-medium">Chunk</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rowCount }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2">{item.metadata.Document[i]}</td>
                    <td className="p-2">{item.metadata.Level[i]}</td>
                    <td className="p-2">{item.metadata.Number[i]}</td>
                    <td className="p-2 max-w-xs">
                      <ChunkCell content={item.metadata.Chunk[i]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ChunkCell({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = content.length > 120

  return (
    <div>
      <p className={`whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-2' : ''}`}>
        {content}
      </p>
      {isLong && (
        <button
          className="text-xs text-primary mt-1 hover:underline"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}