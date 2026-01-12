import {
  type Options as ClientOptions,
  type Client,
  type TDataShape,
  urlSearchParamsBodySerializer, createClient, createConfig,
} from "@/app/openapi-client/client";

import {cookies} from "next/headers";
import {revalidatePath} from "next/cache";


export const client = createClient(
  createConfig<{
  baseURL: `${string}://openapi.json` | (string & {});
}>({
    baseURL: process.env.API_BASE_URL ?? "http://localhost:8000",
  })
);

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

export type CreatePipelineErrors = {
  422: HttpValidationError;
};



export const createPipeline = <ThrowOnError extends boolean = false>(
  options?: Options<CreatePipelineData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreatePipelineResponses,
    CreatePipelineErrors,
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

export type ReadPipelineErrors = {
  422: HttpValidationError;
};




export type ReadPipelineResponses = {
  200: PipelineSpec;
};

export const readPipeline = <ThrowOnError extends boolean = false>(
  options?: Options<ReadPipelineData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadPipelineResponses,
    ReadPipelineErrors,
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




