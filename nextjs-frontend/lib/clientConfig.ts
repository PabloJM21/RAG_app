import { client } from "@/app/openapi-client/client.gen";

const configureClient = () => {
  const baseURL = process.env.API_BASE_URL ?? "http://localhost:8000";

  client.setConfig({
    baseURL: baseURL,
  });
};

configureClient();
