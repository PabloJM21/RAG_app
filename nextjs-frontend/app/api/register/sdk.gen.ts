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
 * Register:Register
 */


export type UserCreate = {

  email: string;

  password: string;

  is_active?: boolean | null;

  is_superuser?: boolean | null;

  is_verified?: boolean | null;
};



export type RegisterRegisterData = {
  body: UserCreate;
  path?: never;
  query?: never;
  url: "/auth/register";
};







export type UserRead = {

  id: string;

  email: string;

  is_active?: boolean;

  is_superuser?: boolean;

  is_verified?: boolean;
};




export type RegisterRegisterResponses = {

  201: UserRead;
};



export type ErrorModel = {

  detail:
    | string
    | {
        [key: string]: string;
      };
};


export type RegisterRegisterErrors = {

  400: ErrorModel;

  422: HttpValidationError;
};





export const registerRegister = <ThrowOnError extends boolean = false>(
  options: Options<RegisterRegisterData, ThrowOnError>,
) => {
  return (options.client ?? client).post<
    RegisterRegisterResponses,
    RegisterRegisterErrors,
    ThrowOnError
  >({
    responseType: "json",
    url: "/auth/register",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};
