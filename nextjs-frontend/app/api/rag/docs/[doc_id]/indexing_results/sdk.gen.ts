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

type Item = {
  retrieval_id: number;
  title: string;
  content: string;
};

type LevelResult = {
  level: string;
  items: Item[];
};

export type ResultsSpec = LevelResult[];

/**
 * Create Results
 */
export type CreateResultsData = {
  body: ResultsSpec;
  path: {
    project_id: string;
    doc_id: string;
  };
  query?: never;
  url: "/chunking/{project_id}/docs/{doc_id}/results";
};

export type CreateResultsResponses = {
  200: unknown;
};

export const createResults = <ThrowOnError extends boolean = false>(
  options?: Options<CreateResultsData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreateResultsResponses,
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
    url: "/chunking/{project_id}/docs/{doc_id}/results",
    ...options,
  });
};

/**
 * Read Results
 */
export type ReadResultsData = {
  body?: never;
  path: {
    project_id: string;
    doc_id: string;
  };
  query?: never;
  url: "/chunking/{project_id}/docs/{doc_id}/results";
};

export type ReadResultsResponses = {
  200: ResultsSpec;
};

export const readResults = <ThrowOnError extends boolean = false>(
  options?: Options<ReadResultsData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadResultsResponses,
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
    url: "/chunking/{project_id}/docs/{doc_id}/results",
    ...options,
  });
};