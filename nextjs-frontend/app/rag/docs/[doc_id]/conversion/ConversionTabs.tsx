"use client";


import * as React from "react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";


import ConversionPageClient from "@/app/rag/docs/[doc_id]/conversion/ConversionPageClient";
import ProcessingPageClient from "@/app/rag/docs/[doc_id]/conversion/ProcessingPageClient";


type MethodSpec = Record<string, any>;


export default function ConversionTabs({
  doc_id,
  initialConversion,
  initialProcessing,
}: {
  doc_id: string;
  initialConversion: MethodSpec;
  initialProcessing: MethodSpec[];
}) {
  return (
    <Tabs defaultValue="conversion" className="h-full flex flex-col">
      {/* TAB HEADER */}
      <div className="border-b px-4 py-3">
        <TabsList>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
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

        <TabsContent value="processing" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <ProcessingPageClient
              doc_id={doc_id}
              pipeline={initialProcessing}
            />
          </section>
        </TabsContent>

      </div>
    </Tabs>
  );
}
