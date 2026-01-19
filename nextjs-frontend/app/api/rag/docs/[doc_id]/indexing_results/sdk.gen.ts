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

export type Errors = {
  422: HttpValidationError;
};


// Types for Results specification


type Item = {
  retrieval_id: number;
  title: string;
  content: string;
};

type LevelResult = {
  level: string;
  items: Item[];
};

export type ResultsSpec = LevelResult[]

/**
 * Create Results
 */
export type CreateResultsData = {
  body: ResultsSpec;
  path: {
    doc_id: string;
  };
  query?: never;
  url: "/indexing/{doc_id}/results";
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
    url: "/indexing/{doc_id}/results",
    ...options,
  });
};





/**
 * Read Results
 */


export type ReadResultsData = {
  body?: never;
  path: {
    doc_id: string;
  };
  query?: never;
  url: "/indexing/{doc_id}/results";
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
    url: "/indexing/{doc_id}/results",
    ...options,
  });
};


