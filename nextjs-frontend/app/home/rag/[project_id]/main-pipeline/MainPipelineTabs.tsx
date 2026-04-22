"use client";

import * as React from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import GeneratorPageClient from "./GeneratorPageClient";
import RetrieversPageClient from "./RetrieversPageClient";

type MethodSpec = Record<string, any>;

export default function MainPipelineTabs({
  project_id,
  initialGenerator,
  initialRetrievers,
}: {
  project_id: string;
  initialGenerator: MethodSpec;
  initialRetrievers: MethodSpec[];
}) {
  return (
    <Tabs defaultValue="generator" className="h-full flex flex-col">
      <div className="border-b px-4 py-3">
        <TabsList>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="retrievers">Retrievers</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="generator" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <GeneratorPageClient
              project_id={project_id}
              pipeline={initialGenerator}
            />
          </section>
        </TabsContent>

        <TabsContent value="retrievers" className="h-full m-0">
          <section className="p-4 overflow-auto h-full">
            <RetrieversPageClient
              project_id={project_id}
              pipeline={initialRetrievers}
            />
          </section>
        </TabsContent>
      </div>
    </Tabs>
  );
}