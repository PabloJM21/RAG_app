
import {
  type Options as ClientOptions,
  type Client,
  type TDataShape,
  urlSearchParamsBodySerializer,
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


/**
 * Auth:Jwt.Login
 */




export type Login = {

  grant_type?: string | null;

  username: string;

  password: string;

  scope?: string;

  client_id?: string | null;

  client_secret?: string | null;
};


export type AuthJwtLoginData = {
  body: Login;
  path?: never;
  query?: never;
  url: "/auth/jwt/login";
};




export type BearerResponse = {

  access_token: string;

  token_type: string;
};

export type AuthJwtLoginResponses = {

  200: BearerResponse;
};



export type ErrorModel = {

  detail:
    | string
    | {
        [key: string]: string;
      };
};

export type AuthJwtLoginErrors = {

  400: ErrorModel;

  422: HttpValidationError;
};



export const authJwtLogin = <ThrowOnError extends boolean = false>(
  options: Options<AuthJwtLoginData, ThrowOnError>,
) => {
  return (options.client ?? client).post<
    AuthJwtLoginResponses,
    AuthJwtLoginErrors,
    ThrowOnError
  >({
    ...urlSearchParamsBodySerializer,
    responseType: "json",
    url: "/auth/jwt/login",
    ...options,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...options.headers,
    },
  });
};




/**
 * Auth:Jwt.Logout
 */




export type AuthJwtLogoutData = {
  body?: never;
  path?: never;
  query?: never;
  url: "/auth/jwt/logout";
};

export type AuthJwtLogoutResponses = {

  200: unknown;
};



export type AuthJwtLogoutErrors = {
  /**
   * Missing token or inactive user.
   */
  401: unknown;
};


export const authJwtLogout = <ThrowOnError extends boolean = false>(
  options?: Options<AuthJwtLogoutData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    AuthJwtLogoutResponses,
    AuthJwtLogoutErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/auth/jwt/logout",
    ...options,
  });
};