/**
 * Leaderboard Service for City Cleanup Challenge
 * Handles various types of leaderboards with caching and real-time updates
 */

class LeaderboardService {
    constructor(database) {
        this.db = database;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
        this.leaderboardTypes = {
            points: 'Total Points',
            events: 'Events Attended', 
            waste: 'Waste Collected (kg)',
            impact: 'Environmental Impact',
            streak: 'Current Streak',
            achievements: 'Achievements Earned',
            level: 'User Level'
        };
    }

    /**
     * Get comprehensive leaderboard with multiple ranking categories
     * @param {string} type - Leaderboard type (points, events, waste, etc.)
     * @param {string} timeframe - Time range (today, week, month, quarter, year, all-time)
     * @param {number} limit - Number of results to return
     * @param {number} page - Page number for pagination
     * @returns {Promise<Object>} Leaderboard data with rankings and metadata
     */
    async getLeaderboard(type = 'points', timeframe = 'all-time', limit = 50, page = 1) {
        try {
            // Check cache first
            const cached = await this.getCachedLeaderboard(type, timeframe);
            if (cached && this.isCacheValid(cached.lastUpdated)) {
                return this.paginateResults(cached.data, limit, page);
            }

            // Generate fresh leaderboard
            const leaderboardData = await this.generateLeaderboard(type, timeframe, limit * 3); // Get more data for caching
            
            // Cache the results
            await this.cacheLeaderboard(type, timeframe, leaderboardData);

            return this.paginateResults(leaderboardData, limit, page);

        } catch (error) {
            console.error('Leaderboard generation error:', error);
            throw new Error('Failed to generate leaderboard');
        }
    }

    /**
     * Generate fresh leaderboard data based on type and timeframe
     * @param {string} type - Leaderboard type
     * @param {string} timeframe - Time range 
     * @param {number} limit - Maximum results
     * @returns {Promise<Object>} Fresh leaderboard data
     */
    async generateLeaderboard(type, timeframe, limit = 100) {
        const timeCondition = this.getTimeCondition(timeframe);
        let query, params;

        switch (type) {
            case 'points':
                query = `
                    SELECT 
                        u.username,
                        SUM(up.pointsEarned) as totalPoints,
                        COUNT(up.id) as pointsCount,
                        ul.currentLevel,
                        ul.levelTitle,
                        ul.levelIcon
                    FROM users u
                    LEFT JOIN user_points up ON u.username = up.username ${timeCondition.points}
                    LEFT JOIN user_levels ul ON u.username = ul.username
                    GROUP BY u.username
                    ORDER BY totalPoints DESC, pointsCount DESC
                    LIMIT ?
                `;
                params = [...timeCondition.params, limit];
                break;

            case 'events':
                query = `
                    SELECT 
                        u.username,
                        COUNT(DISTINCT ep.event_id) as eventsAttended,
                        SUM(CASE WHEN e.created_by = u.username THEN 1 ELSE 0 END) as eventsCreated,
                        ul.currentLevel,
                        ul.levelTitle
                    FROM users u
                    LEFT JOIN event_participants ep ON u.username = ep.username
                    LEFT JOIN events e ON ep.event_id = e.id ${timeCondition.events}
                    LEFT JOIN user_levels ul ON u.username = ul.username
                    GROUP BY u.username
                    ORDER BY eventsAttended DESC, eventsCreated DESC
                    LIMIT ?
                `;
                params = [...timeCondition.params, limit];
                break;

            case 'waste':
                query = `
                    SELECT 
                        u.username,
                        SUM(ei.wasteCollected) as totalWaste,
                        COUNT(ei.id) as impactRecords,
                        ul.currentLevel,
                        ul.levelTitle
                    FROM users u
                    LEFT JOIN environmental_impact ei ON u.username = ei.username ${timeCondition.environmental}
                    LEFT JOIN user_levels ul ON u.username = ul.username
                    GROUP BY u.username
                    ORDER BY totalWaste DESC, impactRecords DESC
                    LIMIT ?
                `;
                params = [...timeCondition.params, limit];
                break;

            case 'impact':
                query = `
                    SELECT 
                        u.username,
                        SUM(ei.co2Saved) as totalCO2Saved,
                        SUM(ei.waterSaved) as totalWaterSaved,
                        SUM(ei.energySaved) as totalEnergySaved,
                        SUM(ei.carbonValue) as totalCarbonValue,
                        ul.currentLevel,
                        ul.levelTitle
                    FROM users u
                    LEFT JOIN environmental_impact ei ON u.username = ei.username ${timeCondition.environmental}
                    LEFT JOIN user_levels ul ON u.username = ul.username
                    GROUP BY u.username
                    ORDER BY totalCarbonValue DESC, totalCO2Saved DESC
                    LIMIT ?
                `;
                params = [...timeCondition.params, limit];
                break;

            case 'streak':
                query = `
                    SELECT 
                        u.username,
                        us.currentStreak,
                        us.longestStreak,
                        us.lastActiveDate,
                        us.streakStartDate,
                        ul.currentLevel,
                        ul.levelTitle
                    FROM users u
                    LEFT JOIN user_streaks us ON u.username = us.username
                    LEFT JOIN user_levels ul ON u.username = ul.username
                    ORDER BY us.currentStreak DESC, us.longestStreak DESC
                    LIMIT ?
                `;
                params = [limit];
                break;

            case 'achievements':
                query = `
                    SELECT 
                        u.username,
                        COUNT(ua.id) as totalAchievements,
                        SUM(ua.pointsAwarded) as achievementPoints,
                        ul.currentLevel,
                        ul.levelTitle,
                        GROUP_CONCAT(ua.achievementCategory) as categories
                    FROM users u
                    LEFT JOIN user_achievements ua ON u.username = ua.username ${timeCondition.achievements}
                    LEFT JOIN user_levels ul ON u.username = ul.username
                    GROUP BY u.username
                    ORDER BY totalAchievements DESC, achievementPoints DESC
                    LIMIT ?
                `;
                params = [...timeCondition.params, limit];
                break;

            case 'level':
                query = `
                    SELECT 
                        u.username,
                        ul.currentLevel,
                        ul.currentPoints,
                        ul.levelTitle,
                        ul.levelIcon,
                        ul.totalLevelUps,
                        up.totalPoints
                    FROM users u
                    LEFT JOIN user_levels ul ON u.username = ul.username
                    LEFT JOIN (
                        SELECT username, SUM(pointsEarned) as totalPoints 
                        FROM user_points 
                        GROUP BY username
                    ) up ON u.username = up.username
                    ORDER BY ul.currentLevel DESC, ul.currentPoints DESC, up.totalPoints DESC
                    LIMIT ?
                `;
                params = [limit];
                break;

            default:
                throw new Error(`Unknown leaderboard type: ${type}`);
        }

        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const rankings = rows.map((row, index) => ({
                    rank: index + 1,
                    username: row.username,
                    score: this.getScoreValue(type, row),
                    details: this.getLeaderboardDetails(type, row),
                    level: {
                        current: row.currentLevel || 1,
                        title: row.levelTitle || 'Eco Beginner',
                        icon: row.levelIcon || '🌱'
                    }
                }));

                resolve({
                    type,
                    typeDisplayName: this.leaderboardTypes[type],
                    timeframe,
                    rankings,
                    totalCount: rows.length,
                    generatedAt: new Date().toISOString(),
                    nextUpdate: new Date(Date.now() + this.cacheExpiry).toISOString()
                });
            });
        });
    }

    /**
     * Get time condition SQL and parameters for different timeframes
     * @param {string} timeframe - Time range
     * @returns {Object} SQL condition and parameters
     */
    getTimeCondition(timeframe) {
        const now = new Date();
        let condition = '', params = [];

        switch (timeframe) {
            case 'today':
                const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                condition = 'AND created_at >= ?';
                params = [todayStart];
                break;

            case 'week':
                const weekStart = new Date(now.setDate(now.getDate() - 7)).toISOString();
                condition = 'AND created_at >= ?';
                params = [weekStart];
                break;

            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                condition = 'AND created_at >= ?';
                params = [monthStart];
                break;

            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                const quarterStart = new Date(now.getFullYear(), quarter * 3, 1).toISOString();
                condition = 'AND created_at >= ?';
                params = [quarterStart];
                break;

            case 'year':
                const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
                condition = 'AND created_at >= ?';
                params = [yearStart];
                break;

            case 'all-time':
            default:
                // No time condition
                break;
        }

        return {
            points: condition ? `AND up.earnedAt >= ?` : '',
            events: condition ? `AND e.date >= ?` : '', 
            environmental: condition ? `AND ei.impactCalculatedAt >= ?` : '',
            achievements: condition ? `AND ua.earnedAt >= ?` : '',
            params
        };
    }

    /**
     * Get score value based on leaderboard type
     * @param {string} type - Leaderboard type
     * @param {Object} row - Database row data
     * @returns {number} Score value
     */
    getScoreValue(type, row) {
        switch (type) {
            case 'points':
                return row.totalPoints || 0;
            case 'events':
                return row.eventsAttended || 0;
            case 'waste':
                return row.totalWaste || 0;
            case 'impact':
                return row.totalCarbonValue || 0;
            case 'streak':
                return row.currentStreak || 0;
            case 'achievements':
                return row.totalAchievements || 0;
            case 'level':
                return row.currentLevel || 1;
            default:
                return 0;
        }
    }

    /**
     * Get detailed information for leaderboard entry
     * @param {string} type - Leaderboard type
     * @param {Object} row - Database row data
     * @returns {Object} Detailed information
     */
    getLeaderboardDetails(type, row) {
        switch (type) {
            case 'points':
                return {
                    totalPoints: row.totalPoints || 0,
                    pointsCount: row.pointsCount || 0
                };
            case 'events':
                return {
                    eventsAttended: row.eventsAttended || 0,
                    eventsCreated: row.eventsCreated || 0
                };
            case 'waste':
                return {
                    totalWaste: row.totalWaste || 0,
                    impactRecords: row.impactRecords || 0
                };
            case 'impact':
                return {
                    co2Saved: row.totalCO2Saved || 0,
                    waterSaved: row.totalWaterSaved || 0,
                    energySaved: row.totalEnergySaved || 0,
                    carbonValue: row.totalCarbonValue || 0
                };
            case 'streak':
                return {
                    currentStreak: row.currentStreak || 0,
                    longestStreak: row.longestStreak || 0,
                    lastActiveDate: row.lastActiveDate,
                    streakStartDate: row.streakStartDate
                };
            case 'achievements':
                return {
                    totalAchievements: row.totalAchievements || 0,
                    achievementPoints: row.achievementPoints || 0,
                    categories: row.categories ? row.categories.split(',') : []
                };
            case 'level':
                return {
                    currentLevel: row.currentLevel || 1,
                    currentPoints: row.currentPoints || 0,
                    totalLevelUps: row.totalLevelUps || 0,
                    totalPoints: row.totalPoints || 0
                };
            default:
                return {};
        }
    }

    /**
     * Get user's rank in specific leaderboard
     * @param {string} username - User to get rank for
     * @param {string} type - Leaderboard type
     * @param {string} timeframe - Time range
     * @returns {Promise<Object>} User's rank and stats
     */
    async getUserLeaderboardRank(username, type = 'points', timeframe = 'all-time') {
        try {
            const leaderboard = await this.getLeaderboard(type, timeframe, 1000); // Get large dataset
            const userRanking = leaderboard.rankings.find(entry => entry.username === username);

            if (!userRanking) {
                return {
                    username,
                    rank: null,
                    score: 0,
                    outOfTotal: leaderboard.totalCount,
                    percentile: 0
                };
            }

            const percentile = Math.round((1 - (userRanking.rank - 1) / leaderboard.totalCount) * 100);

            return {
                username,
                rank: userRanking.rank,
                score: userRanking.score,
                details: userRanking.details,
                level: userRanking.level,
                outOfTotal: leaderboard.totalCount,
                percentile
            };

        } catch (error) {
            console.error('User leaderboard rank error:', error);
            throw new Error('Failed to get user leaderboard rank');
        }
    }

    /**
     * Get cached leaderboard if available
     * @param {string} type - Leaderboard type
     * @param {string} timeframe - Time range
     * @returns {Promise<Object|null>} Cached leaderboard data or null
     */
    async getCachedLeaderboard(type, timeframe) {
        return new Promise((resolve) => {
            this.db.get(
                'SELECT * FROM leaderboard_cache WHERE leaderboardType = ? AND timeframe = ? ORDER BY lastUpdated DESC LIMIT 1',
                [type, timeframe],
                (err, row) => {
                    if (err || !row) {
                        resolve(null);
                        return;
                    }

                    try {
                        resolve({
                            data: JSON.parse(row.metadata),
                            lastUpdated: row.lastUpdated
                        });
                    } catch (parseError) {
                        resolve(null);
                    }
                }
            );
        });
    }

    /**
     * Check if cached data is still valid
     * @param {string} lastUpdated - Cache timestamp
     * @returns {boolean} Whether cache is valid
     */
    isCacheValid(lastUpdated) {
        const cacheTime = new Date(lastUpdated).getTime();
        const now = Date.now();
        return (now - cacheTime) < this.cacheExpiry;
    }

    /**
     * Cache leaderboard data
     * @param {string} type - Leaderboard type
     * @param {string} timeframe - Time range
     * @param {Object} data - Leaderboard data
     */
    async cacheLeaderboard(type, timeframe, data) {
        const expiresAt = new Date(Date.now() + this.cacheExpiry).toISOString();
        const metadata = JSON.stringify(data);

        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO leaderboard_cache 
                (leaderboardType, timeframe, username, rank, score, metadata, lastUpdated, expiresAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [type, timeframe, 'system', 0, 0, metadata, new Date().toISOString(), expiresAt],
                (err) => {
                    if (err) {
                        console.error('Cache save error:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Paginate leaderboard results
     * @param {Object} data - Leaderboard data
     * @param {number} limit - Results per page
     * @param {number} page - Page number
     * @returns {Object} Paginated results
     */
    paginateResults(data, limit, page) {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedRankings = data.rankings.slice(startIndex, endIndex);

        return {
            ...data,
            rankings: paginatedRankings,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(data.rankings.length / limit),
                totalResults: data.rankings.length,
                resultsPerPage: limit,
                hasNextPage: endIndex < data.rankings.length,
                hasPreviousPage: page > 1
            }
        };
    }

    /**
     * Clear expired cache entries
     */
    async clearExpiredCache() {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM leaderboard_cache WHERE expiresAt < ?',
                [new Date().toISOString()],
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Get leaderboard summary across all types
     * @param {string} timeframe - Time range
     * @returns {Promise<Object>} Summary data
     */
    async getLeaderboardSummary(timeframe = 'month') {
        const leaderboardTypes = ['points', 'events', 'waste', 'impact', 'streak'];
        const summaries = {};

        for (const type of leaderboardTypes) {
            try {
                const leaderboard = await this.getLeaderboard(type, timeframe, 10);
                summaries[type] = {
                    topUsers: leaderboard.rankings.slice(0, 3),
                    totalParticipants: leaderboard.totalCount,
                    typeDisplayName: this.leaderboardTypes[type]
                };
            } catch (error) {
                console.error(`Failed to get ${type} leaderboard summary:`, error);
                summaries[type] = {
                    topUsers: [],
                    totalParticipants: 0,
                    error: error.message
                };
            }
        }

        return {
            timeframe,
            summaries,
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = LeaderboardService;