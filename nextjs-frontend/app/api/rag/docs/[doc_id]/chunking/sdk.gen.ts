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

export type Errors = {
  422: HttpValidationError;
};

export type MethodSpec = Record<string, any>;
export type PipelineSpec = MethodSpec[];

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
  url: "/chunking/{project_id}/docs/{doc_id}/run";
};

export type runPipelineResponses = {
  200: {
    status: "ok";
  };
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
    url: "/chunking/{project_id}/docs/{doc_id}/run",
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
  url: "/chunking/{project_id}/docs/{doc_id}/data";
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
    url: "/chunking/{project_id}/docs/{doc_id}/data",
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
  url: "/chunking/{project_id}/docs/{doc_id}/data";
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
    url: "/chunking/{project_id}/docs/{doc_id}/data",
    ...options,
  });
};

/**
 * Read Levels
 */
export type ReadLevelsData = {
  body?: never;
  path: {
    project_id: string;
    doc_id: string;
  };
  query?: never;
  url: "/chunking/{project_id}/docs/{doc_id}/levels";
};

export type ReadLevelsResponses = {
  200: string[];
};

export const readLevels = <ThrowOnError extends boolean = false>(
  options?: Options<ReadLevelsData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadLevelsResponses,
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
    url: "/chunking/{project_id}/docs/{doc_id}/levels",
    ...options,
  });
};