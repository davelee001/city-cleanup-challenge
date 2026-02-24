/**
 * Gamification Integration Service
 * Automatically awards points and achievements when users perform actions
 */

const GamificationService = require('./gamificationService');

class GamificationIntegration {
    constructor(database, eventEmitter) {
        this.db = database;
        this.emitter = eventEmitter;
        this.gamificationService = new GamificationService(database);
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for automatic point awarding
     */
    setupEventListeners() {
        // User signup - award welcome bonus
        this.emitter.on('user:signup', async (user) => {
            try {
                await this.gamificationService.awardPoints(
                    user.username,
                    'signup',
                    user.id,
                    { 
                        userRole: user.role,
                        signupDate: new Date().toISOString()
                    }
                );
                console.log(`Welcome bonus awarded to ${user.username}`);
            } catch (error) {
                console.error(`Failed to award signup bonus to ${user.username}:`, error);
            }
        });

        // Event creation - award organizer points
        this.emitter.on('event:created', async (event) => {
            try {
                await this.gamificationService.awardPoints(
                    event.username,
                    'event_creation',
                    event.id,
                    {
                        eventTitle: event.title,
                        eventDate: event.date,
                        eventLocation: event.location
                    }
                );
                console.log(`Event creation points awarded to ${event.username}`);
            } catch (error) {
                console.error(`Failed to award event creation points to ${event.username}:`, error);
            }
        });

        // Post creation - award content creation points
        this.emitter.on('post:created', async (post) => {
            try {
                await this.gamificationService.awardPoints(
                    post.username,
                    'content_creation',
                    post.id,
                    {
                        postContent: post.content?.substring(0, 100) + '...',
                        createdAt: post.createdAt
                    }
                );
                console.log(`Content creation points awarded to ${post.username}`);
            } catch (error) {
                console.error(`Failed to award content creation points to ${post.username}:`, error);
            }
        });

        // Photo upload - award documentation points
        this.emitter.on('photo:uploaded', async (photoData) => {
            try {
                const { username, eventId, photoType, hasGPS, aiAnalysis } = photoData;
                
                let bonuses = [];
                const metadata = { eventId, photoType };

                // GPS bonus
                if (hasGPS) {
                    bonuses.push('gps_bonus');
                    metadata.hasGPS = true;
                }

                // AI analysis bonus
                if (aiAnalysis) {
                    bonuses.push('ai_analysis_bonus');
                    metadata.aiAnalysis = aiAnalysis;
                }

                await this.gamificationService.awardPoints(
                    username,
                    'photo_upload',
                    eventId,
                    metadata
                );

                console.log(`Photo upload points awarded to ${username} with bonuses: ${bonuses.join(', ')}`);
            } catch (error) {
                console.error(`Failed to award photo upload points:`, error);
            }
        });

        // Progress update - award participation points 
        this.emitter.on('progress:updated', async (progressData) => {
            try {
                const { username, eventId, wasteCollected, hasPhotos } = progressData;
                
                const metadata = { 
                    eventId, 
                    wasteCollected: wasteCollected || 0,
                    hasPhotos: hasPhotos || false
                };

                await this.gamificationService.awardPoints(
                    username,
                    'event_participation',
                    eventId,
                    metadata
                );

                // Award environmental impact points if waste collected
                if (wasteCollected && wasteCollected > 0) {
                    await this.trackEnvironmentalImpact(username, eventId, wasteCollected);
                }

                console.log(`Participation points awarded to ${username} for event ${eventId}`);
            } catch (error) {
                console.error(`Failed to award participation points:`, error);
            }
        });

        // Plan creation - award planning points
        this.emitter.on('plan:created', async (plan) => {
            try {
                await this.gamificationService.awardPoints(
                    plan.created_by,
                    'plan_creation',
                    plan.id,
                    {
                        planTitle: plan.title,
                        planComplexity: plan.requirements?.length || 1
                    }
                );
                console.log(`Plan creation points awarded to ${plan.created_by}`);
            } catch (error) {
                console.error(`Failed to award plan creation points to ${plan.created_by}:`, error);
            }
        });

        // First-time actions - award discovery bonuses
        this.emitter.on('action:first_time', async (actionData) => {
            try {
                const { username, action, metadata } = actionData;
                
                await this.gamificationService.awardPoints(
                    username,
                    'first_time_bonus',
                    null,
                    { 
                        firstTimeAction: action,
                        ...metadata 
                    }
                );

                console.log(`First-time bonus awarded to ${username} for ${action}`);
            } catch (error) {
                console.error(`Failed to award first-time bonus:`, error);
            }
        });
    }

    /**
     * Track environmental impact and award related points/achievements
     * @param {string} username - User who made the impact
     * @param {string} eventId - Event ID
     * @param {number} wasteCollected - Amount of waste collected (kg)
     */
    async trackEnvironmentalImpact(username, eventId, wasteCollected) {
        try {
            const impact = await this.gamificationService.calculateEnvironmentalImpact(wasteCollected);
            
            // Store environmental impact
            await this.storeEnvironmentalImpact(username, eventId, wasteCollected, impact);
            
            // Award impact-based points
            if (impact.co2Saved > 0) {
                await this.gamificationService.awardPoints(
                    username,
                    'environmental_impact',
                    eventId,
                    {
                        wasteCollected,
                        co2Saved: impact.co2Saved,
                        waterSaved: impact.waterSaved,
                        energySaved: impact.energySaved
                    }
                );
            }

            console.log(`Environmental impact tracked for ${username}: ${wasteCollected}kg waste, ${impact.co2Saved}kg CO2 saved`);

        } catch (error) {
            console.error('Failed to track environmental impact:', error);
        }
    }

    /**
     * Store environmental impact data in database
     * @param {string} username - User
     * @param {string} eventId - Event ID
     * @param {number} wasteCollected - Waste amount
     * @param {Object} impact - Impact calculations
     */
    async storeEnvironmentalImpact(username, eventId, wasteCollected, impact) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO environmental_impact 
                (username, eventId, wasteCollected, co2Saved, waterSaved, energySaved, carbonValue, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                username,
                eventId,
                wasteCollected,
                impact.co2Saved,
                impact.waterSaved, 
                impact.energySaved,
                impact.carbonValue,
                JSON.stringify(impact)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Award points for event participation (to be called from event endpoints)
     * @param {string} username - Participant username
     * @param {string} eventId - Event ID
     * @param {Object} participationData - Additional participation data
     */
    async awardEventParticipation(username, eventId, participationData = {}) {
        try {
            // Check if this is the user's first time participating in this event
            const isFirstTime = await this.isFirstTimeParticipation(username, eventId);
            
            if (isFirstTime) {
                await this.gamificationService.awardPoints(
                    username,
                    'event_participation',
                    eventId,
                    {
                        firstTime: true,
                        ...participationData
                    }
                );

                // Update streak
                await this.gamificationService.updateStreak(username);

                // Check for early bird bonus (if event is today)
                const isEarlyBird = await this.checkEarlyBirdBonus(eventId);
                if (isEarlyBird) {
                    this.emitter.emit('action:first_time', {
                        username,
                        action: 'early_bird_participation',
                        metadata: { eventId }
                    });
                }
            }

            return { success: true, firstTime: isFirstTime };

        } catch (error) {
            console.error('Failed to award event participation:', error);
            throw error;
        }
    }

    /**
     * Check if this is user's first participation in this event
     * @param {string} username - User
     * @param {string} eventId - Event ID
     * @returns {Promise<boolean>} Whether this is first time
     */
    async isFirstTimeParticipation(username, eventId) {
        return new Promise((resolve) => {
            this.db.get(
                'SELECT id FROM user_actions WHERE username = ? AND action = ? AND eventId = ?',
                [username, 'event_participation', eventId],
                (err, row) => {
                    resolve(!row); // First time if no record found
                }
            );
        });
    }

    /**
     * Check if event qualifies for early bird bonus
     * @param {string} eventId - Event ID
     * @returns {Promise<boolean>} Whether early bird applies
     */
    async checkEarlyBirdBonus(eventId) {
        return new Promise((resolve) => {
            this.db.get(
                'SELECT date, createdAt FROM events WHERE id = ?',
                [eventId],
                (err, event) => {
                    if (err || !event) {
                        resolve(false);
                        return;
                    }

                    const eventDate = new Date(event.date);
                    const createdDate = new Date(event.createdAt);
                    const now = new Date();

                    // Early bird if participating within 1 hour of event creation
                    const timeDiff = now.getTime() - createdDate.getTime();
                    const oneHour = 60 * 60 * 1000;

                    resolve(timeDiff <= oneHour);
                }
            );
        });
    }

    /**
     * Award points for photo uploads with GPS and AI analysis bonuses
     * @param {string} username - User who uploaded
     * @param {string} eventId - Event ID
     * @param {Object} photoData - Photo metadata
     */
    async awardPhotoUpload(username, eventId, photoData) {
        try {
            const { hasGPS, aiAnalysis, photoType, location } = photoData;

            this.emitter.emit('photo:uploaded', {
                username,
                eventId,
                photoType,
                hasGPS,
                aiAnalysis,
                location
            });

            return { success: true };

        } catch (error) {
            console.error('Failed to award photo upload points:', error);
            throw error;
        }
    }

    /**
     * Award points for cleanup progress updates
     * @param {string} username - User submitting progress
     * @param {string} eventId - Event ID
     * @param {Object} progressData - Progress data
     */
    async awardProgressUpdate(username, eventId, progressData) {
        try {
            const { wasteCollected, hasPhotos, notes } = progressData;

            this.emitter.emit('progress:updated', {
                username,
                eventId,
                wasteCollected,
                hasPhotos: hasPhotos || false,
                hasNotes: notes && notes.length > 0
            });

            return { success: true };

        } catch (error) {
            console.error('Failed to award progress update points:', error);
            throw error;
        }
    }

    /**
     * Get user's gamification summary
     * @param {string} username - User to get summary for
     * @returns {Promise<Object>} User's gamification stats
     */
    async getUserGamificationSummary(username) {
        try {
            const [
                userStats,
                recentAchievements,
                currentLevel,
                streakInfo,
                environmentalImpact
            ] = await Promise.all([
                this.gamificationService.getUserStats(username),
                this.gamificationService.getRecentAchievements(username, 3),
                this.gamificationService.getCurrentLevel(username),
                this.gamificationService.getStreakInfo(username),
                this.gamificationService.getEnvironmentalImpact(username)
            ]);

            return {
                stats: userStats,
                recentAchievements,
                level: currentLevel,
                streak: streakInfo,
                environmentalImpact
            };

        } catch (error) {
            console.error('Failed to get user gamification summary:', error);
            throw error;
        }
    }

    /**
     * Initialize user gamification profile (called when user signs up)
     * @param {string} username - New user
     */
    async initializeUserProfile(username) {
        try {
            // Initialize level
            await this.gamificationService.initializeUserLevel(username);
            
            // Initialize streak
            await this.gamificationService.initializeUserStreak(username);

            console.log(`Gamification profile initialized for ${username}`);

            return { success: true };

        } catch (error) {
            console.error('Failed to initialize user gamification profile:', error);
            throw error;
        }
    }
}

module.exports = GamificationIntegration;