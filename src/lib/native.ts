/**
 * Android shell glue (Capacitor). Every export here is inert in the browser
 * build: the plugins are only imported on a real native platform, so the web
 * bundle keeps its size and behaviour.
 */
type BackHandler = () => boolean;

const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
export const isNative = !!cap?.isNativePlatform?.();

const handlers = new Set<BackHandler>();
let started = false;

/** Android hardware back: run handlers until one reports it consumed the press. */
export function onBack(handler: BackHandler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

function base64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Boot the native shell: back button, edge-to-edge class, external links, splash. */
export async function startNative() {
  if (!isNative || started) return;
  started = true;
  // The CSS uses this to reserve the status bar area when Android runs edge-to-edge.
  document.documentElement.classList.add("is-native");

  try {
    const [{ App }, { SplashScreen }] = await Promise.all([
      import("@capacitor/app"),
      import("@capacitor/splash-screen"),
    ]);

    await App.addListener("backButton", () => {
      for (const handler of handlers) if (handler()) return;
      void App.exitApp();
    });

    // Links that would normally open a browser tab: hand them to the system browser.
    document.addEventListener(
      "click",
      (event) => {
        const link = (event.target as Element | null)?.closest?.("a[href]");
        if (!link) return;
        const href = link.getAttribute("href") || "";
        if (!/^https?:\/\//i.test(href) || href.startsWith(location.origin)) return;
        event.preventDefault();
        window.open(href, "_system");
      },
      true,
    );

    // Give the boot screen a moment, then fade the native splash into the app.
    await new Promise((resolve) => requestAnimationFrame(() => window.setTimeout(resolve, 250)));
    await SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => null);
  } catch {
    /* A missing plugin should never keep the app from starting. */
  }
}

/** Keep the system bar icons readable against the app theme. */
export async function syncStatusBar(dark: boolean) {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
  } catch {
    /* Status bar is cosmetic. */
  }
}

/**
 * Save/share a generated file through the Android share sheet (Files, Drive,
 * chat apps…). Returns false in the browser, where the caller keeps its
 * download path.
 */
export async function shareFile(blob: Blob, name: string, title?: string) {
  if (!isNative) return false;
  try {
    const data = await base64(blob);
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const path = `share/${name}`;
    await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({ title, files: [uri], dialogTitle: "保存或分享到" });
  } catch {
    /* The sheet was dismissed; that is not an error. */
  }
  return true;
}
