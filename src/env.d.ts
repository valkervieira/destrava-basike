/// <reference types="vite/client" />

// File System Access API (Chromium only), not yet in every TS DOM lib version
interface Window {
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
}
