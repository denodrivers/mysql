import { ConsoleHandler, getLogger, setup } from "@std/log";
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

setup({
  handlers: {
    console: new ConsoleHandler("DEBUG"),
  },
  loggers: {
    // configure default logger available via short-hand methods above
    default: {
      level: "INFO",
      handlers: ["console"],
    },
    [MODULE_NAME]: {
      level: "INFO",
      handlers: ["console"],
    },
  },
});
