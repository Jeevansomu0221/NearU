/**
 * Live Eko settlement balance probe (read-only).
 * Usage: set env vars then run `npm run eko:probe` from backend/
 */
import "dotenv/config";
import { getEkoRuntimeConfig, probeEkoSettlementBalance } from "../src/services/eko.service";

const main = async () => {
  console.log("Eko config:", getEkoRuntimeConfig());
  const probe = await probeEkoSettlementBalance();
  console.log(JSON.stringify(probe, null, 2));
  process.exit(probe.ok ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
