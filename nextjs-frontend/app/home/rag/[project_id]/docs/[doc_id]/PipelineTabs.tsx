"use client";

import * as React from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/../components/ui/tabs";

import ChunkingPageClient from "./ChunkingPageClient";
import EnrichmentPageClient from "./EnrichmentPageClient";
import ChunksResultsEditor, { Results } from "./ChunksResultsEditor";
import RetrievalPageClient from "./RetrievalPageClient";
import ConversionPageClient from "./ConversionPageClient";

type MethodSpec = Record<string, any>;
type PipelineSpec = MethodSpec[];
type StageColors = Record<string, string>;
type ColorsSpec = {
  Chunking?: StageColors;
  Enriching?: StageColors;
  Retrieval?: StageColors;
};

export default function PipelineTabs({
  project_id,
  doc_id,
  initialConversion,
  initialChunking,
  initialEnrichment,
  levels,
  results,
  initialRetrieval,
  colors,
}: {
  project_id: string;
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
          <TabsTrigger value="retrieval">Retrieval</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="conversion" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <ConversionPageClient
              project_id={project_id}
              doc_id={doc_id}
              pipeline={initialConversion}
            />
          </section>
        </TabsContent>

        <TabsContent value="chunking" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <ChunkingPageClient
              project_id={project_id}
              doc_id={doc_id}
              initialPipeline={initialChunking}
              colors={currentColors.Chunking}
            />
          </section>
        </TabsContent>

        <TabsContent value="enrichment" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <EnrichmentPageClient
              project_id={project_id}
              doc_id={doc_id}
              initialPipeline={initialEnrichment}
              initialResults={results}
              levels={levels}
              colors={currentColors.Enriching}
            />
          </section>
        </TabsContent>


        <TabsContent value="retrieval" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <RetrievalPageClient
              project_id={project_id}
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