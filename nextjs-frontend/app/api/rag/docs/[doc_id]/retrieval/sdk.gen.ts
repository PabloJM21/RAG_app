import {
  type Options as ClientOptions,
  type Client,
  type TDataShape,
} from "@/api/custom-openapi-client/client";

import { client } from "@/api/custom-openapi-client/client.gen";

export type Options<
  TData extends TDataShape = TDataShape,
  ThrowOnError extends boolean = boolean,
> = ClientOptions<TData, ThrowOnError> & {
  client?: Client;
  meta?: Record<string, unknown>;
};

export type ValidationError = {
  loc: Array<string | number>;
  msg: string;
  type: string;
};

export type HttpValidationError = {
  detail?: Array<ValidationError>;
};

export type PipelineSpec = Array<Record<string, any>>;

export type Errors = {
  422: HttpValidationError;
};

/**
 * Run Pipeline
 */
export type runPipelineData = {
  body?: never;
  path: {
    project_id: string;
    doc_id: string;
  };
  query?: never;
  url: "/retrieval/{project_id}/docs/{doc_id}/run";
};

export type runPipelineResponses = {
  200: unknown;
};

export const runPipeline = <ThrowOnError extends boolean = false>(
  options?: Options<runPipelineData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    runPipelineResponses,
    Errors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/retrieval/{project_id}/docs/{doc_id}/run",
    ...options,
  });
};

/**
 * Create Pipeline
 */
export type CreatePipelineData = {
  body: PipelineSpec;
  path: {
    project_id: string;
    doc_id: string;
  };
  query?: never;
  url: "/retrieval/{project_id}/docs/{doc_id}/data";
};

export type CreatePipelineResponses = {
  200: unknown;
};

export const createPipeline = <ThrowOnError extends boolean = false>(
  options?: Options<CreatePipelineData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreatePipelineResponses,
    Errors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/retrieval/{project_id}/docs/{doc_id}/data",
    ...options,
  });
};

/**
 * Read Pipeline
 */
export type ReadPipelineData = {
  body?: never;
  path: {
    project_id: string;
    doc_id: string;
  };
  query?: never;
  url: "/retrieval/{project_id}/docs/{doc_id}/data";
};

export type ReadPipelineResponses = {
  200: PipelineSpec;
};

export const readPipeline = <ThrowOnError extends boolean = false>(
  options?: Options<ReadPipelineData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadPipelineResponses,
    Errors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/retrieval/{project_id}/docs/{doc_id}/data",
    ...options,
  });
};