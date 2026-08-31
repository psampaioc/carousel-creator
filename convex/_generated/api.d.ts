/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as authz from "../authz.js";
import type * as candidates from "../candidates.js";
import type * as drafts from "../drafts.js";
import type * as driveMedia from "../driveMedia.js";
import type * as exportAttempts from "../exportAttempts.js";
import type * as exportRecords from "../exportRecords.js";
import type * as exports from "../exports.js";
import type * as images from "../images.js";
import type * as sheetImport from "../sheetImport.js";
import type * as sheetImportAction from "../sheetImportAction.js";
import type * as validation from "../validation.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  authz: typeof authz;
  candidates: typeof candidates;
  drafts: typeof drafts;
  driveMedia: typeof driveMedia;
  exportAttempts: typeof exportAttempts;
  exportRecords: typeof exportRecords;
  exports: typeof exports;
  images: typeof images;
  sheetImport: typeof sheetImport;
  sheetImportAction: typeof sheetImportAction;
  validation: typeof validation;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
