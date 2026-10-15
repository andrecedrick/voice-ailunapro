import packageJson from "../../package.json";

/**
 * The version Voice AiLunaPro shows its own users.
 *
 * It counts this product's releases, not Dograh's: 1.1 is the first public
 * build, and it moves when we ship — a rebrand, a billing change, a new page —
 * whether or not the upstream version moved with it.
 *
 * Bump this by hand in the same commit that ships the change.
 */
export const VOICE_VERSION = "1.1";

/**
 * The Dograh release this build sits on, read from package.json so it tracks
 * the upstream merge automatically.
 *
 * Kept separate from VOICE_VERSION because it is what the "a newer release is
 * out" check has to compare against: comparing our own 1.1 to Dograh's 1.49.0
 * would report the app as permanently out of date.
 */
export const UPSTREAM_VERSION = packageJson.version || "dev";
