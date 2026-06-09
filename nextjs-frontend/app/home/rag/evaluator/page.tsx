
import * as React from "react";
import EvaluatorPageClient from "@/app/home/rag/evaluator/EvaluatorPageClient";
import {fetchEvaluator} from "@/app/api/rag/projects/projects-action";


export default async function EvaluatorPage() {
  const Evaluator = await fetchEvaluator();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <EvaluatorPageClient
          evaluator={Evaluator}
        />
      </div>
    </div>
  );
}