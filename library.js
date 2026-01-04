/**
 * C64 Cataloger - Local Library Manager
 * Handles organizing games into a structured local library folder
 */

const Library = {
    // Library state
    enabled: false,
    directoryHandle: null,

    // Type folder names mapping
    TYPE_FOLDERS: {
        '.d64': 'Disk',
        '.tap': 'Tape',
        '.crt': 'Cart'
    },

    /**
     * Initialize library from stored settings
     */
    init() {
        // Library handle cannot be persisted across sessions
        // User will need to re-select the folder on each session
        this.enabled = false;
        this.directoryHandle = null;
    },

    /**
     * Pick a directory for the local library
     * @returns {Promise<FileSystemDirectoryHandle|null>}
     */
    async pickLibraryFolder() {
        if (!('showDirectoryPicker' in window)) {
            throw new Error('File System Access API not supported');
        }

        try {
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });

            this.enabled = true;
            return this.directoryHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                return null; // User cancelled
            }
            throw error;
        }
    },

    /**
     * Check if library is available and ready
     * @returns {boolean}
     */
    isAvailable() {
        return this.enabled && this.directoryHandle !== null;
    },

    /**
     * Get the library folder name for display
     * @returns {string}
     */
    getLibraryName() {
        return this.directoryHandle ? this.directoryHandle.name : '';
    },

    /**
     * Get the folder name for a file type
     * @param {string} extension - File extension (.d64, .tap, .crt)
     * @returns {string} Folder name
     */
    getTypeFolderName(extension) {
        return this.TYPE_FOLDERS[extension.toLowerCase()] || 'Other';
    },

    /**
     * Get the letter folder for a game name
     * @param {string} gameName - The game name
     * @returns {string} Single letter (A-Z) or # for numbers/symbols
     */
    getLetterFolder(gameName) {
        const firstChar = gameName.trim().charAt(0).toUpperCase();
        if (/[A-Z]/.test(firstChar)) {
            return firstChar;
        }
        return '#';
    },

    /**
     * Sanitize a string for use as a folder/file name
     * @param {string} name - The name to sanitize
     * @returns {string} Safe folder/file name
     */
    sanitizeName(name) {
        return name
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
            .replace(/\s+/g, ' ')          // Collapse whitespace
            .trim()
            .substring(0, 100);            // Limit length
    },

    /**
     * Get or create a subdirectory
     * @param {FileSystemDirectoryHandle} parent - Parent directory
     * @param {string} name - Subdirectory name
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
    async getOrCreateDirectory(parent, name) {
        return await parent.getDirectoryHandle(name, { create: true });
    },

    /**
     * Add a file to the library
     * @param {Object} fileInfo - File information
     * @param {ArrayBuffer|Blob} fileData - The file data to write
     * @param {string} gameName - The game name for folder organization
     * @param {string} extension - File extension
     * @returns {Promise<Object>} Object with libraryPath info
     */
    async addToLibrary(fileInfo, fileData, gameName, extension) {
        if (!this.isAvailable()) {
            throw new Error('Library not available');
        }

        const typeFolder = this.getTypeFolderName(extension);
        const letterFolder = this.getLetterFolder(gameName);
        const gameFolder = this.sanitizeName(gameName);
        const filename = this.sanitizeName(fileInfo.name ||
            `${gameFolder}${extension}`);

        try {
            // Create folder structure: Type/Letter/GameName/
            const typeDir = await this.getOrCreateDirectory(
                this.directoryHandle, typeFolder);
            const letterDir = await this.getOrCreateDirectory(
                typeDir, letterFolder);
            const gameDir = await this.getOrCreateDirectory(
                letterDir, gameFolder);

            // Create the file
            const fileHandle = await gameDir.getFileHandle(filename,
                { create: true });
            const writable = await fileHandle.createWritable();

            // Write data
            if (fileData instanceof ArrayBuffer) {
                await writable.write(new Blob([fileData]));
            } else {
                await writable.write(fileData);
            }
            await writable.close();

            // Return the library path info
            return {
                libraryPath: `${typeFolder}/${letterFolder}/${gameFolder}/${filename}`,
                typeFolder,
                letterFolder,
                gameFolder,
                filename
            };
        } catch (error) {
            console.error('Error adding file to library:', error);
            throw error;
        }
    },

    /**
     * Read a file from the library
     * @param {string} libraryPath - Path within the library
     * @returns {Promise<File>} The file
     */
    async getFile(libraryPath) {
        if (!this.isAvailable()) {
            throw new Error('Library not available');
        }

        const parts = libraryPath.split('/');
        let current = this.directoryHandle;

        // Navigate to the file
        for (let i = 0; i < parts.length - 1; i++) {
            current = await current.getDirectoryHandle(parts[i]);
        }

        const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
        return await fileHandle.getFile();
    },

    /**
     * Get library statistics
     * @returns {Promise<Object>} Stats object with counts and size
     */
    async getStats() {
        if (!this.isAvailable()) {
            return { gameCount: 0, totalSize: 0 };
        }

        let gameCount = 0;
        let totalSize = 0;

        try {
            // Count files in each type folder
            for (const typeFolder of Object.values(this.TYPE_FOLDERS)) {
                try {
                    const typeDir = await this.directoryHandle
                        .getDirectoryHandle(typeFolder);
                    const stats = await this._countFilesRecursive(typeDir);
                    gameCount += stats.count;
                    totalSize += stats.size;
                } catch (e) {
                    // Folder doesn't exist yet, skip
                }
            }
        } catch (error) {
            console.error('Error getting library stats:', error);
        }

        return { gameCount, totalSize };
    },

    /**
     * Recursively count files and total size
     * @private
     */
    async _countFilesRecursive(dirHandle) {
        let count = 0;
        let size = 0;

        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                const subStats = await this._countFilesRecursive(entry);
                count += subStats.count;
                size += subStats.size;
            } else if (entry.kind === 'file') {
                const file = await entry.getFile();
                // Only count C64 files
                if (/\.(d64|tap|crt)$/i.test(file.name)) {
                    count++;
                    size += file.size;
                }
            }
        }

        return { count, size };
    },

    /**
     * Format bytes to human readable string
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    /**
     * Generate a manifest for export (to recreate library on import)
     * @returns {Object} Library manifest
     */
    generateManifest() {
        return {
            libraryName: this.getLibraryName(),
            enabled: this.enabled,
            structure: 'Type/Letter/GameName/file',
            typeFolders: this.TYPE_FOLDERS
        };
    },

    /**
     * Disable the library
     */
    disable() {
        this.enabled = false;
        this.directoryHandle = null;
    }
};

// Initialize on load
Library.init();

// Export for use in other modules
window.Library = Library;
