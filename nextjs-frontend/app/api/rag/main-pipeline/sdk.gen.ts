import {
  type Options as ClientOptions,
  type Client,
  type TDataShape,
} from "@/app/api/custom-openapi-client/client";

import { client } from "@/app/api/custom-openapi-client/client.gen";
import {PipelineSpec} from "@/app/api/rag/docs/[doc_id]/conversion/sdk.gen";




export type Options<
  TData extends TDataShape = TDataShape,
  ThrowOnError extends boolean = boolean,
> = ClientOptions<TData, ThrowOnError> & {
  /**
   * You can provide a client instance returned by `createClient()` instead of
   * individual options. This might be also useful if you want to implement a
   * custom client.
   */
  client?: Client;
  /**
   * You can pass arbitrary values through the `meta` object. This can be
   * used to access values that aren't defined as part of the SDK function.
   */
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
    stage: string;
  };
  query?: never;
  url: "/{stage}/run";
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
    url: "/{stage}/run",
    ...options,
  });
};


/**
 * Generator
 */
export type CreateGeneratorData = {
  body: GeneratorSpec;
  path?: never;
  query?: never;
  url: "/main-pipeline/generator";
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
    url: "/main-pipeline/generator",
    ...options,
  });
};



export type ReadGeneratorData = {
  body?: never;
  query?: never;
  url: "/main-pipeline/generator";
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
    url: "/main-pipeline/generator",
    ...options,
  });
};

/**
 * Retrievers
 */
export type CreateRetrieversData = {
  body: RetrieversSpec;
  path?: never;
  query?: never;
  url: "/main-pipeline/retrievers";
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
    url: "/main-pipeline/retrievers",
    ...options,
  });
};




export type ReadRetrieversData = {
  body?: never;
  query?: never;
  url: "/main-pipeline/retrievers";
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
    url: "/main-pipeline/retrievers",
    ...options,
  });
};






