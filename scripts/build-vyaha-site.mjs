#!/usr/bin/env node
/**
 * Builds vyaha.com unified deploy folder:
 *   dist/                 -> vyaha-official (marketing + legal)
 *   dist/order/           -> customer-web
 *   dist/business/        -> partner-web
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const run = (cwd, cmd) => {
  console.log(`\n> ${cmd} (${path.relative(root, cwd)})`);
  execSync(cmd, { cwd, stdio: "inherit", env: process.env });
};

const dist = path.join(root, "vyaha-official", "dist");
const marketingDist = path.join(root, "vyaha-official", ".build-marketing");

rmSync(dist, { recursive: true, force: true });
rmSync(marketingDist, { recursive: true, force: true });

run(path.join(root, "packages", "api-client"), "npm run build");

run(path.join(root, "vyaha-official"), "npm run build");
cpSync(path.join(root, "vyaha-official", "dist"), marketingDist, { recursive: true });

run(path.join(root, "apps", "customer-web"), "npm run build");
run(path.join(root, "apps", "partner-web"), "npm run build");

mkdirSync(dist, { recursive: true });
cpSync(marketingDist, dist, { recursive: true });
cpSync(path.join(root, "apps", "customer-web", "dist"), path.join(dist, "order"), { recursive: true });
cpSync(path.join(root, "apps", "partner-web", "dist"), path.join(dist, "business"), { recursive: true });
rmSync(marketingDist, { recursive: true, force: true });

console.log("\nUnified site ready at vyaha-official/dist");
