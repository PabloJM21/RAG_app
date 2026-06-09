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







/**
 * Query
 */




export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type QuerySpec = {
  query: string;
  history?: ChatMessage[];
};

export type AnswerSpec = Record<string, any>;

export type runQueryData = {
  body: QuerySpec;
  path?: never;
  query?: never;
  url: "/chat/generator";
};

export type runQueryResponses = {
  200: AnswerSpec;
};

export const runQuery = <
  ThrowOnError extends boolean = false,
>(
  options?: Options<
    runQueryData,
    ThrowOnError
  >,
) => {
  return (
    options?.client ?? client
  ).post<
    runQueryResponses,
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
    url: "/chat/generator",
    ...options,
  });
};



