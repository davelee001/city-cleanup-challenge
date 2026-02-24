/**
 * Enhanced Social Features Service (v3.0)
 * Comprehensive social platform for environmental cleanup collaboration
 * Features: Teams, Social Feeds, Challenges, Community Recognition
 * Date: February 24, 2026
 */

const Database = require('better-sqlite3');
const path = require('path');

class SocialService {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '../../../database.db');
        this.db = null;
        this.setupDatabase();
    }

    setupDatabase() {
        try {
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
        } catch (error) {
            console.error('❌ Social Service database setup failed:', error.message);
            throw error;
        }
    }

    // =================== TEAM MANAGEMENT METHODS ===================

    /**
     * Create a new team/group
     */
    async createTeam(teamData) {
        const {
            name, description, creator_id, team_type = 'public',
            max_members = 50, team_avatar, team_color = '#4CAF50',
            tags = [], location
        } = teamData;

        try {
            const stmt = this.db.prepare(`
                INSERT INTO teams (
                    name, description, creator_id, team_type, max_members,
                    team_avatar, team_color, tags, location
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                name, description, creator_id, team_type, max_members,
                team_avatar, team_color, JSON.stringify(tags), location
            );

            // Automatically add creator as owner
            await this.joinTeam(result.lastInsertRowid, creator_id, 'owner', 'accepted', creator_id);

            return {
                success: true,
                team_id: result.lastInsertRowid,
                message: 'Team created successfully'
            };
        } catch (error) {
            console.error('❌ Error creating team:', error.message);
            return {
                success: false,
                message: 'Failed to create team',
                error: error.message
            };
        }
    }

    /**
     * Join a team or send join request
     */
    async joinTeam(teamId, userId, role = 'member', joinStatus = 'pending', invitedBy = null) {
        try {
            // Check if user is already a member
            const existingMembership = this.db.prepare(`
                SELECT * FROM team_memberships 
                WHERE team_id = ? AND user_id = ? AND is_active = 1
            `).get(teamId, userId);

            if (existingMembership) {
                return {
                    success: false,
                    message: 'User is already a member of this team'
                };
            }

            // Check team capacity
            const team = this.db.prepare(`
                SELECT max_members, current_members FROM teams WHERE id = ?
            `).get(teamId);

            if (team.current_members >= team.max_members) {
                return {
                    success: false,
                    message: 'Team has reached maximum capacity'
                };
            }

            // Add membership
            const stmt = this.db.prepare(`
                INSERT INTO team_memberships (
                    team_id, user_id, role, join_status, invited_by
                ) VALUES (?, ?, ?, ?, ?)
            `);

            stmt.run(teamId, userId, role, joinStatus, invitedBy);

            // Update team member count if accepted
            if (joinStatus === 'accepted') {
                this.db.prepare(`
                    UPDATE teams 
                    SET current_members = current_members + 1 
                    WHERE id = ?
                `).run(teamId);
            }

            return {
                success: true,
                message: joinStatus === 'accepted' ? 'Successfully joined team' : 'Join request sent'
            };
        } catch (error) {
            console.error('❌ Error joining team:', error.message);
            return {
                success: false,
                message: 'Failed to join team',
                error: error.message
            };
        }
    }

    /**
     * Get user's teams
     */
    async getUserTeams(userId) {
        try {
            const teams = this.db.prepare(`
                SELECT 
                    t.*,
                    tm.role,
                    tm.join_status,
                    tm.joined_at,
                    tm.contribution_points,
                    tm.events_attended
                FROM teams t
                JOIN team_memberships tm ON t.id = tm.team_id
                WHERE tm.user_id = ? AND tm.is_active = 1 AND t.is_active = 1
                ORDER BY tm.joined_at DESC
            `).all(userId);

            return {
                success: true,
                teams: teams.map(team => ({
                    ...team,
                    tags: JSON.parse(team.tags || '[]')
                }))
            };
        } catch (error) {
            console.error('❌ Error fetching user teams:', error.message);
            return {
                success: false,
                message: 'Failed to fetch teams',
                error: error.message
            };
        }
    }

    /**
     * Get team leaderboard
     */
    async getTeamLeaderboard(limit = 20) {
        try {
            const leaderboard = this.db.prepare(`
                SELECT 
                    id, name, team_avatar, team_color,
                    current_members, total_events, total_waste_collected, total_points,
                    created_at
                FROM teams
                WHERE is_active = 1
                ORDER BY total_points DESC, total_waste_collected DESC
                LIMIT ?
            `).all(limit);

            return {
                success: true,
                leaderboard
            };
        } catch (error) {
            console.error('❌ Error fetching team leaderboard:', error.message);
            return {
                success: false,
                message: 'Failed to fetch team leaderboard',
                error: error.message
            };
        }
    }

    // =================== SOCIAL FEED METHODS ===================

    /**
     * Create a social post
     */
    async createSocialPost(postData) {
        const {
            user_id, team_id, event_id, post_type = 'text',
            content, media_urls = [], tags = [], mentions = [],
            privacy_level = 'public', location_data = null
        } = postData;

        try {
            const stmt = this.db.prepare(`
                INSERT INTO social_posts (
                    user_id, team_id, event_id, post_type, content,
                    media_urls, tags, mentions, privacy_level, location_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                user_id, team_id, event_id, post_type, content,
                JSON.stringify(media_urls), JSON.stringify(tags), JSON.stringify(mentions),
                privacy_level, location_data ? JSON.stringify(location_data) : null
            );

            // Award points for social engagement
            await this.awardSocialPoints(user_id, 'post_created', 15);

            return {
                success: true,
                post_id: result.lastInsertRowid,
                message: 'Post created successfully'
            };
        } catch (error) {
            console.error('❌ Error creating social post:', error.message);
            return {
                success: false,
                message: 'Failed to create post',
                error: error.message
            };
        }
    }

    /**
     * Get social feed for user
     */
    async getSocialFeed(userId, limit = 20, offset = 0, feedType = 'public') {
        try {
            let query;
            let params;

            if (feedType === 'team') {
                // Team feed - posts from user's teams
                query = `
                    SELECT 
                        sp.*,
                        u.username, u.email, u.avatar_url,
                        t.name as team_name, t.team_color,
                        e.title as event_title,
                        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = sp.id) as like_count,
                        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = sp.id AND pc.is_deleted = 0) as comment_count,
                        (SELECT COUNT(*) FROM post_shares ps WHERE ps.post_id = sp.id) as share_count,
                        (SELECT reaction_type FROM post_likes pl WHERE pl.post_id = sp.id AND pl.user_id = ?) as user_reaction
                    FROM social_posts sp
                    JOIN users u ON sp.user_id = u.id
                    LEFT JOIN teams t ON sp.team_id = t.id
                    LEFT JOIN events e ON sp.event_id = e.id
                    WHERE sp.team_id IN (
                        SELECT tm.team_id FROM team_memberships tm 
                        WHERE tm.user_id = ? AND tm.join_status = 'accepted' AND tm.is_active = 1
                    ) AND sp.is_deleted = 0
                    ORDER BY sp.created_at DESC
                    LIMIT ? OFFSET ?
                `;
                params = [userId, userId, limit, offset];
            } else if (feedType === 'following') {
                // Following feed - posts from followed users
                query = `
                    SELECT 
                        sp.*,
                        u.username, u.email, u.avatar_url,
                        t.name as team_name, t.team_color,
                        e.title as event_title,
                        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = sp.id) as like_count,
                        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = sp.id AND pc.is_deleted = 0) as comment_count,
                        (SELECT COUNT(*) FROM post_shares ps WHERE ps.post_id = sp.id) as share_count,
                        (SELECT reaction_type FROM post_likes pl WHERE pl.post_id = sp.id AND pl.user_id = ?) as user_reaction
                    FROM social_posts sp
                    JOIN users u ON sp.user_id = u.id
                    LEFT JOIN teams t ON sp.team_id = t.id
                    LEFT JOIN events e ON sp.event_id = e.id
                    WHERE sp.user_id IN (
                        SELECT fr.following_id FROM follow_relationships fr 
                        WHERE fr.follower_id = ? AND fr.is_active = 1
                    ) AND sp.privacy_level IN ('public', 'friends') AND sp.is_deleted = 0
                    ORDER BY sp.created_at DESC
                    LIMIT ? OFFSET ?
                `;
                params = [userId, userId, limit, offset];
            } else {
                // Public feed - all public posts
                query = `
                    SELECT 
                        sp.*,
                        u.username, u.email, u.avatar_url,
                        t.name as team_name, t.team_color,
                        e.title as event_title,
                        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = sp.id) as like_count,
                        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = sp.id AND pc.is_deleted = 0) as comment_count,
                        (SELECT COUNT(*) FROM post_shares ps WHERE ps.post_id = sp.id) as share_count,
                        (SELECT reaction_type FROM post_likes pl WHERE pl.post_id = sp.id AND pl.user_id = ?) as user_reaction
                    FROM social_posts sp
                    JOIN users u ON sp.user_id = u.id
                    LEFT JOIN teams t ON sp.team_id = t.id
                    LEFT JOIN events e ON sp.event_id = e.id
                    WHERE sp.privacy_level = 'public' AND sp.is_deleted = 0
                    ORDER BY sp.created_at DESC
                    LIMIT ? OFFSET ?
                `;
                params = [userId, limit, offset];
            }

            const posts = this.db.prepare(query).all(...params);

            return {
                success: true,
                posts: posts.map(post => ({
                    ...post,
                    media_urls: JSON.parse(post.media_urls || '[]'),
                    tags: JSON.parse(post.tags || '[]'),
                    mentions: JSON.parse(post.mentions || '[]'),
                    location_data: post.location_data ? JSON.parse(post.location_data) : null
                }))
            };
        } catch (error) {
            console.error('❌ Error fetching social feed:', error.message);
            return {
                success: false,
                message: 'Failed to fetch feed',
                error: error.message
            };
        }
    }

    /**
     * Like/react to a post
     */
    async likePost(postId, userId, reactionType = 'like') {
        try {
            // Check if user already liked this post
            const existingLike = this.db.prepare(`
                SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?
            `).get(postId, userId);

            if (existingLike) {
                if (existingLike.reaction_type === reactionType) {
                    // Remove like
                    this.db.prepare(`
                        DELETE FROM post_likes WHERE post_id = ? AND user_id = ?
                    `).run(postId, userId);

                    // Update post like count
                    this.db.prepare(`
                        UPDATE social_posts SET like_count = like_count - 1 WHERE id = ?
                    `).run(postId);

                    return {
                        success: true,
                        action: 'unliked',
                        message: 'Post unliked successfully'
                    };
                } else {
                    // Update reaction type
                    this.db.prepare(`
                        UPDATE post_likes SET reaction_type = ? WHERE post_id = ? AND user_id = ?
                    `).run(reactionType, postId, userId);

                    return {
                        success: true,
                        action: 'updated',
                        message: 'Reaction updated successfully'
                    };
                }
            } else {
                // Add new like
                this.db.prepare(`
                    INSERT INTO post_likes (post_id, user_id, reaction_type) VALUES (?, ?, ?)
                `).run(postId, userId, reactionType);

                // Update post like count
                this.db.prepare(`
                    UPDATE social_posts SET like_count = like_count + 1 WHERE id = ?
                `).run(postId);

                // Award points for engagement
                await this.awardSocialPoints(userId, 'post_liked', 5);

                return {
                    success: true,
                    action: 'liked',
                    message: 'Post liked successfully'
                };
            }
        } catch (error) {
            console.error('❌ Error liking post:', error.message);
            return {
                success: false,
                message: 'Failed to like post',
                error: error.message
            };
        }
    }

    /**
     * Comment on a post
     */
    async commentOnPost(postId, userId, content, parentCommentId = null, mediaUrl = null) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO post_comments (
                    post_id, user_id, parent_comment_id, content, media_url
                ) VALUES (?, ?, ?, ?, ?)
            `);

            const result = stmt.run(postId, userId, parentCommentId, content, mediaUrl);

            // Update post comment count
            this.db.prepare(`
                UPDATE social_posts SET comment_count = comment_count + 1 WHERE id = ?
            `).run(postId);

            // Award points for engagement
            await this.awardSocialPoints(userId, 'comment_created', 10);

            return {
                success: true,
                comment_id: result.lastInsertRowid,
                message: 'Comment added successfully'
            };
        } catch (error) {
            console.error('❌ Error commenting on post:', error.message);
            return {
                success: false,
                message: 'Failed to add comment',
                error: error.message
            };
        }
    }

    /**
     * Share a post
     */
    async sharePost(postId, userId, shareType = 'internal', shareMessage = null, sharedToTeamId = null) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO post_shares (
                    post_id, user_id, share_type, share_message, shared_to_team_id
                ) VALUES (?, ?, ?, ?, ?)
            `);

            stmt.run(postId, userId, shareType, shareMessage, sharedToTeamId);

            // Update post share count
            this.db.prepare(`
                UPDATE social_posts SET share_count = share_count + 1 WHERE id = ?
            `).run(postId);

            // Award points for engagement
            await this.awardSocialPoints(userId, 'post_shared', 8);

            return {
                success: true,
                message: 'Post shared successfully'
            };
        } catch (error) {
            console.error('❌ Error sharing post:', error.message);
            return {
                success: false,
                message: 'Failed to share post',
                error: error.message
            };
        }
    }

    // =================== CHALLENGE METHODS ===================

    /**
     * Create a new challenge
     */
    async createChallenge(challengeData) {
        const {
            creator_id, title, description, challenge_type = 'individual',
            category = 'waste_collection', target_metric, target_value,
            reward_points = 0, start_date, end_date, max_participants = 100,
            challenge_rules = {}, difficulty_level = 'medium',
            is_public = true, banner_image = null
        } = challengeData;

        try {
            const stmt = this.db.prepare(`
                INSERT INTO challenges (
                    creator_id, title, description, challenge_type, category,
                    target_metric, target_value, reward_points, start_date, end_date,
                    max_participants, challenge_rules, difficulty_level, is_public, banner_image
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                creator_id, title, description, challenge_type, category,
                target_metric, target_value, reward_points, start_date, end_date,
                max_participants, JSON.stringify(challenge_rules), difficulty_level, is_public, banner_image
            );

            // Automatically join creator to challenge
            if (challenge_type === 'individual') {
                await this.joinChallenge(result.lastInsertRowid, creator_id);
            }

            return {
                success: true,
                challenge_id: result.lastInsertRowid,
                message: 'Challenge created successfully'
            };
        } catch (error) {
            console.error('❌ Error creating challenge:', error.message);
            return {
                success: false,
                message: 'Failed to create challenge',
                error: error.message
            };
        }
    }

    /**
     * Join a challenge
     */
    async joinChallenge(challengeId, userId, teamId = null) {
        try {
            // Check if already participating
            const existingParticipation = this.db.prepare(`
                SELECT * FROM challenge_participants 
                WHERE challenge_id = ? AND (user_id = ? OR team_id = ?) AND is_active = 1
            `).get(challengeId, userId, teamId);

            if (existingParticipation) {
                return {
                    success: false,
                    message: 'Already participating in this challenge'
                };
            }

            // Check challenge capacity
            const challenge = this.db.prepare(`
                SELECT max_participants, current_participants, start_date, end_date 
                FROM challenges WHERE id = ?
            `).get(challengeId);

            if (challenge.current_participants >= challenge.max_participants) {
                return {
                    success: false,
                    message: 'Challenge has reached maximum capacity'
                };
            }

            // Check if challenge is still active
            const now = new Date().toISOString();
            if (now > challenge.end_date) {
                return {
                    success: false,
                    message: 'Challenge has already ended'
                };
            }

            // Add participation
            const stmt = this.db.prepare(`
                INSERT INTO challenge_participants (
                    challenge_id, user_id, team_id
                ) VALUES (?, ?, ?)
            `);

            stmt.run(challengeId, userId, teamId);

            // Update challenge participant count
            this.db.prepare(`
                UPDATE challenges 
                SET current_participants = current_participants + 1 
                WHERE id = ?
            `).run(challengeId);

            return {
                success: true,
                message: 'Successfully joined challenge'
            };
        } catch (error) {
            console.error('❌ Error joining challenge:', error.message);
            return {
                success: false,
                message: 'Failed to join challenge',
                error: error.message
            };
        }
    }

    /**
     * Get active challenges
     */
    async getActiveChallenges(userId = null, limit = 20, offset = 0) {
        try {
            const now = new Date().toISOString();
            
            let query = `
                SELECT 
                    c.*,
                    u.username as creator_username,
                    ${userId ? '(SELECT 1 FROM challenge_participants cp WHERE cp.challenge_id = c.id AND cp.user_id = ?) as is_participating,' : ''}
                    (SELECT COUNT(*) FROM challenge_participants cp WHERE cp.challenge_id = c.id AND cp.is_active = 1) as participant_count
                FROM challenges c
                JOIN users u ON c.creator_id = u.id
                WHERE c.is_active = 1 AND c.end_date > ? AND c.is_public = 1
                ORDER BY c.is_featured DESC, c.created_at DESC
                LIMIT ? OFFSET ?
            `;

            let params = userId ? [userId, now, limit, offset] : [now, limit, offset];
            const challenges = this.db.prepare(query).all(...params);

            return {
                success: true,
                challenges: challenges.map(challenge => ({
                    ...challenge,
                    challenge_rules: JSON.parse(challenge.challenge_rules || '{}'),
                    progress_percentage: (challenge.current_progress / challenge.target_value) * 100
                }))
            };
        } catch (error) {
            console.error('❌ Error fetching active challenges:', error.message);
            return {
                success: false,
                message: 'Failed to fetch challenges',
                error: error.message
            };
        }
    }

    /**
     * Update challenge progress
     */
    async updateChallengeProgress(challengeId, userId, progressValue, progressData = {}) {
        try {
            const stmt = this.db.prepare(`
                UPDATE challenge_participants 
                SET current_progress = ?, progress_data = ?, 
                    is_completed = CASE WHEN current_progress >= (
                        SELECT target_value FROM challenges WHERE id = ?
                    ) THEN 1 ELSE 0 END,
                    completion_date = CASE WHEN current_progress >= (
                        SELECT target_value FROM challenges WHERE id = ?
                    ) THEN CURRENT_TIMESTAMP ELSE completion_date END
                WHERE challenge_id = ? AND user_id = ?
            `);

            stmt.run(
                progressValue, JSON.stringify(progressData), 
                challengeId, challengeId, challengeId, userId
            );

            return {
                success: true,
                message: 'Challenge progress updated'
            };
        } catch (error) {
            console.error('❌ Error updating challenge progress:', error.message);
            return {
                success: false,
                message: 'Failed to update progress',
                error: error.message
            };
        }
    }

    // =================== COMMUNITY RECOGNITION METHODS ===================

    /**
     * Nominate user for community recognition
     */
    async nominateForRecognition(nominationData) {
        const {
            recipient_id, nominator_id, recognition_type, title,
            description, month = null, year = null
        } = nominationData;

        try {
            const stmt = this.db.prepare(`
                INSERT INTO community_recognition (
                    recipient_id, nominator_id, recognition_type, title,
                    description, month, year
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                recipient_id, nominator_id, recognition_type, title,
                description, month, year
            );

            return {
                success: true,
                recognition_id: result.lastInsertRowid,
                message: 'Nomination submitted successfully'
            };
        } catch (error) {
            console.error('❌ Error submitting nomination:', error.message);
            return {
                success: false,
                message: 'Failed to submit nomination',
                error: error.message
            };
        }
    }

    /**
     * Get community recognition winners
     */
    async getCommunityRecognition(limit = 10, month = null, year = null) {
        try {
            let query = `
                SELECT 
                    cr.*,
                    u.username, u.email, u.avatar_url,
                    n.username as nominator_username
                FROM community_recognition cr
                JOIN users u ON cr.recipient_id = u.id
                LEFT JOIN users n ON cr.nominator_id = n.id
                WHERE cr.is_active = 1 AND cr.approved_at IS NOT NULL
            `;

            let params = [];

            if (month && year) {
                query += ' AND cr.month = ? AND cr.year = ?';
                params.push(month, year);
            }

            query += ' ORDER BY cr.is_featured DESC, cr.approved_at DESC LIMIT ?';
            params.push(limit);

            const recognitions = this.db.prepare(query).all(...params);

            return {
                success: true,
                recognitions
            };
        } catch (error) {
            console.error('❌ Error fetching community recognition:', error.message);
            return {
                success: false,
                message: 'Failed to fetch recognition',
                error: error.message
            };
        }
    }

    // =================== NOTIFICATION METHODS ===================

    /**
     * Create social notification
     */
    async createNotification(notificationData) {
        const {
            recipient_id, sender_id, notification_type, title,
            message, action_url = null, related_id = null
        } = notificationData;

        try {
            const stmt = this.db.prepare(`
                INSERT INTO social_notifications (
                    recipient_id, sender_id, notification_type, title,
                    message, action_url, related_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(recipient_id, sender_id, notification_type, title, message, action_url, related_id);

            return {
                success: true,
                message: 'Notification created successfully'
            };
        } catch (error) {
            console.error('❌ Error creating notification:', error.message);
            return {
                success: false,
                message: 'Failed to create notification',
                error: error.message
            };
        }
    }

    /**
     * Get user notifications
     */
    async getUserNotifications(userId, limit = 20, unreadOnly = false) {
        try {
            let query = `
                SELECT 
                    sn.*,
                    u.username as sender_username,
                    u.avatar_url as sender_avatar
                FROM social_notifications sn
                LEFT JOIN users u ON sn.sender_id = u.id
                WHERE sn.recipient_id = ? AND sn.is_deleted = 0
            `;

            let params = [userId];

            if (unreadOnly) {
                query += ' AND sn.is_read = 0';
            }

            query += ' ORDER BY sn.created_at DESC LIMIT ?';
            params.push(limit);

            const notifications = this.db.prepare(query).all(...params);

            return {
                success: true,
                notifications
            };
        } catch (error) {
            console.error('❌ Error fetching notifications:', error.message);
            return {
                success: false,
                message: 'Failed to fetch notifications',
                error: error.message
            };
        }
    }

    // =================== FOLLOW/FRIENDSHIP METHODS ===================

    /**
     * Follow/unfollow a user
     */
    async followUser(followerId, followingId, followType = 'follow') {
        try {
            // Check if already following
            const existingFollow = this.db.prepare(`
                SELECT * FROM follow_relationships 
                WHERE follower_id = ? AND following_id = ? AND is_active = 1
            `).get(followerId, followingId);

            if (existingFollow) {
                // Unfollow
                this.db.prepare(`
                    UPDATE follow_relationships 
                    SET is_active = 0 
                    WHERE follower_id = ? AND following_id = ?
                `).run(followerId, followingId);

                return {
                    success: true,
                    action: 'unfollowed',
                    message: 'Successfully unfollowed user'
                };
            } else {
                // Follow
                this.db.prepare(`
                    INSERT OR REPLACE INTO follow_relationships (
                        follower_id, following_id, follow_type, is_active
                    ) VALUES (?, ?, ?, 1)
                `).run(followerId, followingId, followType);

                // Create notification
                await this.createNotification({
                    recipient_id: followingId,
                    sender_id: followerId,
                    notification_type: 'new_follower',
                    title: 'New Follower',
                    message: 'started following you',
                    related_id: followerId
                });

                return {
                    success: true,
                    action: 'followed',
                    message: 'Successfully followed user'
                };
            }
        } catch (error) {
            console.error('❌ Error following/unfollowing user:', error.message);
            return {
                success: false,
                message: 'Failed to follow/unfollow user',
                error: error.message
            };
        }
    }

    /**
     * Award social engagement points
     */
    async awardSocialPoints(userId, actionType, points) {
        try {
            // This would integrate with the existing gamification system
            // For now, we'll just log the points award
            console.log(`🎯 Awarding ${points} points to user ${userId} for ${actionType}`);
            return true;
        } catch (error) {
            console.error('❌ Error awarding social points:', error.message);
            return false;
        }
    }

    /**
     * Get social statistics for a user
     */
    async getUserSocialStats(userId) {
        try {
            const stats = {
                posts_count: this.db.prepare('SELECT COUNT(*) as count FROM social_posts WHERE user_id = ? AND is_deleted = 0').get(userId).count,
                likes_received: this.db.prepare('SELECT SUM(like_count) as total FROM social_posts WHERE user_id = ? AND is_deleted = 0').get(userId).total || 0,
                comments_made: this.db.prepare('SELECT COUNT(*) as count FROM post_comments WHERE user_id = ? AND is_deleted = 0').get(userId).count,
                teams_count: this.db.prepare('SELECT COUNT(*) as count FROM team_memberships WHERE user_id = ? AND join_status = "accepted" AND is_active = 1').get(userId).count,
                challenges_active: this.db.prepare('SELECT COUNT(*) as count FROM challenge_participants WHERE user_id = ? AND is_active = 1 AND is_completed = 0').get(userId).count,
                challenges_completed: this.db.prepare('SELECT COUNT(*) as count FROM challenge_participants WHERE user_id = ? AND is_completed = 1').get(userId).count,
                followers_count: this.db.prepare('SELECT COUNT(*) as count FROM follow_relationships WHERE following_id = ? AND is_active = 1').get(userId).count,
                following_count: this.db.prepare('SELECT COUNT(*) as count FROM follow_relationships WHERE follower_id = ? AND is_active = 1').get(userId).count
            };

            return {
                success: true,
                stats
            };
        } catch (error) {
            console.error('❌ Error fetching social stats:', error.message);
            return {
                success: false,
                message: 'Failed to fetch social stats',
                error: error.message
            };
        }
    }
}

module.exports = SocialService;