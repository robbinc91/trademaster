// src/utils/jsonStorage.ts
// Simple JSON file storage without encryption

const electron = (window as any).electron;

// Default auto-save file name
const INTERNALS_FILE = '__internals.tmd';

// Cached userData path
let cachedUserDataPath: string | null = null;

export const jsonStorage = {
  /**
   * Get the userData path (via exposed Electron API)
   * Caches the result after first call
   */
  getUserDataPath: async (): Promise<string | null> => {
    if (!electron) return null;
    
    // Return cached path if available
    if (cachedUserDataPath) return cachedUserDataPath;
    
    try {
      // Call the exposed method that uses IPC
      cachedUserDataPath = await electron.getUserDataPath();
      return cachedUserDataPath;
    } catch (err) {
      console.error("Failed to get userData path:", err);
      return null;
    }
  },

  /**
   * Get the path to the auto-save file in the app's userData directory
   */
  getInternalsPath: async (): Promise<string | null> => {
    const userDataPath = await jsonStorage.getUserDataPath();
    if (!userDataPath || !electron?.path?.join) return null;
    return electron.path.join(userDataPath, INTERNALS_FILE);
  },

  /**
   * Save data to a specific file
   */
  saveToFile: (filePath: string, data: any): boolean => {
    if (!electron) {
      console.warn("Electron environment not available");
      return false;
    }
    try {
      const jsonString = JSON.stringify(data, null, 2);
      electron.fs.writeFileSync(filePath, jsonString);
      return true;
    } catch (err) {
      console.error("Save failed:", err);
      throw err;
    }
  },

  /**
   * Load data from a specific file
   */
  loadFromFile: (filePath: string): any | null => {
    if (!electron) {
      console.warn("Electron environment not available");
      return null;
    }
    try {
      const fileContent = electron.fs.readFileSync(filePath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      return parsedContent;
    } catch (err) {
      console.error("Load Error:", err);
      throw err;
    }
  },

  /**
   * Auto-save to __internals.tmd in userData directory
   * Called automatically on every data change
   */
  autoSave: async (data: any): Promise<boolean> => {
    const internalsPath = await jsonStorage.getInternalsPath();
    if (!internalsPath) return false;
    
    try {
      const jsonString = JSON.stringify(data, null, 2);
      electron.fs.writeFileSync(internalsPath, jsonString);
      return true;
    } catch (err) {
      console.error("Auto-save failed:", err);
      return false;
    }
  },

  /**
   * Auto-load from __internals.tmd in userData directory
   * Called on app startup before any other file operations
   */
  autoLoad: async (): Promise<any | null> => {
    const internalsPath = await jsonStorage.getInternalsPath();
    if (!internalsPath) return null;

    try {
      if (!electron.fs.existsSync(internalsPath)) {
        console.log("No __internals.tmd file found, starting fresh");
        return null;
      }
      
      const fileContent = electron.fs.readFileSync(internalsPath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      console.log("Auto-loaded from __internals.tmd");
      return parsedContent;
    } catch (err) {
      console.error("Auto-load failed:", err);
      return null;
    }
  },

  /**
   * Check if __internals.tmd exists
   */
  hasInternalsFile: async (): Promise<boolean> => {
    const internalsPath = await jsonStorage.getInternalsPath();
    if (!internalsPath) return false;
    return electron.fs.existsSync(internalsPath);
  }
};