import type { MenuItemConstructorOptions } from "electron";
import { app } from "electron";

export function buildAppMenu(
  createSettingsWindow: () => void,
): MenuItemConstructorOptions[] {
  const isMac = process.platform === "darwin";

  return [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Settings...",
                accelerator: "CommandOrControl+,",
                click: createSettingsWindow,
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    ...(!isMac
      ? [
          {
            label: "File",
            submenu: [
              {
                label: "Settings...",
                accelerator: "CommandOrControl+,",
                click: createSettingsWindow,
              },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
  ];
}
