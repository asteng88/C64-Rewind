/**
 * C64 Cataloger - File Scanner Module
 * Handles recursive directory scanning, ZIP extraction, and duplicate detection
 */

const Scanner = {
    // Supported file extensions
    SUPPORTED_EXTENSIONS: ['.d64', '.tap', '.crt'],

    // ZIP file extension
    ZIP_EXTENSION: '.zip',

    // Maximum ZIP nesting depth
    MAX_ZIP_DEPTH: 3,

    // Patterns to strip from filenames for comparison
    STRIP_PATTERNS: [
        /\[.*?\]/g,           // [a], [crack], [!], etc.
        /\(.*?\)/g,           // (Year), (Publisher), etc.
        /_v\d+/gi,            // Version numbers like _v2
        /[-_]?(crack|fixed|alt|trainer|ntsc|pal)/gi,
        /[-_]?\d{4}$/,        // Year at end
    ],

    /**
     * Extract base game name from filename for comparison
     * @param {string} filename - The filename to process
     * @returns {string} Normalized game name
     */
    normalizeFilename(filename) {
        // Remove extension
        let name = filename.replace(/\.(d64|tap|crt)$/i, '');

        // Apply strip patterns
        for (const pattern of this.STRIP_PATTERNS) {
            name = name.replace(pattern, '');
        }

        // Clean up remaining artifacts
        name = name
            .replace(/[-_]+/g, ' ')  // Replace separators with spaces
            .replace(/\s+/g, ' ')    // Collapse multiple spaces
            .trim()
            .toLowerCase();

        return name;
    },

    /**
     * Get the "cleanliness" score of a filename (lower is cleaner)
     * @param {string} filename - The filename to score
     * @returns {number} Score (lower = cleaner/preferred)
     */
    getFilenameScore(filename) {
        let score = filename.length;

        // Penalize brackets and parentheses
        const brackets = (filename.match(/[\[\]()]/g) || []).length;
        score += brackets * 10;

        // Penalize common crack/mod indicators
        if (/crack|trainer|fix|alt|hack/i.test(filename)) {
            score += 50;
        }

        // Bonus for clean simple names
        if (/^[a-zA-Z0-9\s\-_]+\.(d64|tap|crt)$/i.test(filename)) {
            score -= 20;
        }

        return score;
    },

    /**
     * Extract a readable game name from filename
     * @param {string} filename - The filename
     * @returns {string} Human-readable game name
     */
    extractGameName(filename) {
        // Remove extension
        let name = filename.replace(/\.(d64|tap|crt)$/i, '');

        // Remove common tags/markers
        name = name
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/[-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Title case
        return name.replace(/\b\w/g, c => c.toUpperCase());
    },

    /**
     * Get file type label from extension
     * @param {string} extension - File extension
     * @returns {string} Type label
     */
    getFileType(extension) {
        const types = {
            '.d64': 'disk',
            '.tap': 'tape',
            '.crt': 'cart'
        };
        return types[extension.toLowerCase()] || 'unknown';
    },

    /**
     * Scan a directory recursively for C64 files
     * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
     * @param {Function} progressCallback - Progress callback (count)
     * @returns {Promise<Array>} Array of file entries
     */
    async scanDirectory(dirHandle, progressCallback = null) {
        const files = [];
        const seenGames = new Map(); // Map of normalized name -> best file

        await this._scanRecursive(dirHandle, '', files, progressCallback);

        // Deduplicate files
        const dedupedFiles = this._deduplicateFiles(files);

        return dedupedFiles;
    },

    /**
     * Recursively scan directory contents
     * @private
     */
    async _scanRecursive(dirHandle, path, files, progressCallback) {
        try {
            for await (const entry of dirHandle.values()) {
                const entryPath = path ? `${path}/${entry.name}` : entry.name;

                if (entry.kind === 'directory') {
                    // Recurse into subdirectory
                    await this._scanRecursive(entry, entryPath, files, progressCallback);
                } else if (entry.kind === 'file') {
                    // Check if it's a supported file type
                    const ext = this._getExtension(entry.name);
                    if (this.SUPPORTED_EXTENSIONS.includes(ext.toLowerCase())) {
                        const file = await entry.getFile();
                        files.push({
                            name: entry.name,
                            path: entryPath,
                            handle: entry,
                            extension: ext.toLowerCase(),
                            size: file.size,
                            lastModified: file.lastModified
                        });

                        if (progressCallback) {
                            progressCallback(files.length);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning directory:', error);
        }
    },

    /**
     * Get file extension
     * @private
     */
    _getExtension(filename) {
        const match = filename.match(/\.[^.]+$/);
        return match ? match[0] : '';
    },

    /**
     * Deduplicate files, keeping the cleanest filename for each game
     * @private
     */
    _deduplicateFiles(files) {
        const gameMap = new Map();

        for (const file of files) {
            const normalizedName = this.normalizeFilename(file.name);
            const score = this.getFilenameScore(file.name);

            if (!gameMap.has(normalizedName)) {
                gameMap.set(normalizedName, { file, score });
            } else {
                const existing = gameMap.get(normalizedName);
                if (score < existing.score) {
                    // This file has a cleaner name, replace
                    gameMap.set(normalizedName, { file, score });
                }
            }
        }

        return Array.from(gameMap.values()).map(entry => entry.file);
    },

    /**
     * Check if File System Access API is supported
     * @returns {boolean}
     */
    isSupported() {
        return 'showDirectoryPicker' in window;
    },

    /**
     * Open directory picker dialog
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
    async pickDirectory() {
        if (!this.isSupported()) {
            throw new Error('File System Access API not supported in this browser');
        }

        try {
            return await window.showDirectoryPicker({
                mode: 'read'
            });
        } catch (error) {
            if (error.name === 'AbortError') {
                return null; // User cancelled
            }
            throw error;
        }
    },

    /**
     * Scan a directory for C64 files, with ZIP handling
     * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
     * @param {Function} progressCallback - Progress callback (count)
     * @param {Function} zipPromptCallback - Callback when ZIP found, returns Promise<boolean>
     * @returns {Promise<Object>} Object with files array and zipFiles array
     */
    async scanDirectoryWithZips(dirHandle, progressCallback = null, zipPromptCallback = null) {
        const files = [];
        const zipFiles = [];

        await this._scanRecursiveWithZips(dirHandle, '', files, zipFiles, progressCallback);

        // Deduplicate regular files
        const dedupedFiles = this._deduplicateFiles(files);

        return {
            files: dedupedFiles,
            zipFiles: zipFiles
        };
    },

    /**
     * Recursively scan directory contents, collecting ZIP files separately
     * @private
     */
    async _scanRecursiveWithZips(dirHandle, path, files, zipFiles, progressCallback) {
        try {
            for await (const entry of dirHandle.values()) {
                const entryPath = path ? `${path}/${entry.name}` : entry.name;

                if (entry.kind === 'directory') {
                    // Recurse into subdirectory
                    await this._scanRecursiveWithZips(entry, entryPath, files, zipFiles, progressCallback);
                } else if (entry.kind === 'file') {
                    const ext = this._getExtension(entry.name);

                    // Check for ZIP files
                    if (ext.toLowerCase() === this.ZIP_EXTENSION) {
                        const file = await entry.getFile();
                        zipFiles.push({
                            name: entry.name,
                            path: entryPath,
                            handle: entry,
                            file: file
                        });
                    }
                    // Check for C64 files
                    else if (this.SUPPORTED_EXTENSIONS.includes(ext.toLowerCase())) {
                        const file = await entry.getFile();
                        files.push({
                            name: entry.name,
                            path: entryPath,
                            handle: entry,
                            extension: ext.toLowerCase(),
                            size: file.size,
                            lastModified: file.lastModified,
                            sourceType: 'direct'
                        });

                        if (progressCallback) {
                            progressCallback(files.length);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning directory:', error);
        }
    },

    /**
     * Scan inside a ZIP file for C64 files (metadata only - no file data in memory)
     * @param {File} zipFile - The ZIP file to scan
     * @param {string} zipPath - Path to the ZIP file
     * @param {number} depth - Current nesting depth
     * @returns {Promise<Array>} Array of file entries found in ZIP (metadata only)
     */
    async scanZipFile(zipFile, zipPath, depth = 0) {
        if (depth >= this.MAX_ZIP_DEPTH) {
            console.warn(`Skipping deeply nested ZIP: ${zipPath} (depth: ${depth})`);
            return [];
        }

        const files = [];
        const nestedZipInfos = [];

        try {
            const zipData = await zipFile.arrayBuffer();
            const zip = await JSZip.loadAsync(zipData);

            // First pass: collect metadata only (no file extraction)
            for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
                if (zipEntry.dir) continue;

                const ext = this._getExtension(relativePath);
                const filename = relativePath.split('/').pop();

                // Check for C64 files - store metadata only, not file data
                if (this.SUPPORTED_EXTENSIONS.includes(ext.toLowerCase())) {
                    files.push({
                        name: filename,
                        path: `${zipPath}/${relativePath}`,
                        extension: ext.toLowerCase(),
                        size: zipEntry._data ? zipEntry._data.uncompressedSize : 0,
                        lastModified: zipEntry.date ? zipEntry.date.getTime() : Date.now(),
                        sourceType: 'zip',
                        sourceZipPath: zipPath,
                        zipEntryPath: relativePath
                        // NOTE: fileData is NOT stored here to save memory
                    });
                }
                // Check for nested ZIP files - store info for later processing
                else if (ext.toLowerCase() === this.ZIP_EXTENSION) {
                    nestedZipInfos.push({
                        relativePath,
                        filename,
                        fullPath: `${zipPath}/${relativePath}`
                    });
                }
            }

            // Process nested ZIPs one at a time to limit memory usage
            for (const nestedInfo of nestedZipInfos) {
                try {
                    const nestedZipData = await zip.file(nestedInfo.relativePath).async('blob');
                    const nestedZipFile = new File([nestedZipData], nestedInfo.filename, { type: 'application/zip' });

                    const nestedFiles = await this.scanZipFile(
                        nestedZipFile,
                        nestedInfo.fullPath,
                        depth + 1
                    );
                    files.push(...nestedFiles);

                    // Note: nestedZipFile will be garbage collected when out of scope
                } catch (nestedError) {
                    console.warn(`Failed to process nested ZIP ${nestedInfo.filename}:`, nestedError);
                }
            }

        } catch (error) {
            console.error(`Error scanning ZIP file ${zipPath}:`, error);
        }

        return files;
    },

    /**
     * Extract a single file from a ZIP (on-demand extraction)
     * @param {File} zipFile - The ZIP file
     * @param {string} entryPath - Path within the ZIP
     * @returns {Promise<ArrayBuffer>} The file data
     */
    async extractFileFromZip(zipFile, entryPath) {
        const zipData = await zipFile.arrayBuffer();
        const zip = await JSZip.loadAsync(zipData);
        const entry = zip.file(entryPath);

        if (!entry) {
            throw new Error(`Entry not found in ZIP: ${entryPath}`);
        }

        return await entry.async('arraybuffer');
    },

    /**
     * Check if JSZip is available
     * @returns {boolean}
     */
    isZipSupported() {
        return typeof JSZip !== 'undefined';
    }
};

// Export for use in other modules
window.Scanner = Scanner;

