/**
 * Gamification API routes for City Cleanup Challenge
 * Handles points, achievements, leaderboards, badges, and user statistics
 */

const express = require('express');
const router = express.Router();
const GamificationService = require('../services/gamificationService');
const { authenticateUser } = require('../middleware/auth');

// Initialize gamification service
let gamificationService;

// Initialize service with database connection
const initializeGamificationAPI = (db) => {
    gamificationService = new GamificationService(db);
    return router;
};

/**
 * Get user dashboard with points, level, achievements, and stats
 */
router.get('/dashboard/:username', authenticateUser, async (req, res) => {
    try {
        const { username } = req.params;
        
        // Verify user can access this dashboard
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [
            userStats,
            recentAchievements,
            streakInfo,
            environmentalImpact,
            currentLevel,
            leaderboardRank
        ] = await Promise.all([
            gamificationService.getUserStats(username),
            gamificationService.getRecentAchievements(username, 5),
            gamificationService.getStreakInfo(username),
            gamificationService.getEnvironmentalImpact(username),
            gamificationService.getCurrentLevel(username),
            gamificationService.getUserLeaderboardRank(username)
        ]);

        res.json({
            success: true,
            dashboard: {
                userStats,
                recentAchievements,
                streakInfo,
                environmentalImpact,
                currentLevel,
                leaderboardRank
            }
        });

    } catch (error) {
        console.error('Dashboard API error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

/**
 * Award points for user action
 */
router.post('/points/award', authenticateUser, async (req, res) => {
    try {
        const { username, action, sourceId, metadata = {} } = req.body;

        if (!username || !action) {
            return res.status(400).json({ error: 'Username and action are required' });
        }

        // Verify user authorization (admin or self)
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await gamificationService.awardPoints(
            username, 
            action, 
            sourceId, 
            metadata
        );

        res.json({
            success: true,
            pointsAwarded: result.pointsAwarded,
            newTotal: result.newTotal,
            bonuses: result.bonuses,
            levelUp: result.levelUp,
            newAchievements: result.newAchievements
        });

    } catch (error) {
        console.error('Points award API error:', error);
        res.status(500).json({ error: 'Failed to award points' });
    }
});

/**
 * Get user points history
 */
router.get('/points/:username/history', authenticateUser, async (req, res) => {
    try {
        const { username } = req.params;
        const { page = 1, limit = 20, source } = req.query;

        // Verify user can access this data
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const pointsHistory = await gamificationService.getPointsHistory(
            username, 
            parseInt(page), 
            parseInt(limit),
            source
        );

        res.json({
            success: true,
            pointsHistory: pointsHistory.records,
            pagination: pointsHistory.pagination
        });

    } catch (error) {
        console.error('Points history API error:', error);
        res.status(500).json({ error: 'Failed to fetch points history' });
    }
});

/**
 * Get user achievements
 */
router.get('/achievements/:username', authenticateUser, async (req, res) => {
    try {
        const { username } = req.params;
        const { category } = req.query;

        // Verify user can access this data
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const achievements = await gamificationService.getUserAchievements(username, category);

        res.json({
            success: true,
            achievements
        });

    } catch (error) {
        console.error('Achievements API error:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

/**
 * Get available achievements (master list)
 */
router.get('/achievements/available', async (req, res) => {
    try {
        const { category } = req.query;
        
        const availableAchievements = await gamificationService.getAvailableAchievements(category);

        res.json({
            success: true,
            achievements: availableAchievements
        });

    } catch (error) {
        console.error('Available achievements API error:', error);
        res.status(500).json({ error: 'Failed to fetch available achievements' });
    }
});

/**
 * Get leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { 
            type = 'points', 
            timeframe = 'all-time', 
            limit = 50,
            page = 1
        } = req.query;

        const leaderboard = await gamificationService.getLeaderboard(
            type,
            timeframe,
            parseInt(limit),
            parseInt(page)
        );

        res.json({
            success: true,
            leaderboard: leaderboard.rankings,
            pagination: leaderboard.pagination,
            metadata: leaderboard.metadata
        });

    } catch (error) {
        console.error('Leaderboard API error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

/**
 * Get user streak information
 */
router.get('/streak/:username', authenticateUser, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user can access this data
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const streakInfo = await gamificationService.getStreakInfo(username);

        res.json({
            success: true,
            streak: streakInfo
        });

    } catch (error) {
        console.error('Streak API error:', error);
        res.status(500).json({ error: 'Failed to fetch streak information' });
    }
});

/**
 * Update user activity streak
 */
router.post('/streak/update', authenticateUser, async (req, res) => {
    try {
        const { username, activityDate } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Verify user authorization
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await gamificationService.updateStreak(
            username, 
            activityDate || new Date().toISOString()
        );

        res.json({
            success: true,
            streakUpdated: result.updated,
            currentStreak: result.currentStreak,
            longestStreak: result.longestStreak,
            bonusPoints: result.bonusPoints,
            newAchievements: result.newAchievements
        });

    } catch (error) {
        console.error('Streak update API error:', error);
        res.status(500).json({ error: 'Failed to update streak' });
    }
});

/**
 * Get user badges
 */
router.get('/badges/:username', authenticateUser, async (req, res) => {
    try {
        const { username } = req.params;
        const { category, visible } = req.query;

        // Verify user can access this data
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const badges = await gamificationService.getUserBadges(username, category, visible);

        res.json({
            success: true,
            badges
        });

    } catch (error) {
        console.error('Badges API error:', error);
        res.status(500).json({ error: 'Failed to fetch badges' });
    }
});

/**
 * Get environmental impact statistics
 */
router.get('/impact/:username', authenticateUser, async (req, res) => {
    try {
        const { username } = req.params;
        const { timeframe } = req.query;

        // Verify user can access this data
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const impact = await gamificationService.getEnvironmentalImpact(username, timeframe);

        res.json({
            success: true,
            environmentalImpact: impact
        });

    } catch (error) {
        console.error('Environmental impact API error:', error);
        res.status(500).json({ error: 'Failed to fetch environmental impact' });
    }
});

/**
 * Get seasonal challenges
 */
router.get('/challenges', async (req, res) => {
    try {
        const { active, participantUsername } = req.query;
        
        const challenges = await gamificationService.getSeasonalChallenges(
            active === 'true', 
            participantUsername
        );

        res.json({
            success: true,
            challenges
        });

    } catch (error) {
        console.error('Challenges API error:', error);
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
});

/**
 * Join seasonal challenge
 */
router.post('/challenges/:challengeId/join', authenticateUser, async (req, res) => {
    try {
        const { challengeId } = req.params;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Verify user authorization
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await gamificationService.joinChallenge(challengeId, username);

        res.json({
            success: true,
            joined: result.joined,
            challenge: result.challenge,
            participantCount: result.participantCount
        });

    } catch (error) {
        console.error('Join challenge API error:', error);
        res.status(500).json({ error: 'Failed to join challenge' });
    }
});

/**
 * Update challenge progress
 */
router.post('/challenges/:challengeId/progress', authenticateUser, async (req, res) => {
    try {
        const { challengeId } = req.params;
        const { username, progressValue, metadata } = req.body;

        if (!username || progressValue === undefined) {
            return res.status(400).json({ error: 'Username and progress value are required' });
        }

        // Verify user authorization
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await gamificationService.updateChallengeProgress(
            challengeId, 
            username, 
            progressValue, 
            metadata
        );

        res.json({
            success: true,
            progressUpdated: result.updated,
            currentProgress: result.currentProgress,
            completed: result.completed,
            rewards: result.rewards
        });

    } catch (error) {
        console.error('Challenge progress API error:', error);
        res.status(500).json({ error: 'Failed to update challenge progress' });
    }
});

/**
 * Get user level and progression
 */
router.get('/level/:username', authenticateUser, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user can access this data
        if (req.user.username !== username && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const levelInfo = await gamificationService.getCurrentLevel(username);

        res.json({
            success: true,
            level: levelInfo
        });

    } catch (error) {
        console.error('Level API error:', error);
        res.status(500).json({ error: 'Failed to fetch level information' });
    }
});

/**
 * Get gamification statistics summary
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        
        const summary = await gamificationService.getGamificationSummary(timeframe);

        res.json({
            success: true,
            summary
        });

    } catch (error) {
        console.error('Summary stats API error:', error);
        res.status(500).json({ error: 'Failed to fetch summary statistics' });
    }
});

/**
 * Award achievement manually (admin only)
 */
router.post('/achievements/award', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { username, achievementId, metadata } = req.body;

        if (!username || !achievementId) {
            return res.status(400).json({ error: 'Username and achievement ID are required' });
        }

        const result = await gamificationService.awardAchievement(
            username, 
            achievementId, 
            metadata
        );

        res.json({
            success: true,
            achievementAwarded: result.awarded,
            achievement: result.achievement,
            pointsAwarded: result.pointsAwarded
        });

    } catch (error) {
        console.error('Award achievement API error:', error);
        res.status(500).json({ error: 'Failed to award achievement' });
    }
});

/**
 * Create custom seasonal challenge (admin only)
 */
router.post('/challenges/create', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const challengeData = req.body;

        if (!challengeData.challengeName || !challengeData.targetValue || !challengeData.targetType) {
            return res.status(400).json({ 
                error: 'Challenge name, target value, and target type are required' 
            });
        }

        const result = await gamificationService.createSeasonalChallenge(challengeData);

        res.json({
            success: true,
            challenge: result.challenge,
            challengeId: result.challengeId
        });

    } catch (error) {
        console.error('Create challenge API error:', error);
        res.status(500).json({ error: 'Failed to create challenge' });
    }
});

module.exports = { router, initializeGamificationAPI };