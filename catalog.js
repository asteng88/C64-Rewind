/**
 * C64 Cataloger - Catalog Module
 * Handles catalog data management, persistence, and CRUD operations
 */

const Catalog = {
    // Current catalog data
    data: {
        version: '1.1',
        lastUpdated: null,
        settings: {
            emulatorPath: '',
            autoFetchArt: true,
            cacheArtLocally: true,
            localLibraryEnabled: false,
            localLibraryName: ''
        },
        entries: []
    },

    // LocalStorage key
    STORAGE_KEY: 'c64-cataloger-data',

    /**
     * Initialize the catalog (load from storage)
     */
    init() {
        this.load();
    },

    /**
     * Load catalog from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to handle version upgrades
                this.data = {
                    ...this.data,
                    ...parsed,
                    settings: {
                        ...this.data.settings,
                        ...parsed.settings
                    }
                };
            }
        } catch (error) {
            console.error('Error loading catalog:', error);
        }
    },

    /**
     * Save catalog to localStorage
     */
    save() {
        try {
            this.data.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving catalog:', error);
            throw new Error('Failed to save catalog');
        }
    },

    /**
     * Generate a unique ID
     * @returns {string}
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Add a new entry to the catalog
     * @param {Object} fileInfo - File information from scanner
     * @param {Object} metadata - Metadata from lookup
     * @param {boolean} deferSave - If true, don't save immediately (for batch operations)
     * @returns {Object} The created entry
     */
    addEntry(fileInfo, metadata = {}, deferSave = false) {
        const entry = {
            id: this.generateId(),
            filename: fileInfo.name,
            originalPath: fileInfo.path,
            fileType: Scanner.getFileType(fileInfo.extension),
            extension: fileInfo.extension,
            fileSize: fileInfo.size,
            gameName: metadata.gameName || Scanner.extractGameName(fileInfo.name),
            year: metadata.year || '',
            publisher: metadata.publisher || '',
            boxArtUrl: metadata.boxArtUrl || null,
            boxArtLocal: null,
            notes: '',
            tags: [],
            // Source tracking
            sourceType: fileInfo.sourceType || 'direct', // 'direct', 'zip', 'library'
            sourceZipPath: fileInfo.sourceZipPath || null,
            // Library location (if copied to local library)
            libraryPath: metadata.libraryPath || null,
            dateAdded: new Date().toISOString(),
            dateModified: new Date().toISOString()
        };

        this.data.entries.push(entry);

        if (!deferSave) {
            this.save();
        }

        return entry;
    },

    /**
     * Commit any pending changes to localStorage
     * Call this after batch operations with deferSave=true
     */
    commitChanges() {
        this.save();
    },

    /**
     * Update an existing entry
     * @param {string} id - Entry ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated entry or null if not found
     */
    updateEntry(id, updates) {
        const index = this.data.entries.findIndex(e => e.id === id);
        if (index === -1) return null;

        this.data.entries[index] = {
            ...this.data.entries[index],
            ...updates,
            dateModified: new Date().toISOString()
        };

        this.save();
        return this.data.entries[index];
    },

    /**
     * Remove an entry from the catalog
     * @param {string} id - Entry ID
     * @returns {boolean} Success
     */
    removeEntry(id) {
        const index = this.data.entries.findIndex(e => e.id === id);
        if (index === -1) return false;

        this.data.entries.splice(index, 1);
        this.save();
        return true;
    },

    /**
     * Get an entry by ID
     * @param {string} id - Entry ID
     * @returns {Object|null}
     */
    getEntry(id) {
        return this.data.entries.find(e => e.id === id) || null;
    },

    /**
     * Get all entries
     * @returns {Array}
     */
    getAllEntries() {
        return [...this.data.entries];
    },

    /**
     * Search entries
     * @param {string} query - Search query
     * @param {Object} filters - Filter options
     * @returns {Array} Matching entries
     */
    search(query = '', filters = {}) {
        let results = [...this.data.entries];

        // Text search
        if (query) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(entry =>
                entry.gameName.toLowerCase().includes(lowerQuery) ||
                entry.filename.toLowerCase().includes(lowerQuery) ||
                entry.publisher.toLowerCase().includes(lowerQuery) ||
                entry.notes.toLowerCase().includes(lowerQuery) ||
                entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
            );
        }

        // Filter by type
        if (filters.type && filters.type !== 'all') {
            results = results.filter(entry => entry.extension === filters.type);
        }

        // Filter by tag
        if (filters.tag && filters.tag !== 'all') {
            results = results.filter(entry => entry.tags.includes(filters.tag));
        }

        // Filter by year
        if (filters.year) {
            results = results.filter(entry => entry.year === filters.year);
        }

        return results;
    },

    /**
     * Add a tag to an entry
     * @param {string} id - Entry ID
     * @param {string} tag - Tag to add
     * @returns {boolean} Success
     */
    addTag(id, tag) {
        const entry = this.getEntry(id);
        if (!entry) return false;

        const normalizedTag = tag.toLowerCase().trim();
        if (!entry.tags.includes(normalizedTag)) {
            entry.tags.push(normalizedTag);
            entry.dateModified = new Date().toISOString();
            this.save();
        }
        return true;
    },

    /**
     * Remove a tag from an entry
     * @param {string} id - Entry ID
     * @param {string} tag - Tag to remove
     * @returns {boolean} Success
     */
    removeTag(id, tag) {
        const entry = this.getEntry(id);
        if (!entry) return false;

        const index = entry.tags.indexOf(tag.toLowerCase());
        if (index !== -1) {
            entry.tags.splice(index, 1);
            entry.dateModified = new Date().toISOString();
            this.save();
        }
        return true;
    },

    /**
     * Get all unique tags from all entries
     * @returns {Array<string>}
     */
    getAllTags() {
        const tagSet = new Set();
        for (const entry of this.data.entries) {
            for (const tag of entry.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    },

    /**
     * Get statistics about the catalog
     * @returns {Object}
     */
    getStats() {
        const stats = {
            total: this.data.entries.length,
            disk: 0,
            tape: 0,
            cart: 0
        };

        for (const entry of this.data.entries) {
            switch (entry.extension) {
                case '.d64':
                    stats.disk++;
                    break;
                case '.tap':
                    stats.tape++;
                    break;
                case '.crt':
                    stats.cart++;
                    break;
            }
        }

        return stats;
    },

    /**
     * Update settings
     * @param {Object} settings - Settings to update
     */
    updateSettings(settings) {
        this.data.settings = {
            ...this.data.settings,
            ...settings
        };
        this.save();
    },

    /**
     * Get settings
     * @returns {Object}
     */
    getSettings() {
        return { ...this.data.settings };
    },

    /**
     * Export catalog as JSON
     * @returns {string} JSON string
     */
    export() {
        return JSON.stringify(this.data, null, 2);
    },

    /**
     * Import catalog from JSON
     * @param {string} jsonString - JSON data
     * @returns {boolean} Success
     */
    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);

            // Validate structure
            if (!imported.entries || !Array.isArray(imported.entries)) {
                throw new Error('Invalid catalog format');
            }

            // Merge entries (skip duplicates based on filename + path)
            const existingKeys = new Set(
                this.data.entries.map(e => `${e.filename}:${e.originalPath}`)
            );

            let addedCount = 0;
            for (const entry of imported.entries) {
                const key = `${entry.filename}:${entry.originalPath}`;
                if (!existingKeys.has(key)) {
                    this.data.entries.push(entry);
                    existingKeys.add(key);
                    addedCount++;
                }
            }

            // Import settings if present
            if (imported.settings) {
                this.data.settings = {
                    ...this.data.settings,
                    ...imported.settings
                };
            }

            this.save();
            return addedCount;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    },

    /**
     * Clear all entries from the catalog
     */
    clear() {
        this.data.entries = [];
        this.save();
    },

    /**
     * Check if an entry already exists (by filename)
     * @param {string} filename - Filename to check
     * @returns {boolean}
     */
    hasEntry(filename) {
        return this.data.entries.some(e => e.filename === filename);
    }
};

// Initialize on load
Catalog.init();

// Export for use in other modules
window.Catalog = Catalog;
