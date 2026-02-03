"use client";

import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import ChunkingPageClient from "./ChunkingPageClient";
import ExtractionPageClient from "./ExtractionPageClient";
import ChunksResultsEditor, {Results} from "./ChunksResultsEditor";


type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;

export default function IndexingTabs({
  doc_id,
  initialChunking,
  initialExtraction,
  levels,
  results,
}: {
  doc_id: string;
  initialChunking: PipelineSpec;
  initialExtraction: PipelineSpec;
  levels: string[];
  results: Results;
}) {
  return (
    <Tabs defaultValue="chunking" className="h-full flex flex-col">
      {/* TAB HEADER */}
      <div className="border-b px-4 py-3">
        <TabsList>
          <TabsTrigger value="chunking">Chunking</TabsTrigger>
          <TabsTrigger value="extraction">Extraction</TabsTrigger>
          <TabsTrigger value="chunks">Chunks</TabsTrigger>
        </TabsList>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-hidden">
        <TabsContent value="chunking" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <ChunkingPageClient
              doc_id={doc_id}
              initialPipeline={initialChunking}
            />
          </section>
        </TabsContent>

        <TabsContent value="extraction" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <ExtractionPageClient
              doc_id={doc_id}
              initialPipeline={initialExtraction}
              levels={levels}
            />
          </section>
        </TabsContent>

        <TabsContent value="chunks" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <ChunksResultsEditor
              doc_id={doc_id}
              initialResults={results}
            />
          </section>
        </TabsContent>
      </div>
    </Tabs>
  );
}
