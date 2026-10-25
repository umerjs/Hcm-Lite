import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routes = [
  "login",
  "setup",
  "change-password",
  "dashboard",
  "organization",
  "employees",
  "attendance",
  "corrections",
  "leave",
  "payroll",
  "payslips",
  "announcements",
  "audit",
  "notifications",
  "profile",
  "unauthorized",
  "404",
];

const distDir = path.resolve(__dirname, "../dist");
const indexHtmlPath = path.join(distDir, "index.html");

if (!fs.existsSync(indexHtmlPath)) {
  console.error("dist/index.html not found! Run vite build first.");
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

// Also create 404.html in root of dist
fs.writeFileSync(path.join(distDir, "404.html"), indexHtml);

for (const route of routes) {
  // 1. Create [route].html (e.g. dist/login.html)
  const filePath = path.join(distDir, `${route}.html`);
  fs.writeFileSync(filePath, indexHtml);

  // 2. Create [route]/index.html (e.g. dist/login/index.html)
  const dirPath = path.join(distDir, route);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(path.join(dirPath, "index.html"), indexHtml);
}

console.log(`[postbuild] Generated static SPA entrypoints for ${routes.length} routes.`);
