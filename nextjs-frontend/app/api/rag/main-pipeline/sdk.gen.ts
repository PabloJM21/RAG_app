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



type MethodSpec = Record<string, any>;

export type PipelineSpec = {
  router: MethodSpec;
  reranker: MethodSpec;
  generator: MethodSpec;
};

export type Errors = {
  422: HttpValidationError;
};



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
 * Create Pipeline
 */
export type CreatePipelineData = {
  body: PipelineSpec;
  path?: never;
  query?: never;
  url: "/docs/";
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
    url: "/main-pipeline/pipeline/data",
    ...options,
  });
};








/**
 * Read Pipeline
 */


export type ReadPipelineData = {
  body?: never;
  path?: never;
  query?: never;
  url: "/main-pipeline/pipeline/data";
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
    url: "/main-pipeline/pipeline/data",
    ...options,
  });
};




