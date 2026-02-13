import { contextBridge, ipcRenderer } from "electron";
import { exposeAPI } from "./api";
import * as constants from "./constants";
import { initMediaKeys } from "./mediaKeys";
import { bootstrapMiniPlayer } from "./miniPlayer";
import * as styles from "./styles";

console.log("exposing api");
exposeAPI(contextBridge, ipcRenderer);
console.log("exposing media keys");
initMediaKeys(ipcRenderer, constants);
console.log("preload index.ts loaded");
