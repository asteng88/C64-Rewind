/**
 * C64 Cataloger - Metadata Module
 * Handles game information lookup and box art fetching
 */

const Metadata = {
    // Cache for API results
    cache: new Map(),

    // Known C64 games database (subset of popular titles)
    // This provides fallback data when APIs are unavailable
    KNOWN_GAMES: {
        'frogger': { year: '1983', publisher: 'Parker Brothers' },
        'boulder dash': { year: '1984', publisher: 'First Star Software' },
        'bubble bobble': { year: '1987', publisher: 'Firebird' },
        'commando': { year: '1985', publisher: 'Elite Systems' },
        'ghostbusters': { year: '1984', publisher: 'Activision' },
        'ghost n goblins': { year: '1986', publisher: 'Elite Systems' },
        'ghosts n goblins': { year: '1986', publisher: 'Elite Systems' },
        'green beret': { year: '1986', publisher: 'Imagine' },
        'international karate': { year: '1986', publisher: 'System 3' },
        'impossible mission': { year: '1984', publisher: 'Epyx' },
        'jumpman': { year: '1983', publisher: 'Epyx' },
        'last ninja': { year: '1987', publisher: 'System 3' },
        'lode runner': { year: '1983', publisher: 'Broderbund' },
        'maniac mansion': { year: '1987', publisher: 'Lucasfilm Games' },
        'montezumas revenge': { year: '1984', publisher: 'Parker Brothers' },
        'monty on the run': { year: '1985', publisher: 'Gremlin Graphics' },
        'nebulus': { year: '1987', publisher: 'Hewson' },
        'paradroid': { year: '1985', publisher: 'Hewson' },
        'pirates': { year: '1987', publisher: 'MicroProse' },
        'pitstop ii': { year: '1984', publisher: 'Epyx' },
        'raid over moscow': { year: '1984', publisher: 'Access Software' },
        'rambo': { year: '1985', publisher: 'Ocean' },
        'spy vs spy': { year: '1984', publisher: 'First Star Software' },
        'summer games': { year: '1984', publisher: 'Epyx' },
        'summer games ii': { year: '1985', publisher: 'Epyx' },
        'the way of the exploding fist': { year: '1985', publisher: 'Melbourne House' },
        'winter games': { year: '1985', publisher: 'Epyx' },
        'wizball': { year: '1987', publisher: 'Ocean' },
        'zaxxon': { year: '1984', publisher: 'Sega' },
        'zak mckracken': { year: '1988', publisher: 'Lucasfilm Games' },
        'arkanoid': { year: '1987', publisher: 'Imagine' },
        'archon': { year: '1984', publisher: 'Electronic Arts' },
        'beach head': { year: '1983', publisher: 'Access Software' },
        'beach head ii': { year: '1985', publisher: 'Access Software' },
        'california games': { year: '1987', publisher: 'Epyx' },
        'creatures': { year: '1990', publisher: 'Thalamus' },
        'creatures 2': { year: '1992', publisher: 'Thalamus' },
        'defender of the crown': { year: '1987', publisher: 'Cinemaware' },
        'elite': { year: '1985', publisher: 'Firebird' },
        'forbidden forest': { year: '1983', publisher: 'Cosmi' },
        'gauntlet': { year: '1986', publisher: 'US Gold' },
        'head over heels': { year: '1987', publisher: 'Ocean' },
        'jet set willy': { year: '1984', publisher: 'Software Projects' },
        'katakis': { year: '1988', publisher: 'Rainbow Arts' },
        'manic miner': { year: '1984', publisher: 'Software Projects' },
        'mayhem in monsterland': { year: '1993', publisher: 'Apex Computer Productions' },
        'paperboy': { year: '1986', publisher: 'Elite Systems' },
        'saboteur': { year: '1985', publisher: 'Durell' },
        'turrican': { year: '1990', publisher: 'Rainbow Arts' },
        'turrican ii': { year: '1991', publisher: 'Rainbow Arts' },
        'uridium': { year: '1986', publisher: 'Hewson' },
    },

    /**
     * Lookup metadata for a game
     * @param {string} gameName - The game name to lookup
     * @returns {Promise<Object>} Metadata object
     */
    async lookup(gameName) {
        const normalizedName = gameName.toLowerCase().trim();

        // Check cache first
        if (this.cache.has(normalizedName)) {
            return this.cache.get(normalizedName);
        }

        // Check known games database
        const knownData = this.KNOWN_GAMES[normalizedName];
        if (knownData) {
            const result = {
                year: knownData.year,
                publisher: knownData.publisher,
                boxArtUrl: null
            };
            this.cache.set(normalizedName, result);
            return result;
        }

        // Try to fetch from MobyGames (with fallback)
        try {
            const result = await this._fetchFromMobyGames(gameName);
            if (result) {
                this.cache.set(normalizedName, result);
                return result;
            }
        } catch (error) {
            console.warn('MobyGames lookup failed:', error);
        }

        // Return empty metadata if all lookups fail
        const emptyResult = {
            year: '',
            publisher: '',
            boxArtUrl: null
        };
        this.cache.set(normalizedName, emptyResult);
        return emptyResult;
    },

    /**
     * Fetch metadata from MobyGames API
     * Note: This is a simplified implementation. In production, 
     * you'd need a proper API key and CORS proxy.
     * @private
     */
    async _fetchFromMobyGames(gameName) {
        // MobyGames requires an API key and has CORS restrictions
        // For now, we'll return null and rely on local database
        // In a full implementation, you'd use a backend proxy
        return null;
    },

    /**
     * Search for box art image
     * @param {string} gameName - Game name to search for
     * @returns {Promise<string|null>} Image URL or null
     */
    async searchBoxArt(gameName) {
        // Try to find box art from various sources
        const searchQueries = [
            `commodore 64 ${gameName} box art`,
            `c64 ${gameName} cover`,
            `${gameName} commodore 64`
        ];

        // For now, return null - box art fetching would require
        // either a backend proxy or specific API integrations
        // The user can manually add box art URLs
        return null;
    },

    /**
     * Generate a placeholder gradient based on game name
     * @param {string} gameName - Game name for seed
     * @returns {string} CSS gradient string
     */
    generatePlaceholderGradient(gameName) {
        // Generate consistent colors based on game name
        const hash = this._hashString(gameName);
        const hue1 = hash % 360;
        const hue2 = (hash * 7) % 360;

        return `linear-gradient(135deg, hsl(${hue1}, 60%, 30%), hsl(${hue2}, 50%, 20%))`;
    },

    /**
     * Simple string hash function
     * @private
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    },

    /**
     * Validate and normalize a box art URL
     * @param {string} url - URL to validate
     * @returns {string|null} Validated URL or null
     */
    validateBoxArtUrl(url) {
        if (!url || typeof url !== 'string') return null;

        try {
            const parsed = new URL(url);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return url;
            }
        } catch (e) {
            return null;
        }

        return null;
    },

    /**
     * Clear the metadata cache
     */
    clearCache() {
        this.cache.clear();
    }
};

// Export for use in other modules
window.Metadata = Metadata;
