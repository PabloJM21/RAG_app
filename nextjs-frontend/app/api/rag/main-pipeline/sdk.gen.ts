import {
  type Options as ClientOptions,
  type Client,
  type TDataShape,
} from "@/app/api/custom-openapi-client/client";

import { client } from "@/app/api/custom-openapi-client/client.gen";

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

export type GeneratorSpec = Record<string, any>;
export type RetrieversSpec = Array<Record<string, any>>;

/**
 * Run Pipeline
 */
export type runPipelineData = {
  body?: never;
  path: {
    project_id: string;
    stage: string;
  };
  query?: never;
  url: "/{stage}/{project_id}/run";
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
    url: "/{stage}/{project_id}/run",
    ...options,
  });
};

/**
 * Generator
 */
export type CreateGeneratorData = {
  body: GeneratorSpec;
  path: {
    project_id: string;
  };
  query?: never;
  url: "/main-pipeline/{project_id}/generator/";
};

export type CreateGeneratorResponses = {
  200: unknown;
};

export const createGenerator = <ThrowOnError extends boolean = false>(
  options?: Options<CreateGeneratorData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreateGeneratorResponses,
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
    url: "/main-pipeline/{project_id}/generator/",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
};

export type ReadGeneratorData = {
  body?: never;
  path: {
    project_id: string;
  };
  query?: never;
  url: "/main-pipeline/{project_id}/generator/";
};

export type ReadGeneratorResponses = {
  200: GeneratorSpec;
};

export const readGenerator = <ThrowOnError extends boolean = false>(
  options?: Options<ReadGeneratorData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadGeneratorResponses,
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
    url: "/main-pipeline/{project_id}/generator/",
    ...options,
  });
};

/**
 * Retrievers
 */
export type CreateRetrieversData = {
  body: RetrieversSpec;
  path: {
    project_id: string;
  };
  query?: never;
  url: "/main-pipeline/{project_id}/retrievers/";
};

export type CreateRetrieversResponses = {
  200: unknown;
};

export const createRetrievers = <ThrowOnError extends boolean = false>(
  options?: Options<CreateRetrieversData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreateRetrieversResponses,
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
    url: "/main-pipeline/{project_id}/retrievers/",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
};

export type ReadRetrieversData = {
  body?: never;
  path: {
    project_id: string;
  };
  query?: never;
  url: "/main-pipeline/{project_id}/retrievers/";
};

export type ReadRetrieversResponses = {
  200: RetrieversSpec;
};

export const readRetrievers = <ThrowOnError extends boolean = false>(
  options?: Options<ReadRetrieversData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadRetrieversResponses,
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
    url: "/main-pipeline/{project_id}/retrievers/",
    ...options,
  });
};