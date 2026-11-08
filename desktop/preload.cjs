const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("rechlyDesktop", {
    isDesktop: true,
    platform: process.platform,
    version: process.versions.electron,
});
