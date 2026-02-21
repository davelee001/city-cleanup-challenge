/**
 * Gamification & Incentive System Service
 * Handles points, achievements, badges, streaks, and environmental impact scoring
 */

const EventEmitter = require('events');

class GamificationService extends EventEmitter {
    constructor(db) {
        super();
        this.db = db;
        
        // Points configuration
        this.pointsConfig = {
            eventCreation: 50,
            eventAttendance: 25,
            progressUpdate: 15,
            photoUpload: 10,
            firstTimeActions: {
                firstEvent: 100,
                firstProgress: 50,
                firstPhoto: 25,
                firstCheckin: 30
            },
            wasteCollection: {
                perKg: 5,
                bonusThresholds: {
                    10: 25, // 25 bonus points for 10+ kg
                    25: 75, // 75 bonus points for 25+ kg  
                    50: 150 // 150 bonus points for 50+ kg
                }
            },
            streakBonuses: {
                7: 50,   // 7-day streak
                14: 100, // 14-day streak
                30: 250, // 30-day streak
                90: 500  // 90-day streak
            }
        };

        // Environmental impact calculations
        this.environmentalImpact = {
            co2PerKgWaste: 0.75, // kg CO2 saved per kg waste collected
            waterSavedPerKg: 2.5, // liters water saved per kg waste
            energySavedPerKg: 1.2, // kWh energy saved per kg waste
            carbonCreditValue: 0.025 // USD value per kg CO2
        };

        // Achievement definitions
        this.achievements = [
            // Participation achievements
            { id: 'first_cleanup', name: 'First Cleanup', description: 'Attend your first cleanup event', points: 100, icon: '🌱', category: 'participation' },
            { id: 'cleanup_regular', name: 'Regular Cleaner', description: 'Attend 5 cleanup events', points: 200, icon: '🧽', category: 'participation' },
            { id: 'cleanup_veteran', name: 'Cleanup Veteran', description: 'Attend 25 cleanup events', points: 500, icon: '🏆', category: 'participation' },
            { id: 'cleanup_master', name: 'Cleanup Master', description: 'Attend 100 cleanup events', points: 1000, icon: '👑', category: 'participation' },
            
            // Impact achievements
            { id: 'waste_collector_10', name: 'Small Impact', description: 'Collect 10kg of waste', points: 150, icon: '♻️', category: 'impact' },
            { id: 'waste_collector_50', name: 'Growing Impact', description: 'Collect 50kg of waste', points: 400, icon: '🌍', category: 'impact' },
            { id: 'waste_collector_100', name: 'Major Impact', description: 'Collect 100kg of waste', points: 750, icon: '🌟', category: 'impact' },
            { id: 'waste_collector_500', name: 'Environmental Hero', description: 'Collect 500kg of waste', points: 2000, icon: '🦸', category: 'impact' },
            
            // Leadership achievements
            { id: 'event_organizer', name: 'Event Organizer', description: 'Create your first cleanup event', points: 200, icon: '📅', category: 'leadership' },
            { id: 'community_leader', name: 'Community Leader', description: 'Create 10 cleanup events', points: 750, icon: '👥', category: 'leadership' },
            { id: 'change_maker', name: 'Change Maker', description: 'Create 25 cleanup events', points: 1500, icon: '⚡', category: 'leadership' },
            
            // Documentation achievements
            { id: 'photographer', name: 'Cleanup Photographer', description: 'Upload 25 cleanup photos', points: 300, icon: '📸', category: 'documentation' },
            { id: 'storyteller', name: 'Environmental Storyteller', description: 'Upload 100 photos', points: 600, icon: '📖', category: 'documentation' },
            { id: 'archivist', name: 'Environmental Archivist', description: 'Upload 500 photos', points: 1200, icon: '🗃️', category: 'documentation' },
            
            // Streak achievements
            { id: 'weekly_warrior', name: 'Weekly Warrior', description: 'Maintain a 7-day streak', points: 250, icon: '🔥', category: 'streak' },
            { id: 'monthly_champion', name: 'Monthly Champion', description: 'Maintain a 30-day streak', points: 500, icon: '🏅', category: 'streak' },
            { id: 'quarterly_legend', name: 'Quarterly Legend', description: 'Maintain a 90-day streak', points: 1000, icon: '🌈', category: 'streak' },
            
            // Special achievements  
            { id: 'early_bird', name: 'Early Bird', description: 'Join event within first hour of creation', points: 100, icon: '🐦', category: 'special' },
            { id: 'team_player', name: 'Team Player', description: 'Participate with 10+ people in one event', points: 200, icon: '🤝', category: 'special' },
            { id: 'eco_warrior', name: 'Eco Warrior', description: 'Save 100kg CO2 equivalent', points: 800, icon: '🌿', category: 'special' }
        ];

        // Badge system
        this.badgeCategories = {
            participation: { name: 'Participation', color: '#4CAF50' },
            impact: { name: 'Environmental Impact', color: '#2196F3' },
            leadership: { name: 'Leadership', color: '#FF9800' },
            documentation: { name: 'Documentation', color: '#9C27B0' },
            streak: { name: 'Consistency', color: '#F44336' },
            special: { name: 'Special', color: '#795548' }
        };
    }

    /**
     * Calculate points for a user action
     * @param {string} action - Action type
     * @param {object} data - Action data
     * @param {string} username - User performing action
     * @returns {Promise<number>} Points earned
     */
    async calculatePoints(action, data, username) {
        let points = 0;
        let bonuses = [];

        try {
            switch (action) {
                case 'event_creation':
                    points = this.pointsConfig.eventCreation;
                    if (await this.isFirstTimeAction(username, 'event_creation')) {
                        points += this.pointsConfig.firstTimeActions.firstEvent;
                        bonuses.push('First Event Bonus: +100');
                    }
                    break;

                case 'event_attendance':
                    points = this.pointsConfig.eventAttendance;
                    if (await this.isFirstTimeAction(username, 'event_attendance')) {
                        points += this.pointsConfig.firstTimeActions.firstCheckin;
                        bonuses.push('First Check-in Bonus: +30');
                    }
                    break;

                case 'progress_update':
                    points = this.pointsConfig.progressUpdate;
                    
                    // Add waste collection points
                    if (data.wasteCollected && data.wasteCollected > 0) {
                        const wastePoints = Math.floor(data.wasteCollected * this.pointsConfig.wasteCollection.perKg);
                        points += wastePoints;
                        bonuses.push(`Waste Collection: +${wastePoints} (${data.wasteCollected}kg)`);
                        
                        // Bonus thresholds
                        const thresholds = this.pointsConfig.wasteCollection.bonusThresholds;
                        for (const [threshold, bonus] of Object.entries(thresholds)) {
                            if (data.wasteCollected >= parseInt(threshold)) {
                                points += bonus;
                                bonuses.push(`${threshold}kg+ Bonus: +${bonus}`);
                                break; // Only highest applicable threshold
                            }
                        }
                    }
                    
                    if (await this.isFirstTimeAction(username, 'progress_update')) {
                        points += this.pointsConfig.firstTimeActions.firstProgress;
                        bonuses.push('First Progress Bonus: +50');
                    }
                    break;

                case 'photo_upload':
                    points = this.pointsConfig.photoUpload;
                    if (await this.isFirstTimeAction(username, 'photo_upload')) {
                        points += this.pointsConfig.firstTimeActions.firstPhoto;
                        bonuses.push('First Photo Bonus: +25');
                    }
                    break;

                default:
                    console.warn(`Unknown action type for points calculation: ${action}`);
                    return 0;
            }

            // Apply streak bonuses
            const currentStreak = await this.getCurrentStreak(username);
            const streakBonus = this.calculateStreakBonus(currentStreak);
            if (streakBonus > 0) {
                points += streakBonus;
                bonuses.push(`${currentStreak}-day Streak Bonus: +${streakBonus}`);
            }

            return { points, bonuses };

        } catch (error) {
            console.error('Error calculating points:', error);
            return { points: 0, bonuses: [] };
        }
    }

    /**
     * Calculate environmental impact of user actions
     * @param {number} wasteCollected - Amount of waste in kg
     * @returns {object} Environmental impact metrics
     */
    calculateEnvironmentalImpact(wasteCollected) {
        if (!wasteCollected || wasteCollected <= 0) return null;

        const co2Saved = wasteCollected * this.environmentalImpact.co2PerKgWaste;
        const waterSaved = wasteCollected * this.environmentalImpact.waterSavedPerKg;
        const energySaved = wasteCollected * this.environmentalImpact.energySavedPerKg;
        const carbonValue = co2Saved * this.environmentalImpact.carbonCreditValue;

        return {
            wasteCollected,
            co2Saved: Math.round(co2Saved * 100) / 100,
            waterSaved: Math.round(waterSaved * 100) / 100,
            energySaved: Math.round(energySaved * 100) / 100,
            carbonValue: Math.round(carbonValue * 100) / 100,
            calculatedAt: new Date().toISOString()
        };
    }

    /**
     * Check and award achievements to a user
     * @param {string} username - Username to check
     * @returns {Promise<Array>} New achievements earned
     */
    async checkAndAwardAchievements(username) {
        try {
            const userStats = await this.getUserStats(username);
            const currentAchievements = await this.getUserAchievements(username);
            const newAchievements = [];

            for (const achievement of this.achievements) {
                // Skip if user already has this achievement
                if (currentAchievements.some(a => a.achievementId === achievement.id)) {
                    continue;
                }

                let earned = false;

                // Check achievement criteria
                switch (achievement.id) {
                    case 'first_cleanup':
                        earned = userStats.eventsAttended >= 1;
                        break;
                    case 'cleanup_regular':
                        earned = userStats.eventsAttended >= 5;
                        break;
                    case 'cleanup_veteran':
                        earned = userStats.eventsAttended >= 25;
                        break;
                    case 'cleanup_master':
                        earned = userStats.eventsAttended >= 100;
                        break;
                    case 'waste_collector_10':
                        earned = userStats.totalWasteCollected >= 10;
                        break;
                    case 'waste_collector_50':
                        earned = userStats.totalWasteCollected >= 50;
                        break;
                    case 'waste_collector_100':
                        earned = userStats.totalWasteCollected >= 100;
                        break;
                    case 'waste_collector_500':
                        earned = userStats.totalWasteCollected >= 500;
                        break;
                    case 'event_organizer':
                        earned = userStats.eventsCreated >= 1;
                        break;
                    case 'community_leader':
                        earned = userStats.eventsCreated >= 10;
                        break;
                    case 'change_maker':
                        earned = userStats.eventsCreated >= 25;
                        break;
                    case 'photographer':
                        earned = userStats.photosUploaded >= 25;
                        break;
                    case 'storyteller':
                        earned = userStats.photosUploaded >= 100;
                        break;
                    case 'archivist':
                        earned = userStats.photosUploaded >= 500;
                        break;
                    case 'weekly_warrior':
                        earned = userStats.longestStreak >= 7;
                        break;
                    case 'monthly_champion':
                        earned = userStats.longestStreak >= 30;
                        break;
                    case 'quarterly_legend':
                        earned = userStats.longestStreak >= 90;
                        break;
                    case 'eco_warrior':
                        earned = userStats.totalCO2Saved >= 100;
                        break;
                    // Add more achievement checks as needed
                }

                if (earned) {
                    await this.awardAchievement(username, achievement);
                    newAchievements.push(achievement);
                }
            }

            return newAchievements;

        } catch (error) {
            console.error('Error checking achievements:', error);
            return [];
        }
    }

    /**
     * Update user streak
     * @param {string} username - Username
     * @returns {Promise<object>} Streak information
     */
    async updateStreak(username) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get current streak data
            const streakData = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT * FROM user_streaks WHERE username = ?',
                    [username],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });

            let currentStreak = 0;
            let longestStreak = 0;
            let lastActiveDate = today;

            if (streakData) {
                const lastDate = new Date(streakData.lastActiveDate);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 0) {
                    // Same day, no change
                    return {
                        currentStreak: streakData.currentStreak,
                        longestStreak: streakData.longestStreak,
                        updated: false
                    };
                } else if (diffDays === 1) {
                    // Consecutive day, increment streak
                    currentStreak = streakData.currentStreak + 1;
                    longestStreak = Math.max(currentStreak, streakData.longestStreak);
                } else {
                    // Streak broken, reset
                    currentStreak = 1;
                    longestStreak = streakData.longestStreak;
                }
            } else {
                // First time tracking
                currentStreak = 1;
                longestStreak = 1;
            }

            // Update database
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT OR REPLACE INTO user_streaks 
                     (username, currentStreak, longestStreak, lastActiveDate, updatedAt)
                     VALUES (?, ?, ?, ?, ?)`,
                    [username, currentStreak, longestStreak, lastActiveDate, new Date().toISOString()],
                    function(err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            return {
                currentStreak,
                longestStreak,
                updated: true,
                streakBroken: streakData && currentStreak === 1 && streakData.currentStreak > 1
            };

        } catch (error) {
            console.error('Error updating streak:', error);
            return { currentStreak: 0, longestStreak: 0, updated: false };
        }
    }

    /**
     * Get comprehensive user statistics
     * @param {string} username - Username
     * @returns {Promise<object>} User statistics
     */
    async getUserStats(username) {
        try {
            // Get basic stats from multiple tables
            const [points, achievements, streak, events, progress] = await Promise.all([
                this.getUserPoints(username),
                this.getUserAchievements(username),
                this.getCurrentStreak(username),
                this.getUserEventStats(username),
                this.getUserProgressStats(username)
            ]);

            const totalCO2Saved = progress.totalWasteCollected * this.environmentalImpact.co2PerKgWaste;

            return {
                username,
                totalPoints: points,
                achievementsCount: achievements.length,
                currentStreak: streak,
                longestStreak: await this.getLongestStreak(username),
                eventsAttended: events.attended,
                eventsCreated: events.created,
                totalWasteCollected: progress.totalWasteCollected,
                photosUploaded: progress.photosUploaded,
                totalCO2Saved: Math.round(totalCO2Saved * 100) / 100,
                level: this.calculateUserLevel(points),
                rank: await this.getUserRank(username),
                lastActive: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return null;
        }
    }

    /**
     * Calculate user level based on points
     * @param {number} points - Total points
     * @returns {object} Level information
     */
    calculateUserLevel(points) {
        const levels = [
            { level: 1, minPoints: 0, title: 'Eco Beginner', icon: '🌱' },
            { level: 2, minPoints: 100, title: 'Green Helper', icon: '🍃' },
            { level: 3, minPoints: 300, title: 'Earth Friend', icon: '🌍' },
            { level: 4, minPoints: 750, title: 'Cleanup Champion', icon: '🏆' },
            { level: 5, minPoints: 1500, title: 'Environmental Warrior', icon: '⚡' },
            { level: 6, minPoints: 3000, title: 'Planet Guardian', icon: '🛡️' },
            { level: 7, minPoints: 6000, title: 'Eco Master', icon: '🧙‍♂️' },
            { level: 8, minPoints: 12000, title: 'Nature\'s Champion', icon: '👑' },
            { level: 9, minPoints: 25000, title: 'Earth\'s Hero', icon: '🦸' },
            { level: 10, minPoints: 50000, title: 'Planet Savior', icon: '🌟' }
        ];

        for (let i = levels.length - 1; i >= 0; i--) {
            if (points >= levels[i].minPoints) {
                const currentLevel = levels[i];
                const nextLevel = levels[i + 1];
                
                return {
                    ...currentLevel,
                    progress: nextLevel ? 
                        Math.round(((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100) : 100,
                    pointsToNext: nextLevel ? nextLevel.minPoints - points : 0
                };
            }
        }

        return levels[0];
    }

    // Helper methods for database operations
    async isFirstTimeAction(username, action) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT COUNT(*) as count FROM user_actions WHERE username = ? AND action = ?',
                [username, action],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count === 0);
                }
            );
        });
    }

    async getCurrentStreak(username) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT currentStreak FROM user_streaks WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.currentStreak : 0);
                }
            );
        });
    }

    async getLongestStreak(username) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT longestStreak FROM user_streaks WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.longestStreak : 0);
                }
            );
        });
    }

    calculateStreakBonus(streak) {
        const bonuses = this.pointsConfig.streakBonuses;
        for (const [threshold, bonus] of Object.entries(bonuses).reverse()) {
            if (streak >= parseInt(threshold)) {
                return bonus;
            }
        }
        return 0;
    }

    async getUserPoints(username) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT COALESCE(SUM(pointsEarned), 0) as total FROM user_points WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.total);
                }
            );
        });
    }

    async getUserAchievements(username) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM user_achievements WHERE username = ?',
                [username],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async getUserEventStats(username) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    (SELECT COUNT(*) FROM event_checkins WHERE username = ?) as attended,
                    (SELECT COUNT(*) FROM events WHERE creator = ?) as created
            `, [username, username], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0] || { attended: 0, created: 0 });
            });
        });
    }

    async getUserProgressStats(username) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COALESCE(SUM(wasteCollected), 0) as totalWasteCollected,
                    COUNT(CASE WHEN beforePhotoPath IS NOT NULL OR afterPhotoPath IS NOT NULL THEN 1 END) as photosUploaded
                FROM cleanup_progress 
                WHERE username = ?
            `, [username], (err, row) => {
                if (err) reject(err);
                else resolve(row || { totalWasteCollected: 0, photosUploaded: 0 });
            });
        });
    }

    async getUserRank(username) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                WITH user_totals AS (
                    SELECT username, SUM(pointsEarned) as totalPoints
                    FROM user_points
                    GROUP BY username
                ),
                ranked_users AS (
                    SELECT username, totalPoints, 
                           ROW_NUMBER() OVER (ORDER BY totalPoints DESC) as rank
                    FROM user_totals
                )
                SELECT rank FROM ranked_users WHERE username = ?
            `, [username], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.rank : null);
            });
        });
    }

    async awardAchievement(username, achievement) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO user_achievements 
                 (username, achievementId, earnedAt, pointsAwarded)
                 VALUES (?, ?, ?, ?)`,
                [username, achievement.id, new Date().toISOString(), achievement.points],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
}

module.exports = GamificationService;