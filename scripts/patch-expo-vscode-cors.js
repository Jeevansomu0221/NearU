/**
 * Stop Expo CorsMiddleware from throwing on Cursor Simple Browser probes
 * (Origin: vscode-file://vscode-app). Those requests are ended early so Metro
 * does not attempt a web bundle for native-only apps.
 *
 * Safe to run multiple times. Invoked from app postinstall scripts.
 */
const fs = require("fs");
const path = require("path");

const MARKER = "/* nearu-vscode-cors-patch */";

const candidates = [
  path.join(
    process.cwd(),
    "node_modules",
    "expo",
    "node_modules",
    "@expo",
    "cli",
    "build",
    "src",
    "start",
    "server",
    "middleware",
    "CorsMiddleware.js"
  ),
  path.join(
    process.cwd(),
    "node_modules",
    "@expo",
    "cli",
    "build",
    "src",
    "start",
    "server",
    "middleware",
    "CorsMiddleware.js"
  )
];

const filePath = candidates.find((candidate) => fs.existsSync(candidate));
if (!filePath) {
  process.exit(0);
}

let source = fs.readFileSync(filePath, "utf8");
if (source.includes(MARKER)) {
  process.exit(0);
}

const needle = `return (req, res, next)=>{
        if (typeof req.headers.origin === 'string') {`;

const replacement = `return (req, res, next)=>{
        ${MARKER}
        if (typeof req.headers.origin === 'string' && req.headers.origin.startsWith('vscode-file:')) {
            res.statusCode = 204;
            res.end();
            return;
        }
        if (typeof req.headers.origin === 'string') {`;

if (!source.includes(needle)) {
  process.exit(0);
}

source = source.replace(needle, replacement);
fs.writeFileSync(filePath, source, "utf8");
console.log(`Patched Expo CORS for Cursor probes: ${path.relative(process.cwd(), filePath)}`);
