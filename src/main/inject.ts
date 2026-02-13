import type { WebContents } from "electron";
import { app } from "electron";
import fs from "fs";
import path from "path";

const YOUTUBE_DISTRACTION_FREE_CSS = `
  /* Hide Create button */
  #buttons > ytd-button-renderer:nth-child(1) {
    display: none !important;
  }
  
  /* Hide comments section */
  #comments {
    display: none !important;
  }
  
  /* Hide notifications bell and upload icons in header */
  ytd-topbar-menu-button-renderer {
    display: none !important;
  }
  
  /* Optional: Add subtle styling for a cleaner look */
  body {
    background-color: #0f0f0f !important;
    ytd-watch-flexy {
      padding-left: 16px !important;
    }
  }
`;

export function injectYouTubeAndRenderer(webContents: WebContents): void {
  webContents.insertCSS(YOUTUBE_DISTRACTION_FREE_CSS);

  try {
    const rendererPath = path.join(app.getAppPath(), "renderer_dist");
    const cssPath = path.join(rendererPath, "assets/index.css");
    const jsPath = path.join(rendererPath, "assets/index.js");

    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, "utf8");
      webContents.insertCSS(css);
      console.log("Injected React CSS");
    } else {
      console.warn("React CSS not found at:", cssPath);
    }

    if (fs.existsSync(jsPath)) {
      const js = fs.readFileSync(jsPath, "utf8");
      webContents
        .executeJavaScript(
          `
          if (!document.getElementById('root')) {
              const root = document.createElement('div');
              root.id = 'root';
              document.body.appendChild(root);
              console.log('Created #root for React');
          }
        `,
        )
        .then(() => {
          webContents.executeJavaScript(js);
          console.log("Injected React JS");
        })
        .catch((err) => console.error("Error executing JS:", err));
    } else {
      console.warn("React JS not found at:", jsPath);
    }
  } catch (e) {
    console.error("Failed to inject renderer:", e);
  }
}
