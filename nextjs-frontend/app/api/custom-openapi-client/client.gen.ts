import {Client, createClient, createConfig, Options as ClientOptions, TDataShape} from "./client";

export const client = createClient(
  createConfig<{
  baseURL: `${string}://openapi.json` | (string & {});
}>({
    baseURL: process.env.API_BASE_URL ?? "http://localhost:8000",
  })
);

