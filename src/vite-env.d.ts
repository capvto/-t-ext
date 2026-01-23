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
      onMenuAction?: (cb: (action: string) => void) => () => void;
    };
  }
}

export {};
