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
import ChunksResultsEditor, { Results } from "./ChunksResultsEditor";
import RetrievalPageClient from "@/app/home/rag/docs/[doc_id]/RetrievalPageClient";
import ConversionPageClient from "@/app/home/rag/docs/[doc_id]/ConversionPageClient";

type MethodSpec = Record<string, any>;
type PipelineSpec = Record<string, MethodSpec[]>;
type StageColors = Record<string, string>;
type ColorsSpec = {
  Chunking?: StageColors;
  Enriching?: StageColors;
  Retrieval?: StageColors;
};

export default function PipelineTabs({
  doc_id,
  initialConversion,
  initialChunking,
  initialEnrichment,
  levels,
  results,
  initialRetrieval,
  colors,
}: {
  doc_id: string;
  initialConversion: MethodSpec;
  initialChunking: PipelineSpec;
  initialEnrichment: PipelineSpec;
  levels: string[];
  results: Results;
  initialRetrieval: MethodSpec[];
  colors: ColorsSpec;
}) {
  const currentColors = {
    Chunking: colors?.Chunking ?? {},
    Enriching: colors?.Enriching ?? {},
    Retrieval: colors?.Retrieval ?? {},
  };

  return (
    <Tabs defaultValue="chunking" className="h-full flex flex-col">
      <div className="border-b px-4 py-3">
        <TabsList>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="chunking">Chunking</TabsTrigger>
          <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
          <TabsTrigger value="chunks">Chunks</TabsTrigger>
          <TabsTrigger value="retrieval">Retrieval</TabsTrigger>
        </TabsList>
      </div>

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
              colors={currentColors.Chunking}
            />
          </section>
        </TabsContent>

        <TabsContent value="enrichment" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <EnrichmentPageClient
              doc_id={doc_id}
              initialPipeline={initialEnrichment}
              levels={levels}
              colors={currentColors.Enriching}
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
              colors={currentColors.Retrieval}
            />
          </section>
        </TabsContent>
      </div>
    </Tabs>
  );
}