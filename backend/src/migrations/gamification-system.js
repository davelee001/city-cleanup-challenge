/**
 * Database migration for Gamification & Incentive System
 * Adds tables for points, achievements, badges, streaks, and leaderboards
 */

const sqlite3 = require('sqlite3').verbose();

/**
 * Run the migration to add gamification system tables
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise<void>}
 */
async function runGamificationMigration(db) {
    const migrations = [
        // User points tracking table
        `CREATE TABLE IF NOT EXISTS user_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            pointsEarned INTEGER NOT NULL DEFAULT 0,
            pointsSource TEXT NOT NULL,
            sourceId TEXT,
            description TEXT,
            bonuses TEXT,
            earnedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT,
            FOREIGN KEY(username) REFERENCES users(username),
            INDEX(username),
            INDEX(earnedAt)
        )`,

        // User achievements table
        `CREATE TABLE IF NOT EXISTS user_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            achievementId TEXT NOT NULL,
            achievementName TEXT NOT NULL,
            achievementDescription TEXT,
            achievementIcon TEXT,
            achievementCategory TEXT,
            pointsAwarded INTEGER DEFAULT 0,
            earnedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT,
            FOREIGN KEY(username) REFERENCES users(username),
            UNIQUE(username, achievementId),
            INDEX(username),
            INDEX(achievementCategory),
            INDEX(earnedAt)
        )`,

        // User streaks table
        `CREATE TABLE IF NOT EXISTS user_streaks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            currentStreak INTEGER DEFAULT 0,
            longestStreak INTEGER DEFAULT 0,
            lastActiveDate TEXT NOT NULL,
            streakStartDate TEXT,
            streakEndDate TEXT,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(username) REFERENCES users(username),
            INDEX(currentStreak),
            INDEX(longestStreak),
            INDEX(lastActiveDate)
        )`,

        // User actions tracking for first-time bonuses
        `CREATE TABLE IF NOT EXISTS user_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            action TEXT NOT NULL,
            actionData TEXT,
            performedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            eventId INTEGER,
            metadata TEXT,
            FOREIGN KEY(username) REFERENCES users(username),
            FOREIGN KEY(eventId) REFERENCES events(id),
            INDEX(username),
            INDEX(action),
            INDEX(performedAt)
        )`,

        // Environmental impact tracking table
        `CREATE TABLE IF NOT EXISTS environmental_impact (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            eventId INTEGER,
            progressId INTEGER,
            wasteCollected REAL NOT NULL DEFAULT 0,
            co2Saved REAL NOT NULL DEFAULT 0,
            waterSaved REAL NOT NULL DEFAULT 0,
            energySaved REAL NOT NULL DEFAULT 0,
            carbonValue REAL NOT NULL DEFAULT 0,
            impactCalculatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            calculationMethod TEXT DEFAULT 'standard',
            metadata TEXT,
            FOREIGN KEY(username) REFERENCES users(username),
            FOREIGN KEY(eventId) REFERENCES events(id),
            FOREIGN KEY(progressId) REFERENCES cleanup_progress(id),
            INDEX(username),
            INDEX(eventId),
            INDEX(impactCalculatedAt)
        )`,

        // Leaderboard cache table for performance 
        `CREATE TABLE IF NOT EXISTS leaderboard_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            leaderboardType TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            username TEXT NOT NULL,
            rank INTEGER NOT NULL,
            score REAL NOT NULL,
            metadata TEXT,
            lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
            expiresAt TEXT,
            FOREIGN KEY(username) REFERENCES users(username),
            UNIQUE(leaderboardType, timeframe, username),
            INDEX(leaderboardType, timeframe),
            INDEX(rank),
            INDEX(lastUpdated)
        )`,

        // Badge collections table
        `CREATE TABLE IF NOT EXISTS user_badges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            badgeId TEXT NOT NULL,
            badgeName TEXT NOT NULL,
            badgeDescription TEXT,
            badgeIcon TEXT,
            badgeColor TEXT,
            badgeCategory TEXT,
            badgeRarity TEXT DEFAULT 'common',
            earnedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            displayOrder INTEGER DEFAULT 0,
            isVisible INTEGER DEFAULT 1,
            metadata TEXT,
            FOREIGN KEY(username) REFERENCES users(username),
            UNIQUE(username, badgeId),
            INDEX(username),
            INDEX(badgeCategory),
            INDEX(earnedAt),
            INDEX(displayOrder)
        )`,

        // Seasonal challenges table
        `CREATE TABLE IF NOT EXISTS seasonal_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            challengeId TEXT UNIQUE NOT NULL,
            challengeName TEXT NOT NULL,
            challengeDescription TEXT NOT NULL,
            challengeIcon TEXT,
            startDate TEXT NOT NULL,
            endDate TEXT NOT NULL,
            targetValue REAL NOT NULL,
            targetType TEXT NOT NULL,
            rewardPoints INTEGER DEFAULT 0,
            rewardBadgeId TEXT,
            isActive INTEGER DEFAULT 1,
            participant_count INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT,
            INDEX(challengeId),
            INDEX(isActive),
            INDEX(startDate, endDate)
        )`,

        // User participation in seasonal challenges
        `CREATE TABLE IF NOT EXISTS challenge_participation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            challengeId TEXT NOT NULL,
            username TEXT NOT NULL,
            currentProgress REAL DEFAULT 0,
            isCompleted INTEGER DEFAULT 0,
            completedAt TEXT,
            joinedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            lastProgressUpdate TEXT,
            metadata TEXT,
            FOREIGN KEY(challengeId) REFERENCES seasonal_challenges(challengeId),
            FOREIGN KEY(username) REFERENCES users(username),
            UNIQUE(challengeId, username),
            INDEX(challengeId),
            INDEX(username),
            INDEX(isCompleted)
        )`,

        // User level progression table
        `CREATE TABLE IF NOT EXISTS user_levels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            currentLevel INTEGER DEFAULT 1,
            currentPoints INTEGER DEFAULT 0,
            pointsToNext INTEGER DEFAULT 100,
            levelTitle TEXT DEFAULT 'Eco Beginner',
            levelIcon TEXT DEFAULT '🌱',
            levelProgress REAL DEFAULT 0,
            levelUpAt TEXT,
            totalLevelUps INTEGER DEFAULT 0,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(username) REFERENCES users(username),
            INDEX(currentLevel),
            INDEX(currentPoints),
            INDEX(levelUpAt)
        )`,

        // Daily/Weekly goals table
        `CREATE TABLE IF NOT EXISTS user_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            goalType TEXT NOT NULL,
            goalPeriod TEXT NOT NULL,
            goalTarget REAL NOT NULL,
            currentProgress REAL DEFAULT 0,
            isCompleted INTEGER DEFAULT 0,
            completedAt TEXT,
            periodStart TEXT NOT NULL,
            periodEnd TEXT NOT NULL,
            rewardPoints INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(username) REFERENCES users(username),
            INDEX(username),
            INDEX(goalType),
            INDEX(goalPeriod),
            INDEX(isCompleted)
        )`
    ];

    console.log('Starting gamification system migration...');

    // Create achievements master table first
    await createAchievementsMaster(db);

    for (let i = 0; i < migrations.length; i++) {
        const migration = migrations[i];
        try {
            await new Promise((resolve, reject) => {
                db.run(migration, (err) => {
                    if (err) {
                        console.error(`Migration ${i + 1} failed:`, err.message);
                        reject(err);
                    } else {
                        console.log(`Migration ${i + 1}/${migrations.length} completed`);
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error(`Failed to execute migration ${i + 1}:`, error);
            throw error;
        }
    }

    // Insert default achievements
    await insertDefaultAchievements(db);
    
    // Insert default seasonal challenges
    await insertDefaultChallenges(db);

    console.log('Gamification system migration completed successfully!');
}

/**
 * Insert default achievements into the database
 * @param {sqlite3.Database} db - SQLite database instance
 */
async function insertDefaultAchievements(db) {
    const achievements = [
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

    console.log('Inserting default achievements...');

    for (const achievement of achievements) {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT OR IGNORE INTO achievements_master 
                (achievementId, achievementName, achievementDescription, achievementIcon, achievementCategory, pointsReward, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    achievement.id,
                    achievement.name, 
                    achievement.description,
                    achievement.icon,
                    achievement.category,
                    achievement.points,
                    new Date().toISOString()
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    console.log('Default achievements inserted successfully');
}

/**
 * Insert default seasonal challenges
 * @param {sqlite3.Database} db - SQLite database instance 
 */
async function insertDefaultChallenges(db) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

    const challenges = [
        {
            id: 'monthly_cleanup_hero',
            name: 'Monthly Cleanup Hero',
            description: 'Attend 5 cleanup events this month',
            icon: '🗓️',
            startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
            endDate: endOfMonth.toISOString(),
            targetValue: 5,
            targetType: 'events_attended',
            rewardPoints: 500,
            rewardBadgeId: 'monthly_hero'
        },
        {
            id: 'waste_warrior_quarterly',
            name: 'Quarterly Waste Warrior',
            description: 'Collect 100kg of waste this quarter',
            icon: '♻️',
            startDate: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString(),
            endDate: endOfQuarter.toISOString(),
            targetValue: 100,
            targetType: 'waste_collected',
            rewardPoints: 1000,
            rewardBadgeId: 'waste_warrior_q'
        }
    ];

    console.log('Inserting default seasonal challenges...');

    for (const challenge of challenges) {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT OR IGNORE INTO seasonal_challenges 
                (challengeId, challengeName, challengeDescription, challengeIcon, startDate, endDate, targetValue, targetType, rewardPoints, rewardBadgeId, isActive, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    challenge.id,
                    challenge.name,
                    challenge.description,
                    challenge.icon,
                    challenge.startDate,
                    challenge.endDate,
                    challenge.targetValue,
                    challenge.targetType,
                    challenge.rewardPoints,
                    challenge.rewardBadgeId,
                    1,
                    new Date().toISOString()
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    console.log('Default seasonal challenges inserted successfully');
}

/**
 * Create master achievements table for reference
 */
async function createAchievementsMaster(db) {
    return new Promise((resolve, reject) => {
        db.run(`
            CREATE TABLE IF NOT EXISTS achievements_master (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                achievementId TEXT UNIQUE NOT NULL,
                achievementName TEXT NOT NULL,
                achievementDescription TEXT NOT NULL,
                achievementIcon TEXT,
                achievementCategory TEXT,
                pointsReward INTEGER DEFAULT 0,
                rarity TEXT DEFAULT 'common',
                isActive INTEGER DEFAULT 1,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

/**
 * Rollback the gamification migration
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise<void>}
 */
async function rollbackGamificationMigration(db) {
    const rollbackCommands = [
        `DROP TABLE IF EXISTS user_goals`,
        `DROP TABLE IF EXISTS user_levels`,
        `DROP TABLE IF EXISTS challenge_participation`,
        `DROP TABLE IF EXISTS seasonal_challenges`,
        `DROP TABLE IF EXISTS user_badges`,
        `DROP TABLE IF EXISTS leaderboard_cache`,
        `DROP TABLE IF EXISTS environmental_impact`,
        `DROP TABLE IF EXISTS user_actions`,
        `DROP TABLE IF EXISTS user_streaks`,
        `DROP TABLE IF EXISTS user_achievements`,
        `DROP TABLE IF EXISTS user_points`,
        `DROP TABLE IF EXISTS achievements_master`
    ];

    console.log('Rolling back gamification system migration...');

    for (const command of rollbackCommands) {
        await new Promise((resolve, reject) => {
            db.run(command, (err) => {
                if (err) {
                    console.error('Rollback command failed:', err.message);
                    reject(err);
                } else {
                    console.log('Rollback command executed:', command);
                    resolve();
                }
            });
        });
    }

    console.log('Gamification system rollback completed');
}

module.exports = {
    runGamificationMigration,
    rollbackGamificationMigration
};