import { getLogger } from "@std/log";
import { MODULE_NAME } from "./meta.ts";

/**
 * Used for internal module logging,
 * do not import this directly outside of this module.
 *
 * @see {@link https://deno.land/std/log/mod.ts}
 */
export function logger() {
  return getLogger(MODULE_NAME);
}
