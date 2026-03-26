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
import EnrichmentPageClient from "./EnrichmentPageClient";
import ChunksResultsEditor, {Results} from "./ChunksResultsEditor";
import RetrievalPageClient from "@/app/home/rag/docs/[doc_id]/retrieval/RetrievalPageClient";
import ConversionPageClient from "@/app/home/rag/docs/[doc_id]/conversion/ConversionPageClient";


type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;

export default function PipelineTabs({
  doc_id,
  initialConversion,
  initialChunking,
  initialEnrichment,
  levels,
  results,
  initialRetrieval,
}: {
  doc_id: string;
  initialConversion: MethodSpec;
  initialChunking: PipelineSpec;
  initialEnrichment: PipelineSpec;
  levels: string[];
  results: Results;
  initialRetrieval: MethodSpec[];
}) {
  return (
    <Tabs defaultValue="chunking" className="h-full flex flex-col">
      {/* TAB HEADER */}
      <div className="border-b px-4 py-3">
        <TabsList>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="chunking">Chunking</TabsTrigger>
          <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
          <TabsTrigger value="chunks">Chunks</TabsTrigger>
          <TabsTrigger value="chunking">Retrieval</TabsTrigger>
        </TabsList>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-hidden">
        
        
        <TabsContent value="conversion" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <ConversionPageClient
              doc_id={doc_id}
              pipeline={initialConversion}
            />
          </section>
        </TabsContent>
        
        
        <TabsContent value="chunking" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <ChunkingPageClient
              doc_id={doc_id}
              initialPipeline={initialChunking}
            />
          </section>
        </TabsContent>

        <TabsContent value="enrichment" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <EnrichmentPageClient
              doc_id={doc_id}
              initialPipeline={initialEnrichment}
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
        
        <TabsContent value="retrieval" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <RetrievalPageClient
              doc_id={doc_id}
              pipeline={initialRetrieval}
              levels={levels}
            />
          </section>
        </TabsContent>
      </div>
    </Tabs>
  );
}
