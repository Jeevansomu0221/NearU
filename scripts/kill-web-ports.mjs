#!/usr/bin/env node
import { execSync } from "node:child_process";

const ports = [5173, 5174, 5175, 5176, 5177];

if (process.platform === "win32") {
  for (const port of ports) {
    try {
      execSync(
        `powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue; if ($c) { $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"`,
        { stdio: "ignore" }
      );
    } catch {
      // port already free
    }
  }
} else {
  for (const port of ports) {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore" });
    } catch {
      // port already free
    }
  }
}

console.log("Freed dev ports:", ports.join(", "));
