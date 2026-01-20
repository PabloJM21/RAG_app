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

export type KeySpec = Array<Record<string, any>>;




/**
 * Create Key
 */
export type CreateKeyData = {
  body: KeySpec;
  path?: never;
  query?: never;
  url: "/api_keys/data";
};

export type CreateKeyResponses = {
  200: unknown;
};





export const createKey = <ThrowOnError extends boolean = false>(
  options?: Options<CreateKeyData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreateKeyResponses,
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
    url: "/api_keys/data",
    ...options,
  });
};








/**
 * Read Key
 */


export type ReadKeyData = {
  body?: never;
  path?: never;
  query?: never;
  url: "/api_keys/data";
};



export type ReadKeyResponses = {
  200: KeySpec;
};

export const readKey = <ThrowOnError extends boolean = false>(
  options?: Options<ReadKeyData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadKeyResponses,
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
    url: "/api_keys/data",
    ...options,
  });
};



/**
 * Delete Key
 */


export type DeleteKeyData = {
  body?: never;
  path: {
    key_id: string;
  };
  query?: never;
  url: "/api_keys/{key_id}";
};


export type DeleteKeyResponses = {
  200: unknown;
};

export type DeleteKeyErrors = {
  422: HttpValidationError;
};

export const deleteKey = <ThrowOnError extends boolean = false>(
  options: Options<DeleteKeyData, ThrowOnError>,
) => {
  return (options.client ?? client).delete<
    DeleteKeyResponses,
    DeleteKeyErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/api_keys/{key_id}",
    ...options,
  });
};