import { AuthPluginCachingSha2Password } from "./caching_sha2_password.ts";

export { AuthPluginCachingSha2Password };

export const AuthPluginName = {
  CachingSha2Password: "caching_sha2_password",
} as const;
export type AuthPluginName = typeof AuthPluginName[keyof typeof AuthPluginName];

export const AuthPlugins = {
  caching_sha2_password: AuthPluginCachingSha2Password,
} as const;
