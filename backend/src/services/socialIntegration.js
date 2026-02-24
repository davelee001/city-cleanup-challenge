/**
 * Social Features Integration Service (v3.0)
 * Integrates social features with existing systems (events, gamification, notifications)
 * Date: February 24, 2026
 */

const Database = require('better-sqlite3');
const path = require('path');
const SocialService = require('./socialService');
const GamificationService = require('./gamificationService');

class SocialIntegrationService {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '../../../database.db');
        this.db = null;
        this.socialService = new SocialService(dbPath);
        this.gamificationService = new GamificationService(dbPath);
        this.setupDatabase();
    }

    setupDatabase() {
        try {
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
        } catch (error) {
            console.error('❌ Social Integration Service database setup failed:', error.message);
            throw error;
        }
    }

    // =================== EVENT INTEGRATION ===================

    /**
     * Handle user event participation - update social features
     */
    async handleEventParticipation(eventId, userId, participationData = {}) {
        try {
            console.log(`🎯 Handling event participation for user ${userId} in event ${eventId}`);

            // Update team stats if user is part of teams
            await this.updateTeamEventStats(userId, eventId, participationData);

            // Update challenge progress if relevant
            await this.updateChallengeProgressFromEvent(userId, eventId, participationData);

            // Create social post if user wants to share
            if (participationData.shareToSocial) {
                await this.createEventParticipationPost(userId, eventId, participationData);
            }

            // Check for team achievements
            await this.checkTeamAchievements(userId, eventId);

            return {
                success: true,
                message: 'Event participation integrated with social features'
            };
        } catch (error) {
            console.error('❌ Error in handleEventParticipation:', error.message);
            return {
                success: false,
                message: 'Failed to integrate event participation',
                error: error.message
            };
        }
    }

    /**
     * Update team statistics when member participates in event
     */
    async updateTeamEventStats(userId, eventId, participationData) {
        try {
            // Get user's teams
            const userTeams = await this.socialService.getUserTeams(userId);
            
            if (userTeams.success && userTeams.teams.length > 0) {
                for (const team of userTeams.teams) {
                    // Update team event count
                    this.db.prepare(`
                        UPDATE teams 
                        SET total_events = total_events + 1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(team.id);

                    // Update team member stats
                    this.db.prepare(`
                        UPDATE team_memberships 
                        SET events_attended = events_attended + 1,
                            last_activity = CURRENT_TIMESTAMP,
                            contribution_points = contribution_points + ?
                        WHERE team_id = ? AND user_id = ?
                    `).run(participationData.pointsEarned || 50, team.id, userId);

                    // Update team waste collection if provided
                    if (participationData.wasteCollected) {
                        this.db.prepare(`
                            UPDATE teams 
                            SET total_waste_collected = total_waste_collected + ?,
                                total_points = total_points + ?
                            WHERE id = ?
                        `).run(participationData.wasteCollected, participationData.pointsEarned || 50, team.id);
                    }

                    console.log(`📊 Updated team ${team.id} stats for user ${userId}`);
                }
            }
        } catch (error) {
            console.error('❌ Error updating team event stats:', error.message);
        }
    }

    /**
     * Update challenge progress when user participates in relevant event
     */
    async updateChallengeProgressFromEvent(userId, eventId, participationData) {
        try {
            // Get user's active challenges
            const activeWasteChallenge = this.db.prepare(`
                SELECT cp.*, c.target_metric, c.target_value
                FROM challenge_participants cp
                JOIN challenges c ON cp.challenge_id = c.id
                WHERE cp.user_id = ? AND cp.is_active = 1 AND cp.is_completed = 0
                AND c.category = 'waste_collection' AND c.end_date > CURRENT_TIMESTAMP
            `).all(userId);

            const activeParticipationChallenge = this.db.prepare(`
                SELECT cp.*, c.target_metric, c.target_value
                FROM challenge_participants cp
                JOIN challenges c ON cp.challenge_id = c.id
                WHERE cp.user_id = ? AND cp.is_active = 1 AND cp.is_completed = 0
                AND c.category = 'participation' AND c.end_date > CURRENT_TIMESTAMP
            `).all(userId);

            // Update waste collection challenges
            for (const challenge of activeWasteChallenge) {
                if (participationData.wasteCollected && challenge.target_metric === 'waste_kg') {
                    const newProgress = challenge.current_progress + participationData.wasteCollected;
                    await this.socialService.updateChallengeProgress(
                        challenge.challenge_id, 
                        userId, 
                        newProgress,
                        { lastEventId: eventId, wasteAdded: participationData.wasteCollected }
                    );
                    console.log(`📈 Updated waste challenge ${challenge.challenge_id} progress: +${participationData.wasteCollected}kg`);
                }
            }

            // Update participation challenges
            for (const challenge of activeParticipationChallenge) {
                if (challenge.target_metric === 'events_count') {
                    const newProgress = challenge.current_progress + 1;
                    await this.socialService.updateChallengeProgress(
                        challenge.challenge_id, 
                        userId, 
                        newProgress,
                        { lastEventId: eventId, eventsAdded: 1 }
                    );
                    console.log(`📈 Updated participation challenge ${challenge.challenge_id} progress: +1 event`);
                }
            }
        } catch (error) {
            console.error('❌ Error updating challenge progress from event:', error.message);
        }
    }

    /**
     * Create social post for event participation
     */
    async createEventParticipationPost(userId, eventId, participationData) {
        try {
            // Get event details
            const event = this.db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
            
            if (!event) return;

            const postContent = this.generateEventParticipationContent(event, participationData);
            
            const postData = {
                user_id: userId,
                event_id: eventId,
                post_type: 'event_share',
                content: postContent,
                privacy_level: 'public',
                location_data: event.location ? { location: event.location } : null
            };

            const result = await this.socialService.createSocialPost(postData);
            
            if (result.success) {
                console.log(`📱 Created social post for event participation: ${result.post_id}`);
            }
        } catch (error) {
            console.error('❌ Error creating event participation post:', error.message);
        }
    }

    /**
     * Generate content for event participation posts
     */
    generateEventParticipationContent(event, participationData) {
        const messages = [
            `Just participated in "${event.title}"! 🌱`,
            `Making a difference at "${event.title}" today! 🌍`,
            `Proud to be part of "${event.title}" cleanup! ♻️`,
            `Contributing to a cleaner environment at "${event.title}"! 🌿`
        ];

        let content = messages[Math.floor(Math.random() * messages.length)];

        if (participationData.wasteCollected) {
            content += `\n\n📊 Collected ${participationData.wasteCollected}kg of waste!`;
        }

        if (participationData.pointsEarned) {
            content += `\n🎯 Earned ${participationData.pointsEarned} points for environmental impact!`;
        }

        content += '\n\n#CleanupChallenge #EnvironmentalAction #CityCleanup';

        return content;
    }

    /**
     * Check and award team achievements
     */
    async checkTeamAchievements(userId, eventId) {
        try {
            const userTeams = await this.socialService.getUserTeams(userId);
            
            if (userTeams.success) {
                for (const team of userTeams.teams) {
                    // Check if team reached milestones
                    if (team.total_events === 10) {
                        await this.awardTeamAchievement(team.id, 'Team Event Organizer', 'Organized 10 successful cleanup events as a team');
                    }
                    
                    if (team.total_waste_collected >= 100) {
                        await this.awardTeamAchievement(team.id, 'Team Environmental Impact', 'Collected over 100kg of waste as a team');
                    }

                    if (team.current_members >= 25) {
                        await this.awardTeamAchievement(team.id, 'Community Builder', 'Built a team of 25+ active environmental advocates');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error checking team achievements:', error.message);
        }
    }

    /**
     * Award achievement to all team members
     */
    async awardTeamAchievement(teamId, title, description) {
        try {
            // Get all team members
            const teamMembers = this.db.prepare(`
                SELECT user_id FROM team_memberships 
                WHERE team_id = ? AND join_status = 'accepted' AND is_active = 1
            `).all(teamId);

            // Award achievement to each member
            for (const member of teamMembers) {
                await this.gamificationService.checkAndAwardCustomAchievement(
                    member.user_id,
                    title,
                    description,
                    200 // 200 points for team achievements
                );

                // Create notification
                await this.socialService.createNotification({
                    recipient_id: member.user_id,
                    notification_type: 'achievement_unlocked',
                    title: 'Team Achievement Unlocked!',
                    message: `Your team earned: ${title}`,
                    related_id: teamId
                });
            }

            console.log(`🏆 Awarded team achievement "${title}" to ${teamMembers.length} members`);
        } catch (error) {
            console.error('❌ Error awarding team achievement:', error.message);
        }
    }

    // =================== SOCIAL ENGAGEMENT INTEGRATION ===================

    /**
     * Handle social engagement events (likes, comments, shares)
     */
    async handleSocialEngagement(engagementType, userId, targetData) {
        try {
            // Award gamification points for social engagement
            const pointsMap = {
                'like': 2,
                'comment': 5,
                'share': 8,
                'post': 15,
                'team_join': 25
            };

            const points = pointsMap[engagementType] || 0;
            
            if (points > 0) {
                await this.gamificationService.awardPoints(userId, points, `social_${engagementType}`);
                console.log(`🎯 Awarded ${points} points for ${engagementType}`);
            }

            // Update user engagement streak
            await this.updateEngagementStreak(userId);

            // Check for social engagement achievements
            await this.checkSocialAchievements(userId, engagementType);

            return {
                success: true,
                pointsAwarded: points
            };
        } catch (error) {
            console.error('❌ Error handling social engagement:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update user's social engagement streak
     */
    async updateEngagementStreak(userId) {
        try {
            // Check if user has engaged today
            const today = new Date().toISOString().split('T')[0];
            
            const todayEngagement = this.db.prepare(`
                SELECT COUNT(*) as count FROM (
                    SELECT created_at FROM social_posts WHERE user_id = ? AND DATE(created_at) = ?
                    UNION ALL
                    SELECT created_at FROM post_comments WHERE user_id = ? AND DATE(created_at) = ?
                    UNION ALL
                    SELECT created_at FROM post_likes WHERE user_id = ? AND DATE(created_at) = ?
                )
            `).get(userId, today, userId, today, userId, today);

            if (todayEngagement.count > 0) {
                // User engaged today, update or create streak record
                const existingStreak = this.db.prepare(`
                    SELECT * FROM user_streaks WHERE user_id = ? AND streak_type = 'social_engagement'
                `).get(userId);

                if (existingStreak) {
                    // Update existing streak
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayDate = yesterday.toISOString().split('T')[0];

                    if (existingStreak.last_activity_date === yesterdayDate || existingStreak.last_activity_date === today) {
                        // Continue streak
                        this.db.prepare(`
                            UPDATE user_streaks 
                            SET current_streak = current_streak + 1,
                                last_activity_date = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = ? AND streak_type = 'social_engagement'
                        `).run(today, userId);
                    } else {
                        // Reset streak
                        this.db.prepare(`
                            UPDATE user_streaks 
                            SET current_streak = 1,
                                last_activity_date = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = ? AND streak_type = 'social_engagement'
                        `).run(today, userId);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error updating engagement streak:', error.message);
        }
    }

    /**
     * Check and award social engagement achievements
     */
    async checkSocialAchievements(userId, engagementType) {
        try {
            const stats = await this.socialService.getUserSocialStats(userId);
            
            if (!stats.success) return;

            const { posts_count, likes_received, comments_made, teams_count } = stats.stats;

            // Post creation achievements
            if (posts_count === 1) {
                await this.gamificationService.checkAndAwardCustomAchievement(
                    userId, 'First Social Post', 'Created your first social media post', 25
                );
            } else if (posts_count === 10) {
                await this.gamificationService.checkAndAwardCustomAchievement(
                    userId, 'Social Storyteller', 'Shared 10 environmental stories', 100
                );
            } else if (posts_count === 50) {
                await this.gamificationService.checkAndAwardCustomAchievement(
                    userId, 'Community Influencer', 'Created 50+ engaging social posts', 300
                );
            }

            // Community engagement achievements
            if (likes_received >= 100) {
                await this.gamificationService.checkAndAwardCustomAchievement(
                    userId, 'Popular Contributor', 'Received 100+ likes on posts', 150
                );
            }

            // Team participation achievements
            if (teams_count === 1) {
                await this.gamificationService.checkAndAwardCustomAchievement(
                    userId, 'Team Player', 'Joined your first cleanup team', 50
                );
            } else if (teams_count >= 5) {
                await this.gamificationService.checkAndAwardCustomAchievement(
                    userId, 'Network Builder', 'Active member of 5+ teams', 200
                );
            }

            console.log(`🏆 Checked social achievements for user ${userId}`);
        } catch (error) {
            console.error('❌ Error checking social achievements:', error.message);
        }
    }

    // =================== NOTIFICATION INTEGRATION ===================

    /**
     * Send notification when user receives social interaction
     */
    async sendSocialNotification(recipientId, senderId, notificationType, details) {
        try {
            const notificationMessages = {
                'post_like': 'liked your post',
                'post_comment': 'commented on your post',
                'post_share': 'shared your post',
                'team_invite': 'invited you to join their team',
                'challenge_invite': 'invited you to join a challenge',
                'new_follower': 'started following you'
            };

            const message = notificationMessages[notificationType] || 'interacted with your content';

            await this.socialService.createNotification({
                recipient_id: recipientId,
                sender_id: senderId,
                notification_type: notificationType,
                title: 'Social Interaction',
                message: message,
                action_url: details.actionUrl || null,
                related_id: details.relatedId || null
            });

            console.log(`🔔 Sent notification to user ${recipientId}: ${message}`);
        } catch (error) {
            console.error('❌ Error sending social notification:', error.message);
        }
    }

    // =================== STATISTICS AND REPORTING ===================

    /**
     * Get comprehensive social statistics for dashboard
     */
    async getSocialDashboardStats(userId) {
        try {
            const [personalStats, teamStats, challengeStats] = await Promise.all([
                this.socialService.getUserSocialStats(userId),
                this.getPersonalTeamStats(userId),
                this.getPersonalChallengeStats(userId)
            ]);

            return {
                success: true,
                dashboard: {
                    personal: personalStats.success ? personalStats.stats : {},
                    teams: teamStats,
                    challenges: challengeStats,
                    engagement: await this.getEngagementMetrics(userId)
                }
            };
        } catch (error) {
            console.error('❌ Error getting social dashboard stats:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get personal team statistics
     */
    async getPersonalTeamStats(userId) {
        try {
            const teamStats = this.db.prepare(`
                SELECT 
                    COUNT(*) as teams_joined,
                    SUM(tm.contribution_points) as total_contribution_points,
                    SUM(tm.events_attended) as total_events_with_teams,
                    AVG(t.total_waste_collected) as avg_team_waste
                FROM team_memberships tm
                JOIN teams t ON tm.team_id = t.id
                WHERE tm.user_id = ? AND tm.join_status = 'accepted' AND tm.is_active = 1
            `).get(userId);

            return teamStats || {};
        } catch (error) {
            console.error('❌ Error getting team stats:', error.message);
            return {};
        }
    }

    /**
     * Get personal challenge statistics
     */
    async getPersonalChallengeStats(userId) {
        try {
            const challengeStats = this.db.prepare(`
                SELECT 
                    COUNT(*) as total_challenges,
                    SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_challenges,
                    AVG(current_progress) as avg_progress,
                    SUM(bonus_points) as total_bonus_points
                FROM challenge_participants
                WHERE user_id = ? AND is_active = 1
            `).get(userId);

            return challengeStats || {};
        } catch (error) {
            console.error('❌ Error getting challenge stats:', error.message);
            return {};
        }
    }

    /**
     * Get engagement metrics
     */
    async getEngagementMetrics(userId) {
        try {
            const engagementMetrics = {
                weekly_posts: this.db.prepare(`
                    SELECT COUNT(*) as count FROM social_posts 
                    WHERE user_id = ? AND created_at > datetime('now', '-7 days')
                `).get(userId).count,
                
                weekly_interactions: this.db.prepare(`
                    SELECT COUNT(*) as count FROM (
                        SELECT created_at FROM post_likes WHERE user_id = ? AND created_at > datetime('now', '-7 days')
                        UNION ALL
                        SELECT created_at FROM post_comments WHERE user_id = ? AND created_at > datetime('now', '-7 days')
                    )
                `).get(userId, userId).count,

                current_social_streak: this.db.prepare(`
                    SELECT current_streak FROM user_streaks 
                    WHERE user_id = ? AND streak_type = 'social_engagement'
                `).get(userId)?.current_streak || 0
            };

            return engagementMetrics;
        } catch (error) {
            console.error('❌ Error getting engagement metrics:', error.message);
            return {};
        }
    }
}

module.exports = SocialIntegrationService;