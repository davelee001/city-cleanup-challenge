/**
 * Enhanced Social Features API Routes (v3.0)
 * Comprehensive social platform API endpoints for environmental cleanup collaboration
 * Features: Teams, Social Feeds, Challenges, Community Recognition
 * Date: February 24, 2026
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const SocialService = require('../services/socialService');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();
const socialService = new SocialService();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/social/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// =================== TEAM MANAGEMENT ROUTES ===================

/**
 * POST /api/social/teams - Create a new team
 */
router.post('/teams', authenticateUser, upload.single('team_avatar'), async (req, res) => {
    try {
        const { name, description, team_type, max_members, team_color, tags, location } = req.body;
        const creator_id = req.user?.id;

        if (!creator_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: 'Team name and description are required'
            });
        }

        const teamData = {
            name,
            description,
            creator_id,
            team_type: team_type || 'public',
            max_members: parseInt(max_members) || 50,
            team_avatar: req.file ? req.file.filename : null,
            team_color: team_color || '#4CAF50',
            tags: tags ? JSON.parse(tags) : [],
            location
        };

        const result = await socialService.createTeam(teamData);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Team created successfully',
                data: { team_id: result.team_id }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in create team route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * GET /api/social/teams - Get user's teams
 */
router.get('/teams', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const result = await socialService.getUserTeams(user_id);

        res.status(200).json({
            success: true,
            message: 'Teams fetched successfully',
            data: result.teams || []
        });
    } catch (error) {
        console.error('❌ Error in get teams route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /api/social/teams/:teamId/join - Join a team
 */
router.post('/teams/:teamId/join', authenticateUser, async (req, res) => {
    try {
        const { teamId } = req.params;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const result = await socialService.joinTeam(
            parseInt(teamId), 
            user_id, 
            'member', 
            'pending'
        );

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in join team route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * GET /api/social/teams/leaderboard - Get team leaderboard
 */
router.get('/teams/leaderboard', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const result = await socialService.getTeamLeaderboard(parseInt(limit));

        res.status(200).json({
            success: true,
            message: 'Team leaderboard fetched successfully',
            data: result.leaderboard || []
        });
    } catch (error) {
        console.error('❌ Error in team leaderboard route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// =================== SOCIAL FEED ROUTES ===================

/**
 * POST /api/social/posts - Create a social post
 */
router.post('/posts', authenticateUser, upload.array('media', 5), async (req, res) => {
    try {
        const { team_id, event_id, post_type, content, tags, mentions, privacy_level, location_data } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Post content is required'
            });
        }

        const media_urls = req.files ? req.files.map(file => file.filename) : [];

        const postData = {
            user_id,
            team_id: team_id ? parseInt(team_id) : null,
            event_id: event_id ? parseInt(event_id) : null,
            post_type: post_type || 'text',
            content,
            media_urls,
            tags: tags ? JSON.parse(tags) : [],
            mentions: mentions ? JSON.parse(mentions) : [],
            privacy_level: privacy_level || 'public',
            location_data: location_data ? JSON.parse(location_data) : null
        };

        const result = await socialService.createSocialPost(postData);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Post created successfully',
                data: { post_id: result.post_id }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in create post route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * GET /api/social/feed - Get social feed
 */
router.get('/feed', authenticateUser, async (req, res) => {
    try {
        const { limit = 20, offset = 0, feed_type = 'public' } = req.query;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const result = await socialService.getSocialFeed(
            user_id,
            parseInt(limit),
            parseInt(offset),
            feed_type
        );

        res.status(200).json({
            success: true,
            message: 'Social feed fetched successfully',
            data: result.posts || []
        });
    } catch (error) {
        console.error('❌ Error in get feed route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /api/social/posts/:postId/like - Like/react to a post
 */
router.post('/posts/:postId/like', authenticateUser, async (req, res) => {
    try {
        const { postId } = req.params;
        const { reaction_type = 'like' } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const result = await socialService.likePost(
            parseInt(postId),
            user_id,
            reaction_type
        );

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message,
                action: result.action
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in like post route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /api/social/posts/:postId/comment - Comment on a post
 */
router.post('/posts/:postId/comment', authenticateUser, upload.single('media'), async (req, res) => {
    try {
        const { postId } = req.params;
        const { content, parent_comment_id } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }

        const result = await socialService.commentOnPost(
            parseInt(postId),
            user_id,
            content,
            parent_comment_id ? parseInt(parent_comment_id) : null,
            req.file ? req.file.filename : null
        );

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Comment added successfully',
                data: { comment_id: result.comment_id }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in comment post route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /api/social/posts/:postId/share - Share a post
 */
router.post('/posts/:postId/share', authenticateUser, async (req, res) => {
    try {
        const { postId } = req.params;
        const { share_type = 'internal', share_message, shared_to_team_id } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const result = await socialService.sharePost(
            parseInt(postId),
            user_id,
            share_type,
            share_message,
            shared_to_team_id ? parseInt(shared_to_team_id) : null
        );

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Post shared successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in share post route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// =================== CHALLENGE SYSTEM ROUTES ===================

/**
 * POST /api/social/challenges - Create a new challenge
 */
router.post('/challenges', authenticateUser, upload.single('banner_image'), async (req, res) => {
    try {
        const {
            title, description, challenge_type, category, target_metric,
            target_value, reward_points, start_date, end_date,
            max_participants, challenge_rules, difficulty_level, is_public
        } = req.body;
        
        const creator_id = req.user?.id;

        if (!creator_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!title || !description || !target_metric || !target_value || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: title, description, target_metric, target_value, start_date, end_date'
            });
        }

        const challengeData = {
            creator_id,
            title,
            description,
            challenge_type: challenge_type || 'individual',
            category: category || 'waste_collection',
            target_metric,
            target_value: parseFloat(target_value),
            reward_points: parseInt(reward_points) || 0,
            start_date,
            end_date,
            max_participants: parseInt(max_participants) || 100,
            challenge_rules: challenge_rules ? JSON.parse(challenge_rules) : {},
            difficulty_level: difficulty_level || 'medium',
            is_public: is_public !== 'false',
            banner_image: req.file ? req.file.filename : null
        };

        const result = await socialService.createChallenge(challengeData);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Challenge created successfully',
                data: { challenge_id: result.challenge_id }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in create challenge route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * GET /api/social/challenges - Get active challenges
 */
router.get('/challenges', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const user_id = req.user?.id;

        const result = await socialService.getActiveChallenges(
            user_id,
            parseInt(limit),
            parseInt(offset)
        );

        res.status(200).json({
            success: true,
            message: 'Challenges fetched successfully',
            data: result.challenges || []
        });
    } catch (error) {
        console.error('❌ Error in get challenges route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /api/social/challenges/:challengeId/join - Join a challenge
 */
router.post('/challenges/:challengeId/join', authenticateUser, async (req, res) => {
    try {
        const { challengeId } = req.params;
        const { team_id } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const result = await socialService.joinChallenge(
            parseInt(challengeId),
            user_id,
            team_id ? parseInt(team_id) : null
        );

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in join challenge route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * PUT /api/social/challenges/:challengeId/progress - Update challenge progress
 */
router.put('/challenges/:challengeId/progress', authenticateUser, async (req, res) => {
    try {
        const { challengeId } = req.params;
        const { progress_value, progress_data } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (progress_value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Progress value is required'
            });
        }

        const result = await socialService.updateChallengeProgress(
            parseInt(challengeId),
            user_id,
            parseFloat(progress_value),
            progress_data || {}
        );

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in update challenge progress route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// =================== COMMUNITY RECOGNITION ROUTES ===================

/**
 * POST /api/social/recognition - Nominate user for community recognition
 */
router.post('/recognition', authenticateUser, async (req, res) => {
    try {
        const {
            recipient_id, recognition_type, title, description, month, year
        } = req.body;
        
        const nominator_id = req.user?.id;

        if (!nominator_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!recipient_id || !recognition_type || !title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: recipient_id, recognition_type, title, description'
            });
        }

        const nominationData = {
            recipient_id: parseInt(recipient_id),
            nominator_id,
            recognition_type,
            title,
            description,
            month: month ? parseInt(month) : null,
            year: year ? parseInt(year) : null
        };

        const result = await socialService.nominateForRecognition(nominationData);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Nomination submitted successfully',
                data: { recognition_id: result.recognition_id }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in nominate recognition route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * GET /api/social/recognition - Get community recognition winners
 */
router.get('/recognition', async (req, res) => {
    try {
        const { limit = 10, month, year } = req.query;

        const result = await socialService.getCommunityRecognition(
            parseInt(limit),
            month ? parseInt(month) : null,
            year ? parseInt(year) : null
        );

        res.status(200).json({
            success: true,
            message: 'Community recognition fetched successfully',
            data: result.recognitions || []
        });
    } catch (error) {
        console.error('❌ Error in get recognition route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// =================== NOTIFICATION ROUTES ===================

/**
 * GET /api/social/notifications - Get user notifications
 */
router.get('/notifications', authenticateUser, async (req, res) => {
    try {
        const { limit = 20, unread_only = false } = req.query;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const result = await socialService.getUserNotifications(
            user_id,
            parseInt(limit),
            unread_only === 'true'
        );

        res.status(200).json({
            success: true,
            message: 'Notifications fetched successfully',
            data: result.notifications || []
        });
    } catch (error) {
        console.error('❌ Error in get notifications route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// =================== FOLLOW/FRIENDSHIP ROUTES ===================

/**
 * POST /api/social/follow/:userId - Follow/unfollow a user
 */
router.post('/follow/:userId', authenticateUser, async (req, res) => {
    try {
        const { userId } = req.params;
        const { follow_type = 'follow' } = req.body;
        const follower_id = req.user?.id;

        if (!follower_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (follower_id === parseInt(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot follow yourself'
            });
        }

        const result = await socialService.followUser(
            follower_id,
            parseInt(userId),
            follow_type
        );

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message,
                action: result.action
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in follow user route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// =================== SOCIAL STATISTICS ROUTES ===================

/**
 * GET /api/social/stats/:userId - Get user social statistics
 */
router.get('/stats/:userId?', authenticateUser, async (req, res) => {
    try {
        const { userId } = req.params;
        const user_id = userId ? parseInt(userId) : req.user?.id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required or user ID needed'
            });
        }

        const result = await socialService.getUserSocialStats(user_id);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Social stats fetched successfully',
                data: result.stats
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('❌ Error in get social stats route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;