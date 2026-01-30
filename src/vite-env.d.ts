/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI?: {
      platform?: string;
      menuEventName?: string;
      openMarkdown: () => Promise<{ filePath: string; content: string } | null>;
      saveMarkdown: (
        suggestedName: string,
        content: string
      ) => Promise<{ filePath: string } | null>;
      kvGet?: (key: string) => Promise<string | null>;
      kvSet?: (key: string, value: string) => Promise<boolean>;
      kvDel?: (key: string) => Promise<boolean>;
      onMenuAction?: (cb: (action: string) => void) => () => void;
    };
  }
}

export {};
