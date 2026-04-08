import {
  type Options as ClientOptions,
  type Client,
  type TDataShape,
} from "@/app/api/custom-openapi-client/client";

import { client } from "@/app/api/custom-openapi-client/client.gen";
import {PipelineSpec} from "@/app/api/rag/docs/[doc_id]/conversion/sdk.gen";
import {ThemeName} from "@/components/frontend_data/themes";




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

export type ColorsSpec = Record<string, any>;





/**
 * Colors
 */
export type CreateColorsData = {
  body: ColorsSpec;
  path?: never;
  query?: never;
  url: "/settings/colors";
};

export type CreateColorsResponses = {
  200: unknown;
};





export const createColors = <ThrowOnError extends boolean = false>(
  options?: Options<CreateColorsData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreateColorsResponses,
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
    url: "/settings/colors",
    ...options,
  });
};



export type ReadColorsData = {
  body?: never;
  query?: never;
  url: "/settings/colors";
};


export type ReadColorsResponses = {
  200: ColorsSpec;
};

export const readColors = <ThrowOnError extends boolean = false>(
  options?: Options<ReadColorsData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadColorsResponses,
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
    url: "/settings/colors",
    ...options,
  });
};



/**
 * Themes
 */

export type ThemeSettings = {
  selectedTheme: ThemeName;
};

export type CreateThemesData = {
  body: ThemeSettings;
  path?: never;
  query?: never;
  url: "/settings/themes";
};

export type CreateThemesResponses = {
  200: unknown;
};





export const createThemes = <ThrowOnError extends boolean = false>(
  options?: Options<CreateThemesData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreateThemesResponses,
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
    url: "/settings/themes",
    ...options,
  });
};



export type ReadThemesData = {
  body?: never;
  query?: never;
  url: "/settings/themes";
};


export type ReadThemesResponses = {
  200: ThemeSettings;
};

export const readThemes = <ThrowOnError extends boolean = false>(
  options?: Options<ReadThemesData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadThemesResponses,
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
    url: "/settings/themes",
    ...options,
  });
};