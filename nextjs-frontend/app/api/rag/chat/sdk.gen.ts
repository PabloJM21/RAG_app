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




export type ChatHistoryMessage = {        // renamed from ChatMessage
  role: "user" | "assistant";
  content: string;
};

export type QuerySpec = {
  query: string;
  history?: ChatHistoryMessage[];
};

// Metadata table returned per dashboard item
export type ChunkMetadata = {
  Chunk: string[];
  Document: string[];
  Level: string[];
  Number: (string | number)[];
};

// One result entry in dashboard_list
export type DashboardEntry = {
  project: string;
  answer: string;
  time: number;
  score?: number;
  metadata: ChunkMetadata;
};

// Full API response
export type AnswerSpec = {
  ok: boolean;
  answer: string;                         // first item's answer (for chat bubble)
  sources?: string[];                     // first item's chunk snippets (for chat bubble)
  dashboard_list?: DashboardEntry[];      // full list for dashboard
};

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



