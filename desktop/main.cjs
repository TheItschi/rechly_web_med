/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const { existsSync, mkdirSync } = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { DatabaseSync, backup } = require("node:sqlite");

const isDevelopment = process.argv.includes("--dev");
let mainWindow = null;
let webProcess = null;
let appOrigin = null;

function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            const port = typeof address === "object" && address ? address.port : 0;
            server.close(() => resolve(port));
        });
    });
}

async function waitForServer(origin, timeoutMs = 45_000) {
    const deadline = Date.now() + timeoutMs;
    let lastError;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${origin}/api/desktop/health`);
            if (response.ok) return;
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(
        `The local Rechly server did not start in time.${
            lastError instanceof Error ? ` ${lastError.message}` : ""
        }`,
    );
}

async function startProductionServer() {
    const port = await getFreePort();
    const webRoot = path.join(process.resourcesPath, "web");
    const serverEntry = path.join(webRoot, "server.js");

    if (!existsSync(serverEntry)) {
        throw new Error(`Packaged web server is missing: ${serverEntry}`);
    }

    const dataDirectory = path.join(app.getPath("userData"), "data");
    mkdirSync(dataDirectory, { recursive: true });

    webProcess = spawn(process.execPath, [serverEntry], {
        cwd: webRoot,
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
            HOSTNAME: "127.0.0.1",
            PORT: String(port),
            RECHLY_DESKTOP: "1",
            RECHLY_DATA_DIR: dataDirectory,
            NEXT_PUBLIC_RECHLY_DESKTOP: "1",
            NEXT_PUBLIC_APPWRITE_ENDPOINT: "http://127.0.0.1/desktop",
            NEXT_PUBLIC_APPWRITE_PROJECT_ID: "desktop-local",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
    });

    webProcess.stdout?.on("data", (chunk) =>
        console.log(`[web] ${chunk.toString().trimEnd()}`),
    );
    webProcess.stderr?.on("data", (chunk) =>
        console.error(`[web] ${chunk.toString().trimEnd()}`),
    );
    webProcess.on("exit", (code, signal) => {
        if (!app.isQuitting) {
            console.error(`Rechly web process exited (${code ?? signal}).`);
        }
    });

    const origin = `http://127.0.0.1:${port}`;
    await waitForServer(origin);
    return origin;
}

function installApplicationMenu() {
    const template = [
        ...(process.platform === "darwin"
            ? [{ role: "appMenu", label: "Rechly" }]
            : []),
        {
            label: "File",
            submenu: [
                {
                    label: "Open Data Folder",
                    click: () =>
                        shell.openPath(path.join(app.getPath("userData"), "data")),
                },
                {
                    label: "Back Up Database…",
                    click: async () => {
                        const databasePath = path.join(
                            app.getPath("userData"),
                            "data",
                            "rechly.sqlite",
                        );
                        const date = new Date().toISOString().slice(0, 10);
                        const result = await dialog.showSaveDialog({
                            title: "Back Up Rechly Database",
                            defaultPath: path.join(
                                app.getPath("documents"),
                                `Rechly-backup-${date}.sqlite`,
                            ),
                            filters: [
                                { name: "SQLite database", extensions: ["sqlite"] },
                            ],
                        });
                        if (result.canceled || !result.filePath) return;

                        const source = new DatabaseSync(databasePath, {
                            readOnly: true,
                        });
                        try {
                            await backup(source, result.filePath);
                            await dialog.showMessageBox({
                                type: "info",
                                title: "Backup Complete",
                                message: "Your Rechly data was backed up successfully.",
                                detail: result.filePath,
                            });
                        } finally {
                            source.close();
                        }
                    },
                },
                { type: "separator" },
                process.platform === "darwin"
                    ? { role: "close" }
                    : { role: "quit" },
            ],
        },
        { role: "editMenu" },
        { role: "viewMenu" },
        { role: "windowMenu" },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow(origin) {
    const iconPath = app.isPackaged
        ? path.join(process.resourcesPath, "web", "public", "icon.png")
        : path.join(__dirname, "..", "public", "icon.png");
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 960,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        title: "Rechly",
        icon: iconPath,
        backgroundColor: "#f5f5f5",
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            plugins: true,
        },
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("blob:")) {
            return { action: "allow" };
        }
        if (url.startsWith("https://") || url.startsWith("mailto:")) {
            void shell.openExternal(url);
        }
        return { action: "deny" };
    });

    mainWindow.webContents.on("will-navigate", (event, url) => {
        if (url.startsWith("blob:")) return;
        if (!url.startsWith(origin)) {
            event.preventDefault();
            if (url.startsWith("https://") || url.startsWith("mailto:")) {
                void shell.openExternal(url);
            }
        }
    });

    mainWindow.once("ready-to-show", () => mainWindow?.show());
    await mainWindow.loadURL(`${origin}/dashboard`);
}

function stopProductionServer() {
    if (!webProcess || webProcess.killed) return;
    webProcess.kill();
    webProcess = null;
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (!mainWindow) return;
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    });

    app.whenReady().then(async () => {
        try {
            appOrigin = isDevelopment
                ? "http://127.0.0.1:3000"
                : await startProductionServer();
            installApplicationMenu();
            await createWindow(appOrigin);
        } catch (error) {
            console.error(error);
            dialog.showErrorBox(
                "Rechly could not start",
                error instanceof Error ? error.message : String(error),
            );
            app.quit();
        }

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0 && appOrigin) {
                void createWindow(appOrigin);
            }
        });
    });
}

app.on("before-quit", () => {
    app.isQuitting = true;
    stopProductionServer();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
