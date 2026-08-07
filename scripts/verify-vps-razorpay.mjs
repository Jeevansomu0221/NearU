import { Client } from "ssh2";

const password = process.env.VPS_PASSWORD;
if (!password) {
  console.error("VPS_PASSWORD required");
  process.exit(1);
}

const cmd = [
  'grep -E "^(RAZORPAY|API_BASE|PLATFORM_UPI)" /opt/vyaha/backend/.env',
  'pm2 show vyaha-backend | grep -E "status|uptime|restarts" | head -n 10',
  "curl -fsS https://api.vyaha.com/health",
  "echo"
].join("; ");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        conn.end();
        process.exit(code || 0);
      });
    });
  })
  .on("error", (err) => {
    console.error("SSH error:", err.message);
    process.exit(1);
  })
  .connect({
    host: process.env.VPS_HOST || "165.101.251.199",
    port: 22,
    username: process.env.VPS_USER || "root",
    password,
    readyTimeout: 90000
  });
