#!/usr/bin/env node
/**
 * Build the Android APK locally:
 *   node scripts/android-apk.mjs            # web build + cap sync + assembleDebug
 *   node scripts/android-apk.mjs --skip-sync # reuse the last synced dist
 *
 * Needs a JDK 21 and the Android SDK (Android Studio is the easy way).
 * The APK is ~640 MB because every illustration and recording is bundled.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipSync = process.argv.includes("--skip-sync");
const win = process.platform === "win32";

const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: win });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

/**
 * Gradle refuses to start without JAVA_HOME on a fresh Windows terminal, so look
 * for a JDK 17+ in the usual install spots before giving up.
 */
const findJavaHome = () => {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  const javaBin = win ? "java.exe" : "java";
  const dirs = [
    "D:/program/jdk",
    "C:/Program Files/Eclipse Adoptium",
    "C:/Program Files/Java",
    path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Eclipse Adoptium"),
  ];
  for (const dir of dirs) {
    if (!dir || !fs.existsSync(dir)) continue;
    const found = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name))
      .filter((candidate) => fs.existsSync(path.join(candidate, "bin", javaBin)));
    const major = (candidate) => Number((path.basename(candidate).match(/\d+/) ?? [0])[0]);
    const picked = found.find((candidate) => major(candidate) >= 17) ?? found[0];
    if (picked) {
      process.env.JAVA_HOME = picked;
      console.log(`JAVA_HOME 自动识别为 ${picked}`);
      return picked;
    }
  }
  const onPath = spawnSync(win ? "where" : "which", ["java"], { shell: win, encoding: "utf8" });
  if (onPath.status === 0) return null;
  console.error(
    [
      "没有找到 JDK 21。先设置 JAVA_HOME 再重试，例如：",
      '  $env:JAVA_HOME = "D:\\program\\jdk\\temurin-21.0.11+10"',
      "  npm run android:apk",
    ].join("\n"),
  );
  process.exit(1);
};

findJavaHome();

if (!skipSync) {
  run("npm", ["run", "build"]);
  run("npx", ["cap", "sync", "android"]);
}

run(win ? "gradlew.bat" : "sh", win ? ["assembleDebug", "--no-daemon"] : ["./gradlew", "assembleDebug", "--no-daemon"], path.join(root, "android"));

const apk = path.join(root, "android/app/build/outputs/apk/debug/app-debug.apk");
if (!fs.existsSync(apk)) {
  console.error("APK 未生成，请检查上面的 Gradle 输出。");
  process.exit(1);
}
const mb = fs.statSync(apk).size / 1024 / 1024;
console.log(`\nAPK: ${apk} (${mb.toFixed(0)} MB)`);
console.log("安装到已连接的手机：adb install -r android\\app\\build\\outputs\\apk\\debug\\app-debug.apk");
