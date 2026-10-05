/**
 * `pnpm validate:demo`: feeds a deliberately rogue KitDraft through
 * `validateKit` and prints the compliant result with every drop and repair
 * listed by reason. Offline, no keys.
 */
import { renderValidateDemo } from "./lib/validate-demo";

process.stdout.write(renderValidateDemo());
