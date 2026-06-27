const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", ".mongo-data");
const mongodCandidates = [
  "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
  "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
  "mongod"
];

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

const mongod = mongodCandidates.find((candidate) => candidate === "mongod" || fs.existsSync(candidate));

if (!mongod) {
  console.error("mongod.exe not found. Install MongoDB or update scripts/start-mongo-dev.js");
  process.exit(1);
}

const child = spawn(
  mongod,
  ["--dbpath", dbPath, "--port", "27017", "--bind_ip", "127.0.0.1"],
  { stdio: "inherit", shell: mongod === "mongod" }
);

child.on("exit", (code) => process.exit(code ?? 0));
