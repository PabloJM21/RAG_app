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




export type KeyCreate = {
  base_key: string;
  api_key: string;
}


/**
 * Create Key
 */
export type CreateKeyData = {
  body: {
    base_key: string;
    api_key: string;
  };
  path?: never;
  query?: never;
  url: "/docs/api_keys/";
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
    url: "/docs/api_keys/",
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
  url: "/docs/api_keys/";
};


export type KeyRead = {
  key_id: string;
  base_key: string;
  api_key: string;
}

export type ReadKeyResponses = {
  200: Array<KeyRead>;
};

export const readKeyList = <ThrowOnError extends boolean = false>(
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
    url: "/docs/api_keys/",
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
  url: "/docs/api_keys/{key_id}";
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
    url: "/docs/api_keys/{key_id}",
    ...options,
  });
};










/**
 * Create Url for MCP Endpoint
 */
export type UrlRead = {

  mcp_url: string;

}


export type ReadUrlData = {
  body?: never;
  path?: never;
  query?: never;
  url: "/mcp/issue-url/";
};



export type ReadUrlResponses = {
  200: {
    mcp_url: string;
  };
};

export type ReadUrlErrors = {
  422: HttpValidationError;
};

export const readUrl = <ThrowOnError extends boolean = false>(
  options: Options<ReadUrlData, ThrowOnError>,
) => {
  return (options.client ?? client).post<
    ReadUrlResponses,
    ReadUrlErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/mcp/issue-url/",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};