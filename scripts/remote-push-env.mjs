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

conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      const stream = sftp.createWriteStream("/opt/vyaha/backend/.env");
      stream.on("close", () => {
        conn.exec(
          "cd /opt/vyaha/repo && git fetch --depth 1 origin main && git reset --hard origin/main && rsync -a --delete backend/ /opt/vyaha/backend/ --exclude node_modules --exclude dist && cd /opt/vyaha/backend && npm ci && npm run build && pm2 restart vyaha-backend && sleep 2 && curl -fsS https://api.vyaha.com/health",
          (e, stdout) => {
            stdout.on("data", (d) => process.stdout.write(d));
            stdout.on("close", (code) => {
              conn.end();
              process.exit(code || 0);
            });
          }
        );
      });
      stream.end(envContent);
    });
  })
  .on("error", (err) => {
    console.error("SSH error:", err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password, readyTimeout: 90000 });
