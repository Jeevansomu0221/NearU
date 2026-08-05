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

const uploadEnv = () =>
  new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const remote = "/opt/vyaha/backend/.env";
      const stream = sftp.createWriteStream(remote);
      stream.on("close", resolve);
      stream.on("error", reject);
      stream.end(envContent);
    });
  });

conn
  .on("ready", async () => {
    try {
      console.log("Connected. Preparing server...");
      await exec(`mkdir -p /opt/vyaha/repo /opt/vyaha/backend`);
      await exec(
        `if [ ! -d /opt/vyaha/repo/.git ]; then git clone --depth 1 https://github.com/Jeevansomu0221/NearU.git /opt/vyaha/repo; else cd /opt/vyaha/repo && git fetch --depth 1 origin main && git reset --hard origin/main; fi`
      );
      await exec(
        `rsync -a --delete /opt/vyaha/repo/backend/ /opt/vyaha/backend/ --exclude node_modules --exclude dist`
      );
      console.log("Uploading .env...");
      await uploadEnv();
      console.log("Running deploy script...");
      await exec(`bash /opt/vyaha/repo/scripts/vps-deploy-backend.sh`);
      console.log("Verifying health endpoint...");
      await exec(`curl -fsS http://127.0.0.1/health`);
      console.log("\nDeploy succeeded.");
      conn.end();
    } catch (e) {
      console.error("\nDeploy failed:", e.message);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (err) => {
    console.error("SSH error:", err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password, readyTimeout: 60000 });
