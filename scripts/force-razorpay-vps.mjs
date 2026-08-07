import { Client } from "ssh2";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.VPS_HOST || "165.101.251.199";
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const envPath = process.env.VPS_ENV_FILE || path.join(__dirname, "../backend/.env");

if (!password) {
  console.error("VPS_PASSWORD is required");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
const conn = new Client();

const remoteCmd = [
  "set -euo pipefail",
  "cd /opt/vyaha/repo && git fetch --depth 1 origin main && git reset --hard origin/main",
  "rsync -a --delete /opt/vyaha/repo/backend/ /opt/vyaha/backend/ --exclude node_modules --exclude dist --exclude .env",
  "mv /tmp/vyaha-backend.env /opt/vyaha/backend/.env",
  "cd /opt/vyaha/backend",
  "npm ci",
  "npm run build",
  "pm2 delete vyaha-backend || true",
  "pm2 start dist/server.js --name vyaha-backend --cwd /opt/vyaha/backend --update-env",
  "pm2 save",
  "sleep 3",
  "grep -E '^(RAZORPAY_KEY_ID|API_BASE_URL)=' /opt/vyaha/backend/.env",
  "curl -fsS http://127.0.0.1:5000/health",
  "echo",
  "curl -fsS http://127.0.0.1:5000/health/razorpay",
  "echo",
  "curl -fsS https://api.vyaha.com/health/razorpay",
  "echo"
].join(" && ");

conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      const stream = sftp.createWriteStream("/tmp/vyaha-backend.env");
      stream.on("close", () => {
        conn.exec(remoteCmd, (e, stdout) => {
          if (e) {
            console.error(e);
            process.exit(1);
          }
          stdout.on("data", (d) => process.stdout.write(d));
          stdout.stderr.on("data", (d) => process.stderr.write(d));
          stdout.on("close", (code) => {
            conn.end();
            process.exit(code || 0);
          });
        });
      });
      stream.on("error", (writeErr) => {
        console.error(writeErr);
        process.exit(1);
      });
      stream.end(envContent);
    });
  })
  .on("error", (err) => {
    console.error("SSH error:", err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password, readyTimeout: 120000 });
