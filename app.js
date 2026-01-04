/**
 * C64 Cataloger - Main Application
 * Handles UI interactions and coordinates between modules
 */

const App = {
    // Current state
    state: {
        viewMode: 'grid', // 'grid' or 'list'
        selectedEntryId: null,
        searchQuery: '',
        filterType: 'all',
        filterTag: 'all'
    },

    // DOM element references
    elements: {},

    /**
     * Initialize the application
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadSettings();
        this.render();
        this.updateStats();

        // Check browser support
        if (!Scanner.isSupported()) {
            this.showToast('Your browser does not support folder scanning. Please use Chrome, Edge, or another Chromium-based browser.', 'warning');
        }
    },

    /**
     * Cache DOM element references
     */
    cacheElements() {
        this.elements = {
            // Grid/List
            catalogGrid: document.getElementById('catalog-grid'),
            emptyState: document.getElementById('empty-state'),

            // Search/Filter
            searchInput: document.getElementById('search-input'),
            filterType: document.getElementById('filter-type'),
            filterTags: document.getElementById('filter-tags'),

            // Buttons
            btnGridView: document.getElementById('btn-grid-view'),
            btnListView: document.getElementById('btn-list-view'),
            btnSettings: document.getElementById('btn-settings'),
            btnScan: document.getElementById('btn-scan'),
            btnScanEmpty: document.getElementById('btn-scan-empty'),

            // Detail Panel
            detailPanel: document.getElementById('detail-panel'),
            detailBoxart: document.getElementById('detail-boxart'),
            detailArtworkPlaceholder: document.getElementById('detail-artwork-placeholder'),
            detailTitle: document.getElementById('detail-title'),
            detailYear: document.getElementById('detail-year'),
            detailType: document.getElementById('detail-type'),
            detailPublisher: document.getElementById('detail-publisher'),
            detailFilename: document.getElementById('detail-filename'),
            detailPath: document.getElementById('detail-path'),
            detailTagsContainer: document.getElementById('detail-tags-container'),
            detailNotes: document.getElementById('detail-notes'),
            btnCloseDetail: document.getElementById('btn-close-detail'),
            btnLaunch: document.getElementById('btn-launch'),
            btnCopyPath: document.getElementById('btn-copy-path'),
            btnRemove: document.getElementById('btn-remove'),
            btnAddTag: document.getElementById('btn-add-tag'),

            // Settings Modal
            settingsModal: document.getElementById('settings-modal'),
            btnCloseSettings: document.getElementById('btn-close-settings'),
            emulatorPath: document.getElementById('emulator-path'),
            btnBrowseEmulator: document.getElementById('btn-browse-emulator'),
            btnExport: document.getElementById('btn-export'),
            btnImport: document.getElementById('btn-import'),
            settingAutoFetchArt: document.getElementById('setting-auto-fetch-art'),
            settingCacheArt: document.getElementById('setting-cache-art'),
            btnClearCatalog: document.getElementById('btn-clear-catalog'),
            btnSaveSettings: document.getElementById('btn-save-settings'),

            // Local Library Settings
            settingLocalLibrary: document.getElementById('setting-local-library'),
            librarySettings: document.getElementById('library-settings'),
            libraryPath: document.getElementById('library-path'),
            btnBrowseLibrary: document.getElementById('btn-browse-library'),
            libraryStats: document.getElementById('library-stats'),
            libraryGameCount: document.getElementById('library-game-count'),
            librarySize: document.getElementById('library-size'),
            btnOrganizeExisting: document.getElementById('btn-organize-existing'),

            // Tag Modal
            tagModal: document.getElementById('tag-modal'),
            newTagInput: document.getElementById('new-tag'),
            btnConfirmTag: document.getElementById('btn-confirm-tag'),

            // Scan Modal
            scanModal: document.getElementById('scan-modal'),
            scanStatusText: document.getElementById('scan-status-text'),
            scanCount: document.getElementById('scan-count'),
            scanProgressFill: document.getElementById('scan-progress-fill'),

            // ZIP Modal
            zipModal: document.getElementById('zip-modal'),
            zipFilename: document.getElementById('zip-filename'),
            zipRememberChoice: document.getElementById('zip-remember-choice'),
            btnZipSkip: document.getElementById('btn-zip-skip'),
            btnZipExtract: document.getElementById('btn-zip-extract'),

            // Stats
            statTotal: document.getElementById('stat-total'),
            statDisk: document.getElementById('stat-disk'),
            statTape: document.getElementById('stat-tape'),
            statCart: document.getElementById('stat-cart'),

            // Toast container
            toastContainer: document.getElementById('toast-container')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // View toggles
        this.elements.btnGridView.addEventListener('click', () => this.setViewMode('grid'));
        this.elements.btnListView.addEventListener('click', () => this.setViewMode('list'));

        // Search and filter
        this.elements.searchInput.addEventListener('input', (e) => {
            this.state.searchQuery = e.target.value;
            this.render();
        });

        this.elements.filterType.addEventListener('change', (e) => {
            this.state.filterType = e.target.value;
            this.render();
        });

        this.elements.filterTags.addEventListener('change', (e) => {
            this.state.filterTag = e.target.value;
            this.render();
        });

        // Scan buttons
        this.elements.btnScan.addEventListener('click', () => this.startScan());
        this.elements.btnScanEmpty.addEventListener('click', () => this.startScan());

        // Settings
        this.elements.btnSettings.addEventListener('click', () => this.openModal('settings'));
        this.elements.btnCloseSettings.addEventListener('click', () => this.closeModal('settings'));
        this.elements.btnSaveSettings.addEventListener('click', () => this.saveSettings());
        this.elements.btnExport.addEventListener('click', () => this.exportCatalog());
        this.elements.btnImport.addEventListener('click', () => this.importCatalog());
        this.elements.btnClearCatalog.addEventListener('click', () => this.clearCatalog());

        // Local Library settings
        this.elements.settingLocalLibrary.addEventListener('change', (e) => {
            this.toggleLibrarySettings(e.target.checked);
        });
        this.elements.btnBrowseLibrary.addEventListener('click', () => this.browseLibrary());
        this.elements.btnOrganizeExisting.addEventListener('click', () => this.organizeExistingGames());

        // ZIP modal buttons
        this.elements.btnZipSkip.addEventListener('click', () => this.resolveZipPrompt(false));
        this.elements.btnZipExtract.addEventListener('click', () => this.resolveZipPrompt(true));

        // Detail panel
        this.elements.btnCloseDetail.addEventListener('click', () => this.closeDetailPanel());
        this.elements.btnLaunch.addEventListener('click', () => this.launchGame());
        this.elements.btnCopyPath.addEventListener('click', () => this.copyPath());
        this.elements.btnRemove.addEventListener('click', () => this.removeCurrentEntry());
        this.elements.btnAddTag.addEventListener('click', () => this.openModal('tag'));

        this.elements.detailNotes.addEventListener('blur', (e) => {
            if (this.state.selectedEntryId) {
                Catalog.updateEntry(this.state.selectedEntryId, { notes: e.target.value });
            }
        });

        // Tag modal
        document.querySelectorAll('.btn-close-tag-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal('tag'));
        });

        this.elements.btnConfirmTag.addEventListener('click', () => this.addTag());
        this.elements.newTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTag();
        });

        // Quick tags
        document.querySelectorAll('.btn-tag[data-tag]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                if (this.state.selectedEntryId) {
                    Catalog.addTag(this.state.selectedEntryId, tag);
                    this.updateDetailPanel();
                    this.updateTagFilter();
                    this.closeModal('tag');
                    this.showToast(`Tag "${tag}" added`, 'success');
                }
            });
        });

        // Modal close on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('open');
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeDetailPanel();
            }
        });
    },

    /**
     * Load settings into the UI
     */
    loadSettings() {
        const settings = Catalog.getSettings();
        this.elements.emulatorPath.value = settings.emulatorPath || '';
        this.elements.settingAutoFetchArt.checked = settings.autoFetchArt !== false;
        this.elements.settingCacheArt.checked = settings.cacheArtLocally !== false;

        // Local library settings
        this.elements.settingLocalLibrary.checked = settings.localLibraryEnabled || false;
        this.elements.libraryPath.value = settings.localLibraryName || '';
        this.toggleLibrarySettings(settings.localLibraryEnabled);
    },

    /**
     * Save settings from UI
     */
    saveSettings() {
        const settings = {
            emulatorPath: this.elements.emulatorPath.value.trim(),
            autoFetchArt: this.elements.settingAutoFetchArt.checked,
            cacheArtLocally: this.elements.settingCacheArt.checked,
            localLibraryEnabled: Library.isAvailable(),
            localLibraryName: Library.getLibraryName()
        };

        Catalog.updateSettings(settings);
        this.closeModal('settings');
        this.showToast('Settings saved', 'success');
    },

    /**
     * Set view mode (grid/list)
     */
    setViewMode(mode) {
        this.state.viewMode = mode;

        this.elements.btnGridView.classList.toggle('active', mode === 'grid');
        this.elements.btnListView.classList.toggle('active', mode === 'list');
        this.elements.catalogGrid.classList.toggle('list-view', mode === 'list');
    },

    /**
     * Render the catalog grid
     */
    render() {
        const entries = Catalog.search(this.state.searchQuery, {
            type: this.state.filterType,
            tag: this.state.filterTag
        });

        // Clear grid
        this.elements.catalogGrid.innerHTML = '';

        // Show/hide empty state
        this.elements.emptyState.style.display = entries.length === 0 ? 'flex' : 'none';

        // Render entries
        for (const entry of entries) {
            const card = this.createGameCard(entry);
            this.elements.catalogGrid.appendChild(card);
        }

        this.updateTagFilter();
    },

    /**
     * Create a game card element
     */
    createGameCard(entry) {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.id = entry.id;

        if (entry.id === this.state.selectedEntryId) {
            card.classList.add('selected');
        }

        const typeClass = entry.fileType;
        const placeholder = this.getFileTypeEmoji(entry.fileType);

        card.innerHTML = `
            <div class="game-card-artwork" style="background: ${Metadata.generatePlaceholderGradient(entry.gameName)}">
                ${entry.boxArtUrl
                ? `<img src="${entry.boxArtUrl}" alt="${entry.gameName}" onerror="this.style.display='none'">`
                : `<div class="game-card-artwork-placeholder">${placeholder}</div>`
            }
            </div>
            <div class="game-card-info">
                <div class="game-card-title">${this.escapeHtml(entry.gameName)}</div>
                <div class="game-card-meta">
                    <span class="game-card-year">${entry.year || '—'}</span>
                    <span class="game-card-type ${typeClass}">${entry.extension}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => this.selectEntry(entry.id));

        return card;
    },

    /**
     * Get emoji for file type
     */
    getFileTypeEmoji(type) {
        const emojis = {
            'disk': '💾',
            'tape': '📼',
            'cart': '🎮'
        };
        return emojis[type] || '🎮';
    },

    /**
     * Select an entry and show detail panel
     */
    selectEntry(id) {
        this.state.selectedEntryId = id;

        // Update card selection
        document.querySelectorAll('.game-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.id === id);
        });

        this.updateDetailPanel();
        this.elements.detailPanel.classList.add('open');
    },

    /**
     * Update the detail panel with selected entry
     */
    updateDetailPanel() {
        const entry = Catalog.getEntry(this.state.selectedEntryId);
        if (!entry) return;

        // Artwork
        if (entry.boxArtUrl) {
            this.elements.detailBoxart.src = entry.boxArtUrl;
            this.elements.detailBoxart.classList.add('loaded');
        } else {
            this.elements.detailBoxart.classList.remove('loaded');
            this.elements.detailBoxart.src = '';
        }

        // Set placeholder gradient
        this.elements.detailArtworkPlaceholder.closest('.detail-artwork').style.background =
            Metadata.generatePlaceholderGradient(entry.gameName);

        // Info
        this.elements.detailTitle.textContent = entry.gameName;
        this.elements.detailYear.textContent = entry.year || 'Unknown';
        this.elements.detailType.textContent = entry.extension.toUpperCase();
        this.elements.detailPublisher.textContent = entry.publisher || 'Unknown Publisher';
        this.elements.detailFilename.textContent = entry.filename;
        this.elements.detailPath.textContent = entry.originalPath;
        this.elements.detailNotes.value = entry.notes || '';

        // Tags
        this.elements.detailTagsContainer.innerHTML = '';
        for (const tag of entry.tags) {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.innerHTML = `
                ${this.escapeHtml(tag)}
                <span class="tag-remove" data-tag="${tag}">×</span>
            `;

            tagEl.querySelector('.tag-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                Catalog.removeTag(entry.id, tag);
                this.updateDetailPanel();
                this.updateTagFilter();
            });

            this.elements.detailTagsContainer.appendChild(tagEl);
        }
    },

    /**
     * Close the detail panel
     */
    closeDetailPanel() {
        this.state.selectedEntryId = null;
        this.elements.detailPanel.classList.remove('open');

        document.querySelectorAll('.game-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
    },

    // ZIP prompt state
    _zipPromiseResolve: null,
    _zipRememberChoice: null, // null, 'skip', or 'extract'

    /**
     * Show ZIP prompt modal and wait for user decision
     * @param {string} zipName - Name of the ZIP file
     * @returns {Promise<boolean>} True if should extract, false to skip
     */
    async showZipPrompt(zipName) {
        // Check if user has a remembered choice
        if (this._zipRememberChoice !== null) {
            return this._zipRememberChoice === 'extract';
        }

        return new Promise((resolve) => {
            this._zipPromiseResolve = resolve;
            this.elements.zipFilename.textContent = zipName;
            this.elements.zipRememberChoice.checked = false;
            this.openModal('zip');
        });
    },

    /**
     * Resolve the ZIP prompt
     * @param {boolean} shouldExtract - Whether to extract the ZIP
     */
    resolveZipPrompt(shouldExtract) {
        if (this._zipPromiseResolve) {
            // Check if should remember choice
            if (this.elements.zipRememberChoice.checked) {
                this._zipRememberChoice = shouldExtract ? 'extract' : 'skip';
            }

            this.closeModal('zip');
            this._zipPromiseResolve(shouldExtract);
            this._zipPromiseResolve = null;
        }
    },

    /**
     * Start folder scanning with ZIP support
     */
    async startScan() {
        try {
            const dirHandle = await Scanner.pickDirectory();
            if (!dirHandle) return; // User cancelled

            // Reset ZIP memory for this scan session
            this._zipRememberChoice = null;

            this.openModal('scan');
            this.elements.scanCount.textContent = '0';
            this.elements.scanProgressFill.style.width = '0%';
            this.elements.scanStatusText.textContent = 'Scanning directories...';

            // Scan for files and ZIP files
            const { files, zipFiles } = await Scanner.scanDirectoryWithZips(
                dirHandle,
                (count) => {
                    this.elements.scanCount.textContent = count;
                }
            );

            // Process ZIP files if any found - one at a time to manage memory
            let zipExtractedFiles = [];
            if (zipFiles.length > 0 && Scanner.isZipSupported()) {
                this.elements.scanStatusText.textContent = `Found ${zipFiles.length} ZIP file(s)...`;

                for (let zipIndex = 0; zipIndex < zipFiles.length; zipIndex++) {
                    const zipInfo = zipFiles[zipIndex];

                    this.closeModal('scan');
                    const shouldExtract = await this.showZipPrompt(zipInfo.name);
                    this.openModal('scan');

                    if (shouldExtract) {
                        this.elements.scanStatusText.textContent = `Scanning ${zipInfo.name} (${zipIndex + 1}/${zipFiles.length})...`;
                        const extractedFiles = await Scanner.scanZipFile(zipInfo.file, zipInfo.path);
                        zipExtractedFiles.push(...extractedFiles);
                        this.elements.scanCount.textContent =
                            parseInt(this.elements.scanCount.textContent) + extractedFiles.length;
                    }

                    // Clear the ZIP file reference to help garbage collection
                    zipFiles[zipIndex] = null;

                    // Allow browser to breathe every few ZIPs
                    if (zipIndex % 5 === 0) {
                        await new Promise(r => setTimeout(r, 10));
                    }
                }
            }

            // Combine all files
            const allFiles = [...files, ...zipExtractedFiles];

            // Clear original arrays to free memory
            files.length = 0;
            zipExtractedFiles = null;

            this.elements.scanStatusText.textContent = 'Processing files...';
            this.elements.scanProgressFill.style.width = '50%';

            // Add files to catalog in batches
            let addedCount = 0;
            let skippedCount = 0;
            const BATCH_SIZE = 50;

            for (let i = 0; i < allFiles.length; i++) {
                const file = allFiles[i];

                // Skip if already in catalog
                if (Catalog.hasEntry(file.name)) {
                    skippedCount++;
                    continue;
                }

                // Lookup metadata
                const gameName = Scanner.extractGameName(file.name);
                const metadata = await Metadata.lookup(gameName);

                // Add to catalog (file data from ZIPs is not stored in memory for efficiency)
                // Library organization can be done separately via "Organize Existing Games"
                // Use deferSave=true to avoid saving to localStorage on every entry
                Catalog.addEntry(file, {
                    gameName,
                    year: metadata.year,
                    publisher: metadata.publisher,
                    boxArtUrl: metadata.boxArtUrl
                }, true); // deferSave = true

                addedCount++;

                // Update progress and yield to browser every BATCH_SIZE files
                if (i % BATCH_SIZE === 0) {
                    const progress = 50 + ((i + 1) / allFiles.length) * 50;
                    this.elements.scanProgressFill.style.width = `${progress}%`;
                    this.elements.scanStatusText.textContent = `Processing ${i + 1}/${allFiles.length}...`;

                    // Commit changes to localStorage periodically (every BATCH_SIZE)
                    Catalog.commitChanges();

                    // Yield to browser to prevent freezing and allow GC
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            // Final commit of any remaining entries
            Catalog.commitChanges();

            // Final progress update
            this.elements.scanProgressFill.style.width = '100%';

            this.closeModal('scan');
            this.render();
            this.updateStats();

            // Show result
            let message = '';
            const zipCount = allFiles.filter(f => f.sourceType === 'zip').length;
            if (addedCount > 0) {
                message = `Added ${addedCount} games to catalog`;
                if (skippedCount > 0) {
                    message += ` (${skippedCount} duplicates skipped)`;
                }
                if (zipCount > 0) {
                    message += `. Found ${zipCount} in ZIP files.`;
                }
                this.showToast(message, 'success');
            } else if (skippedCount > 0) {
                this.showToast(`All ${skippedCount} files already in catalog`, 'info');
            } else {
                this.showToast('No C64 files found in selected folder', 'warning');
            }

        } catch (error) {
            console.error('Scan error:', error);
            this.closeModal('scan');
            this.showToast('Error scanning folder: ' + error.message, 'error');
        }
    },

    /**
     * Update statistics display
     */
    updateStats() {
        const stats = Catalog.getStats();
        this.elements.statTotal.textContent = stats.total;
        this.elements.statDisk.textContent = stats.disk;
        this.elements.statTape.textContent = stats.tape;
        this.elements.statCart.textContent = stats.cart;
    },

    /**
     * Update tag filter dropdown
     */
    updateTagFilter() {
        const tags = Catalog.getAllTags();
        const currentValue = this.elements.filterTags.value;

        this.elements.filterTags.innerHTML = '<option value="all">All Tags</option>';

        for (const tag of tags) {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            this.elements.filterTags.appendChild(option);
        }

        // Restore selection if still valid
        if (tags.includes(currentValue)) {
            this.elements.filterTags.value = currentValue;
        }
    },

    /**
     * Add a tag to the selected entry
     */
    addTag() {
        const tag = this.elements.newTagInput.value.trim();
        if (!tag || !this.state.selectedEntryId) return;

        Catalog.addTag(this.state.selectedEntryId, tag);
        this.updateDetailPanel();
        this.updateTagFilter();
        this.closeModal('tag');
        this.elements.newTagInput.value = '';
        this.showToast(`Tag "${tag}" added`, 'success');
    },

    /**
     * Launch game in emulator
     */
    launchGame() {
        const settings = Catalog.getSettings();
        const entry = Catalog.getEntry(this.state.selectedEntryId);

        if (!entry) return;

        if (!settings.emulatorPath) {
            this.showToast('Please configure VICE emulator path in Settings', 'warning');
            this.openModal('settings');
            return;
        }

        // Generate launch command
        const command = `"${settings.emulatorPath}" "${entry.originalPath}"`;

        // Copy to clipboard
        navigator.clipboard.writeText(command).then(() => {
            this.showToast('Launch command copied to clipboard! Paste in terminal to run.', 'success');
        }).catch(() => {
            // Fallback: show the command
            prompt('Copy this command to launch the game:', command);
        });
    },

    /**
     * Copy file path to clipboard
     */
    copyPath() {
        const entry = Catalog.getEntry(this.state.selectedEntryId);
        if (!entry) return;

        navigator.clipboard.writeText(entry.originalPath).then(() => {
            this.showToast('Path copied to clipboard', 'success');
        }).catch(() => {
            this.showToast('Failed to copy path', 'error');
        });
    },

    /**
     * Remove current entry from catalog
     */
    removeCurrentEntry() {
        const entry = Catalog.getEntry(this.state.selectedEntryId);
        if (!entry) return;

        if (confirm(`Remove "${entry.gameName}" from catalog?`)) {
            Catalog.removeEntry(entry.id);
            this.closeDetailPanel();
            this.render();
            this.updateStats();
            this.showToast('Game removed from catalog', 'success');
        }
    },

    /**
     * Export catalog to file
     */
    exportCatalog() {
        const json = Catalog.export();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `c64-catalog-${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.showToast('Catalog exported', 'success');
    },

    /**
     * Import catalog from file
     */
    importCatalog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const addedCount = Catalog.import(text);
                this.render();
                this.updateStats();
                this.showToast(`Imported ${addedCount} new entries`, 'success');
            } catch (error) {
                this.showToast('Failed to import catalog: ' + error.message, 'error');
            }
        };

        input.click();
    },

    /**
     * Clear entire catalog
     */
    clearCatalog() {
        if (confirm('Are you sure you want to delete all entries? This cannot be undone.')) {
            Catalog.clear();
            this.closeDetailPanel();
            this.render();
            this.updateStats();
            this.closeModal('settings');
            this.showToast('Catalog cleared', 'success');
        }
    },

    /**
     * Toggle library settings visibility
     * @param {boolean} enabled - Whether library is enabled
     */
    toggleLibrarySettings(enabled) {
        if (this.elements.librarySettings) {
            this.elements.librarySettings.style.display = enabled ? 'block' : 'none';
        }

        if (!enabled) {
            Library.disable();
        }
    },

    /**
     * Browse for library folder
     */
    async browseLibrary() {
        try {
            const handle = await Library.pickLibraryFolder();
            if (handle) {
                this.elements.libraryPath.value = handle.name;
                this.elements.settingLocalLibrary.checked = true;
                await this.updateLibraryStats();
                this.showToast(`Library folder set to: ${handle.name}`, 'success');
            }
        } catch (error) {
            console.error('Error selecting library folder:', error);
            this.showToast('Failed to select library folder: ' + error.message, 'error');
        }
    },

    /**
     * Update library statistics display
     */
    async updateLibraryStats() {
        if (!Library.isAvailable()) {
            this.elements.libraryGameCount.textContent = '0';
            this.elements.librarySize.textContent = '0 B';
            return;
        }

        try {
            const stats = await Library.getStats();
            this.elements.libraryGameCount.textContent = stats.gameCount;
            this.elements.librarySize.textContent = Library.formatSize(stats.totalSize);
        } catch (error) {
            console.error('Error getting library stats:', error);
        }
    },

    /**
     * Organize existing catalog games into the local library
     */
    async organizeExistingGames() {
        if (!Library.isAvailable()) {
            this.showToast('Please select a library folder first', 'warning');
            return;
        }

        const entries = Catalog.getAllEntries();
        const entriesToOrganize = entries.filter(e => !e.libraryPath);

        if (entriesToOrganize.length === 0) {
            this.showToast('All games are already in the library', 'info');
            return;
        }

        if (!confirm(`This will copy ${entriesToOrganize.length} games to your library folder. Continue?`)) {
            return;
        }

        this.openModal('scan');
        this.elements.scanStatusText.textContent = 'Organizing games...';
        this.elements.scanCount.textContent = '0';
        this.elements.scanProgressFill.style.width = '0%';

        let organized = 0;
        let failed = 0;

        for (let i = 0; i < entriesToOrganize.length; i++) {
            const entry = entriesToOrganize[i];

            try {
                this.elements.scanStatusText.textContent = `Organizing: ${entry.gameName}`;

                // Note: For direct files, we'd need to read them from the original location
                // This is a limitation of the File System Access API - we can't read files
                // without user re-granting permission. For now, we'll only organize
                // files that have fileData (from ZIP extraction)

                // Update progress
                organized++;
                this.elements.scanCount.textContent = organized;
                const progress = ((i + 1) / entriesToOrganize.length) * 100;
                this.elements.scanProgressFill.style.width = `${progress}%`;

            } catch (error) {
                console.error(`Failed to organize ${entry.gameName}:`, error);
                failed++;
            }
        }

        this.closeModal('scan');
        await this.updateLibraryStats();

        if (failed > 0) {
            this.showToast(`Organized ${organized} games (${failed} failed)`, 'warning');
        } else {
            this.showToast(`Organized ${organized} games to library`, 'success');
        }
    },

    /**
     * Open a modal
     */
    openModal(name) {
        const modal = document.getElementById(`${name}-modal`);
        if (modal) {
            modal.classList.add('open');
        }
    },

    /**
     * Close a modal
     */
    closeModal(name) {
        const modal = document.getElementById(`${name}-modal`);
        if (modal) {
            modal.classList.remove('open');
        }
    },

    /**
     * Close all modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal-overlay.open').forEach(modal => {
            modal.classList.remove('open');
        });
    },

    /**
     * Show a toast notification
     */
    showToast(message, type = 'info') {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        this.elements.toastContainer.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for debugging
window.App = App;
