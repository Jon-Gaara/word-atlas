# 安卓 / Android

词光可以作为原生 Android 应用安装到手机上。图片、发音和音效全部打包进 APK，**安装后完全离线**，不需要服务器，也不需要账号。

## 方式一：GitHub Actions 出包（推荐）

仓库带有 `.github/workflows/android.yml`，不需要在本地装 Android SDK。

1. 在 GitHub 打开 **Actions → Android APK → Run workflow**。
2. 等任务跑完（首次约 20–40 分钟，主要是 640 MB 素材的复制和打包）。
3. 打开 **Releases → 词光 APK 最新构建**，下载 `app-debug.apk`。
4. 把 APK 传到手机安装（需要允许「安装未知来源应用」）。

每次手动触发都会重建这个叫 `apk-latest` 的 Release 并覆盖其中的 APK，所以仓库的 Release 列表不会被一堆构建刷屏。

> APK 挂在 Release 而不是 Actions 产物里：免费版账号的产物存储总共只有 500 MB，这个包约 640 MB，传不上去；Release 单个文件上限 2 GB。

打 tag 时（`git tag v1.0.0 && git push origin v1.0.0`）会额外建一个带版本号的正式 Release，APK 一起挂在里面。

## 方式二：本地打包

需要 **JDK 21** 和 **Android SDK**。不用装 Android Studio，命令行工具就够：

```powershell
# 1. 下载 commandline-tools 解压到 <SDK>\cmdline-tools\latest
# 2. 装平台和构建工具
sdkmanager --sdk_root=D:\program\android-sdk "platform-tools" "platforms;android-36" "build-tools;36.0.0"
# 3. 告诉 Gradle SDK 在哪
echo "sdk.dir=D:/program/android-sdk" > android/local.properties
```

`android/local.properties` 已经在 `.gitignore` 里，不会进仓库。装好之后：

```bash
npm ci
npm run android:apk        # 构建网页 → 同步进原生工程 → gradlew assembleDebug
```

脚本会自动在 `D:\program\jdk`、`C:\Program Files\Eclipse Adoptium` 等常见位置找 JDK 17+ 并临时写入 `JAVA_HOME`；一个都找不到时才会报错，那时手动设置一下即可：

```powershell
$env:JAVA_HOME = "D:\program\jdk\temurin-21.0.11+10"
```

产物：`android/app/build/outputs/apk/debug/app-debug.apk`（约 640 MB）。

用 IDE 的话，IntelliJ IDEA Ultimate 能打开 `android/` 这个 Gradle 工程并出包（需要先装 Android 插件和 SDK）；Community 版不行。用 Android Studio 打开后点 Run 也一样：

```bash
npm run android:sync   # 每次改了前端代码都要重新同步
npm run android:open   # 用 Android Studio / IDEA 打开原生工程
```

## 安装

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

或者把 APK 拷到手机，用文件管理器点开安装。手机需要预留约 1.5 GB 空间（APK + 解压后的应用）。

## 应用信息

| 项目 | 值 |
| :--- | :--- |
| 包名 | `tech.oxlei.wordatlas` |
| 应用名 | 词光 |
| 版本 | 见 `android/app/build.gradle` 的 `versionCode` / `versionName` |
| 最低系统 | Android 7.0（API 24） |
| 目标系统 | API 36 |

图标和启动屏由 `scripts/android-icons.py` 用 PIL 从 favicon 的指南针标志生成（`python scripts/android-icons.py`），改 Logo 时重新跑一次即可。

更新版本时同时改 `package.json` 和 `android/app/build.gradle` 的 `versionName`，并把 `versionCode` 加一，否则新包无法覆盖安装。

## 为什么是 640 MB

`public/atlas/` 里有 7,298 幅插画（185 MB）、22,905 段录音（366 MB）和缩略图（70 MB）。这个仓库版本把它们全部打进安装包，换来完全离线的体验。如果要上架应用商店或做小体积安装包，需要把媒体改成远程加载（商店单包上限 200 MB）。

## 原生能力

Web 版保持原样，下面这些只在 Android 壳里生效，代码在 `src/lib/native.ts`：

- **返回键**：先关搜索面板，再关词卡，再回到「今日」，最后才退出应用。
- **状态栏**：跟随深浅色主题；内容延伸到状态栏下方，用 `env(safe-area-inset-top)` 留出空间。
- **外链**：GitHub 等站外链接用系统浏览器打开，不会把应用变成浏览器。
- **分享 / 备份导出**：APK、学习备份 JSON、成绩卡通过系统分享面板保存到文件或发出去。
- **启动屏**：深色底 + 指南针标志，加载完成后淡出。

## 签名

默认构建的是 **debug** 包，用调试证书签名，可以直接安装，适合自用。如果以后要做正式签名包：

```bash
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias wordatlas
```

然后在 `android/app/build.gradle` 里配置 `signingConfigs.release`，把密码放在 `android/keystore.properties`（不要提交到仓库），再执行 `./gradlew assembleRelease`。正式包必须用同一个 keystore 签名才能覆盖安装。

## 常见问题

**打包时 Gradle 内存不足 / 很慢** — 640 MB 素材需要复制和压缩。`android/gradle.properties` 里已把堆内存设为 4 GB；磁盘至少留 3 GB 余量。

**素材没有更新** — 改了 `public/` 里的文件后要重新 `npm run android:sync`，只跑 `gradlew` 不会同步网页。

**装完打开是旧版本** — Android 会缓存 WebView 资源，改动版本号（`versionCode`）后重装。

**小米/Redmi 上 `adb install` 报 `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`** — 这是 MIUI 的「USB 安装」限制，不是包的问题。两个办法：开发者选项里打开「USB 调试（安全设置）/ USB 安装」（通常要登录小米账号并插卡），或者绕过它——把 APK 推进手机后自己点安装：

```bash
adb push android/app/build/outputs/apk/debug/app-debug.apk /sdcard/Download/
```

然后在手机「文件管理 → 下载」里点开，按提示允许「安装未知来源应用」即可。这条路不受上述限制。

**首次启动黑屏几秒** — WebView 要解压并加载词库索引与字体，之后会正常。
