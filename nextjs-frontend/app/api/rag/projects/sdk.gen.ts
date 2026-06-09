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
  client?: Client;
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

export type EvaluatorSpec = Record<string, any>;


/**
 * Projects
 */


/**
 * Export Project
 */
export type ProjectExportSpec = {
  project_id: string;
  name: string;
};

export type ProjectExportData = {
  path?: never;
  body: ProjectExportSpec;
  query?: never;
  url: "/projects/export/";
};

export type ProjectExportResponses = {
  200: unknown;
};

export type ProjectExportErrors = {
  422: HttpValidationError;
};

export const exportProjectSDK = <ThrowOnError extends boolean = false>(
  options: Options<ProjectExportData, ThrowOnError>
) => {
  return (options.client ?? client).post<
    ProjectExportResponses,
    ProjectExportErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/projects/export/",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};





/**
 * Load Project
 */
export type ProjectLoadSpec = {
  source_id: string;
  target_id: string;
};

export type ProjectLoadData = {
  path?: never;
  body: ProjectLoadSpec;
  query?: never;
  url: "/projects/load/";
};

export type ProjectLoadResponses = {
  200: unknown;
};

export type ProjectLoadErrors = {
  422: HttpValidationError;
};

export const loadProjectSDK = <ThrowOnError extends boolean = false>(
  options: Options<ProjectLoadData, ThrowOnError>
) => {
  return (options.client ?? client).post<
    ProjectLoadResponses,
    ProjectLoadErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/projects/load/",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};


/**
 * Delete Project
 */
export type DeleteProjectData = {
  body?: never;
  path: {
    project_id: string;
  };
  query?: never;
  url: "/projects/{project_id}";
};

export type DeleteProjectResponses = {
  200: unknown;
};

export type DeleteProjectErrors = {
  422: HttpValidationError;
};

export const deleteProject = <ThrowOnError extends boolean = false>(
  options: Options<DeleteProjectData, ThrowOnError>,
) => {
  return (options.client ?? client).delete<
    DeleteProjectResponses,
    DeleteProjectErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/projects/{project_id}",
    ...options,
  });
};


/**
 * Create Project
 */
export type CreateProjectData = {
  body?: never;
  path?: never;
  query?: never;
  url: "/projects/";
};

export type CreateProjectResponses = {
  200: {
    project_id: string;
    name: string;
  };
};

export type CreateProjectErrors = {
  422: HttpValidationError;
};

export const createProject = <ThrowOnError extends boolean = false>(
  options?: Options<CreateProjectData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreateProjectResponses,
    CreateProjectErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/projects/",
    ...options,
  });
};


/**
 * Set Project
 */
export type SetProjectData = {
  body?: never;
  path: {
    project_id: string;
  };
  query?: never;
  url: "/projects/set/{project_id}";
};

export type SetProjectResponses = {
  200: unknown;
};

export type SetProjectErrors = {
  422: HttpValidationError;
};

export const setProject = <ThrowOnError extends boolean = false>(
  options: Options<SetProjectData, ThrowOnError>,
) => {
  return (options.client ?? client).post<
    SetProjectResponses,
    SetProjectErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/projects/set/{project_id}",
    ...options,
  });
};




/**
 * List Saved Projects
 */




export type ProjectListErrors = {
  422: HttpValidationError;
};
export type ProjectRead = {
  project_id: string;
  name: string;
};

export type ProjectListResponses = {
  200: Array<ProjectRead>;
};



export type ProjectSavedListData = {
  path?: never;
  body?: never;
  query?: never;
  url: "/projects/list/saved/";
};


export const listSavedProjectsSDK = <ThrowOnError extends boolean = false>(
  options: Options<ProjectSavedListData, ThrowOnError>
) => {
  return (options.client ?? client).get<
    ProjectListResponses,
    ProjectListErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/projects/list/saved/",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};


export type ProjectExportedListData = {
  path?: never;
  body?: never;
  query?: never;
  url: "/projects/list/exported/";
};



export const listExportedProjectsSDK = <ThrowOnError extends boolean = false>(
  options: Options<ProjectExportedListData, ThrowOnError>
) => {
  return (options.client ?? client).get<
    ProjectListResponses,
    ProjectListErrors,
    ThrowOnError
  >({
    responseType: "json",
    security: [
      {
        scheme: "bearer",
        type: "http",
      },
    ],
    url: "/projects/list/exported/",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};



/**
 * Evaluator
 */

export type CreateEvaluatorData = {
  body: EvaluatorSpec;
  path?: never;
  query?: never;
  url: "/projects/evaluator/";
};

export type CreateEvaluatorResponses = {
  200: unknown;
};

export const createEvaluator = <ThrowOnError extends boolean = false>(
  options?: Options<CreateEvaluatorData, ThrowOnError>,
) => {
  return (options?.client ?? client).post<
    CreateEvaluatorResponses,
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
    url: "/projects/evaluator/",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
};

export type ReadEvaluatorData = {
  body?: never;
  path?: never;
  query?: never;
  url: "/projects/evaluator/";
};

export type ReadEvaluatorResponses = {
  200: EvaluatorSpec;
};

export const readEvaluator = <ThrowOnError extends boolean = false>(
  options?: Options<ReadEvaluatorData, ThrowOnError>,
) => {
  return (options?.client ?? client).get<
    ReadEvaluatorResponses,
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
    url: "/projects/evaluator/",
    ...options,
  });
};