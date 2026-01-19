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



/**
 * Reset:Forgot Password
 */

export type BodyAuthResetForgotPassword = {

  email: string;
};

export type ResetForgotPasswordData = {
  body: BodyAuthResetForgotPassword;
  path?: never;
  query?: never;
  url: "/auth/forgot-password";
};

export type ResetForgotPasswordResponses = {

  202: unknown;
};


export type ResetForgotPasswordErrors = {

  422: HttpValidationError;
};


export const resetForgotPassword = <ThrowOnError extends boolean = false>(
  options: Options<ResetForgotPasswordData, ThrowOnError>,
) => {
  return (options.client ?? client).post<
    ResetForgotPasswordResponses,
    ResetForgotPasswordErrors,
    ThrowOnError
  >({
    responseType: "json",
    url: "/auth/forgot-password",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};




/**
 * Reset:Reset Password
 */

export type BodyAuthResetResetPassword = {

  token: string;

  password: string;
};

export type ResetResetPasswordData = {
  body: BodyAuthResetResetPassword;
  path?: never;
  query?: never;
  url: "/auth/reset-password";
};



export type ResetResetPasswordResponses = {

  200: unknown;
};




export type ErrorModel = {

  detail:
    | string
    | {
        [key: string]: string;
      };
};


export type ResetResetPasswordErrors = {

  400: ErrorModel;

  422: HttpValidationError;
};


export const resetResetPassword = <ThrowOnError extends boolean = false>(
  options: Options<ResetResetPasswordData, ThrowOnError>,
) => {
  return (options.client ?? client).post<
    ResetResetPasswordResponses,
    ResetResetPasswordErrors,
    ThrowOnError
  >({
    responseType: "json",
    url: "/auth/reset-password",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};