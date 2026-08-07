import { Client } from "ssh2";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.VPS_HOST || "165.101.251.199";
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const envPath = process.env.VPS_ENV_FILE || path.join(__dirname, "../backend/.env");
const setupScriptPath = path.join(__dirname, "setup-api-domain.sh");

if (!password) {
  console.error("VPS_PASSWORD is required");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
const setupScript = fs.readFileSync(setupScriptPath, "utf8");
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

const uploadFile = (remotePath, content) =>
  new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const stream = sftp.createWriteStream(remotePath);
      stream.on("close", resolve);
      stream.on("error", reject);
      stream.end(content);
    });
  });

conn
  .on("ready", async () => {
    try {
      console.log("Connected. Uploading setup script and .env...");
      await uploadFile("/tmp/setup-api-domain.sh", setupScript);
      await uploadFile("/opt/vyaha/backend/.env", envContent);
      await exec("chmod +x /tmp/setup-api-domain.sh && bash /tmp/setup-api-domain.sh");
      console.log("Restarting backend...");
      await exec("cd /opt/vyaha/backend && pm2 restart vyaha-backend || pm2 start dist/server.js --name vyaha-backend --cwd /opt/vyaha/backend");
      await exec("pm2 save");
      console.log("Verifying endpoints...");
      await exec("curl -fsS http://127.0.0.1/health");
      await exec("curl -fsS https://api.vyaha.com/health");
      console.log("\nAPI domain setup succeeded.");
      conn.end();
    } catch (e) {
      console.error("\nSetup failed:", e.message);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (err) => {
    console.error("SSH error:", err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password, readyTimeout: 90000 });
