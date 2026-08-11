import { Client } from "ssh2";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.VPS_HOST || "165.101.251.199";
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;

if (!password) {
  console.error("VPS_PASSWORD is required");
  process.exit(1);
}

const conn = new Client();

const exec = (cmd) =>
  new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      stream
        .on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`Command failed (${code}): ${cmd}\n${stderr || stdout}`));
          } else {
            resolve(stdout);
          }
        })
        .on("data", (d) => {
          stdout += d;
          process.stdout.write(d);
        })
        .stderr.on("data", (d) => {
          stderr += d;
          process.stderr.write(d);
        });
    });
  });

conn
  .on("ready", async () => {
    try {
      console.log("Connected. Deploying vyaha.com website...");
      await exec(`mkdir -p /opt/vyaha/repo /var/www/vyaha`);
      await exec(
        `if [ ! -d /opt/vyaha/repo/.git ]; then git clone --depth 1 https://github.com/Jeevansomu0221/NearU.git /opt/vyaha/repo; else cd /opt/vyaha/repo && git fetch --depth 1 origin main && git reset --hard origin/main; fi`
      );
      await exec(`bash /opt/vyaha/repo/scripts/vps-deploy-website.sh`);
      await exec(`bash /opt/vyaha/repo/scripts/restore-website-ssl.sh`);
      await exec(`curl -fsS -H 'Host: www.vyaha.com' http://127.0.0.1/business/login | head -c 120`);
      console.log("\nWebsite deploy succeeded.");
      conn.end();
    } catch (e) {
      console.error("\nWebsite deploy failed:", e.message);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (err) => {
    console.error("SSH error:", err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password, readyTimeout: 120000 });
