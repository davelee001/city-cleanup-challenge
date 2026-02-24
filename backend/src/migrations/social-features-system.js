/**
 * Social Features System Database Migration (v3.0)
 * Enhanced Social Features: Teams, Social Feeds, Challenges, Community Recognition
 * Date: February 24, 2026
 */

const Database = require('better-sqlite3');
const path = require('path');

class SocialFeaturesMigration {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '../../../database.db');
        this.db = null;
    }

    async connect() {
        try {
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            console.log('✅ Database connection established for social features migration');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async runMigration() {
        if (!this.db) {
            await this.connect();
        }

        console.log('🚀 Starting Social Features System migration...\n');

        try {
            // Enable foreign keys
            this.db.exec('PRAGMA foreign_keys = ON');

            // Create all social features tables
            await this.createTeamsTable();
            await this.createTeamMembershipsTable();
            await this.createSocialPostsTable();
            await this.createPostCommentsTable();
            await this.createPostLikesTable();
            await this.createPostSharesTable();
            await this.createChallengesTable();
            await this.createChallengeParticipantsTable();
            await this.createCommunityRecognitionTable();
            await this.createSocialNotificationsTable();
            await this.createFollowRelationshipsTable();
            
            console.log('✅ Social Features System migration completed successfully!');
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            throw error;
        }
    }

    async createTeamsTable() {
        console.log('📋 Creating teams table...');
        
        const createTeamsTable = `
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                creator_id INTEGER NOT NULL,
                team_type ENUM('public', 'private', 'invite_only') DEFAULT 'public',
                max_members INTEGER DEFAULT 50,
                current_members INTEGER DEFAULT 1,
                team_avatar TEXT,
                team_color VARCHAR(7) DEFAULT '#4CAF50',
                tags TEXT, -- JSON array of tags
                location VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                total_events INTEGER DEFAULT 0,
                total_waste_collected REAL DEFAULT 0,
                total_points INTEGER DEFAULT 0,
                FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `;

        const createTeamsIndexes = `
            CREATE INDEX IF NOT EXISTS idx_teams_creator ON teams(creator_id);
            CREATE INDEX IF NOT EXISTS idx_teams_type ON teams(team_type);
            CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
            CREATE INDEX IF NOT EXISTS idx_teams_points ON teams(total_points DESC);
        `;

        this.db.exec(createTeamsTable);
        this.db.exec(createTeamsIndexes);
        console.log('✅ Teams table created successfully');
    }

    async createTeamMembershipsTable() {
        console.log('👥 Creating team memberships table...');
        
        const createMembershipsTable = `
            CREATE TABLE IF NOT EXISTS team_memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role ENUM('owner', 'admin', 'moderator', 'member') DEFAULT 'member',
                join_status ENUM('pending', 'accepted', 'declined', 'kicked') DEFAULT 'pending',
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                contribution_points INTEGER DEFAULT 0,
                events_attended INTEGER DEFAULT 0,
                invited_by INTEGER,
                is_active BOOLEAN DEFAULT true,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE(team_id, user_id)
            );
        `;

        const createMembershipsIndexes = `
            CREATE INDEX IF NOT EXISTS idx_memberships_team ON team_memberships(team_id);
            CREATE INDEX IF NOT EXISTS idx_memberships_user ON team_memberships(user_id);
            CREATE INDEX IF NOT EXISTS idx_memberships_status ON team_memberships(join_status);
            CREATE INDEX IF NOT EXISTS idx_memberships_role ON team_memberships(role);
        `;

        this.db.exec(createMembershipsTable);
        this.db.exec(createMembershipsIndexes);
        console.log('✅ Team memberships table created successfully');
    }

    async createSocialPostsTable() {
        console.log('📱 Creating social posts table...');
        
        const createPostsTable = `
            CREATE TABLE IF NOT EXISTS social_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                team_id INTEGER,
                event_id INTEGER,
                post_type ENUM('text', 'image', 'event_share', 'achievement_share', 'challenge_share') DEFAULT 'text',
                content TEXT NOT NULL,
                media_urls TEXT, -- JSON array of media URLs
                tags TEXT, -- JSON array of hashtags
                mentions TEXT, -- JSON array of mentioned user IDs
                privacy_level ENUM('public', 'team', 'friends', 'private') DEFAULT 'public',
                location_data TEXT, -- JSON object with location info
                like_count INTEGER DEFAULT 0,
                comment_count INTEGER DEFAULT 0,
                share_count INTEGER DEFAULT 0,
                is_pinned BOOLEAN DEFAULT false,
                is_featured BOOLEAN DEFAULT false,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_deleted BOOLEAN DEFAULT false,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
            );
        `;

        const createPostsIndexes = `
            CREATE INDEX IF NOT EXISTS idx_posts_user ON social_posts(user_id);
            CREATE INDEX IF NOT EXISTS idx_posts_team ON social_posts(team_id);
            CREATE INDEX IF NOT EXISTS idx_posts_event ON social_posts(event_id);
            CREATE INDEX IF NOT EXISTS idx_posts_type ON social_posts(post_type);
            CREATE INDEX IF NOT EXISTS idx_posts_privacy ON social_posts(privacy_level);
            CREATE INDEX IF NOT EXISTS idx_posts_created ON social_posts(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_posts_likes ON social_posts(like_count DESC);
        `;

        this.db.exec(createPostsTable);
        this.db.exec(createPostsIndexes);
        console.log('✅ Social posts table created successfully');
    }

    async createPostCommentsTable() {
        console.log('💬 Creating post comments table...');
        
        const createCommentsTable = `
            CREATE TABLE IF NOT EXISTS post_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                parent_comment_id INTEGER,
                content TEXT NOT NULL,
                media_url TEXT,
                like_count INTEGER DEFAULT 0,
                is_pinned BOOLEAN DEFAULT false,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_deleted BOOLEAN DEFAULT false,
                FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
            );
        `;

        const createCommentsIndexes = `
            CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id);
            CREATE INDEX IF NOT EXISTS idx_comments_user ON post_comments(user_id);
            CREATE INDEX IF NOT EXISTS idx_comments_parent ON post_comments(parent_comment_id);
            CREATE INDEX IF NOT EXISTS idx_comments_created ON post_comments(created_at DESC);
        `;

        this.db.exec(createCommentsTable);
        this.db.exec(createCommentsIndexes);
        console.log('✅ Post comments table created successfully');
    }

    async createPostLikesTable() {
        console.log('👍 Creating post likes table...');
        
        const createLikesTable = `
            CREATE TABLE IF NOT EXISTS post_likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER,
                comment_id INTEGER,
                user_id INTEGER NOT NULL,
                reaction_type ENUM('like', 'love', 'celebrate', 'support', 'insightful') DEFAULT 'like',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(post_id, user_id),
                UNIQUE(comment_id, user_id),
                CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
            );
        `;

        const createLikesIndexes = `
            CREATE INDEX IF NOT EXISTS idx_likes_post ON post_likes(post_id);
            CREATE INDEX IF NOT EXISTS idx_likes_comment ON post_likes(comment_id);
            CREATE INDEX IF NOT EXISTS idx_likes_user ON post_likes(user_id);
            CREATE INDEX IF NOT EXISTS idx_likes_reaction ON post_likes(reaction_type);
        `;

        this.db.exec(createLikesTable);
        this.db.exec(createLikesIndexes);
        console.log('✅ Post likes table created successfully');
    }

    async createPostSharesTable() {
        console.log('📤 Creating post shares table...');
        
        const createSharesTable = `
            CREATE TABLE IF NOT EXISTS post_shares (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                share_type ENUM('internal', 'external', 'team') DEFAULT 'internal',
                share_message TEXT,
                shared_to_team_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (shared_to_team_id) REFERENCES teams(id) ON DELETE SET NULL
            );
        `;

        const createSharesIndexes = `
            CREATE INDEX IF NOT EXISTS idx_shares_post ON post_shares(post_id);
            CREATE INDEX IF NOT EXISTS idx_shares_user ON post_shares(user_id);
            CREATE INDEX IF NOT EXISTS idx_shares_type ON post_shares(share_type);
        `;

        this.db.exec(createSharesTable);
        this.db.exec(createSharesIndexes);
        console.log('✅ Post shares table created successfully');
    }

    async createChallengesTable() {
        console.log('🏆 Creating challenges table...');
        
        const createChallengesTable = `
            CREATE TABLE IF NOT EXISTS challenges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                creator_id INTEGER NOT NULL,
                title VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                challenge_type ENUM('individual', 'team', 'community') DEFAULT 'individual',
                category ENUM('waste_collection', 'participation', 'photo_upload', 'streak', 'custom') DEFAULT 'waste_collection',
                target_metric VARCHAR(50) NOT NULL, -- e.g., 'waste_kg', 'events_count', 'photos_count'
                target_value REAL NOT NULL,
                current_progress REAL DEFAULT 0,
                reward_points INTEGER DEFAULT 0,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                max_participants INTEGER DEFAULT 100,
                current_participants INTEGER DEFAULT 0,
                challenge_rules TEXT, -- JSON object with rules
                difficulty_level ENUM('easy', 'medium', 'hard', 'extreme') DEFAULT 'medium',
                is_public BOOLEAN DEFAULT true,
                is_featured BOOLEAN DEFAULT false,
                banner_image TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `;

        const createChallengesIndexes = `
            CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
            CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(challenge_type);
            CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category);
            CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active);
            CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);
            CREATE INDEX IF NOT EXISTS idx_challenges_featured ON challenges(is_featured);
        `;

        this.db.exec(createChallengesTable);
        this.db.exec(createChallengesIndexes);
        console.log('✅ Challenges table created successfully');
    }

    async createChallengeParticipantsTable() {
        console.log('🎯 Creating challenge participants table...');
        
        const createParticipantsTable = `
            CREATE TABLE IF NOT EXISTS challenge_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                challenge_id INTEGER NOT NULL,
                user_id INTEGER,
                team_id INTEGER,
                join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                current_progress REAL DEFAULT 0,
                is_completed BOOLEAN DEFAULT false,
                completion_date DATETIME,
                rank_position INTEGER,
                bonus_points INTEGER DEFAULT 0,
                progress_data TEXT, -- JSON object with detailed progress
                is_active BOOLEAN DEFAULT true,
                FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL))
            );
        `;

        const createParticipantsIndexes = `
            CREATE INDEX IF NOT EXISTS idx_participants_challenge ON challenge_participants(challenge_id);
            CREATE INDEX IF NOT EXISTS idx_participants_user ON challenge_participants(user_id);
            CREATE INDEX IF NOT EXISTS idx_participants_team ON challenge_participants(team_id);
            CREATE INDEX IF NOT EXISTS idx_participants_progress ON challenge_participants(current_progress DESC);
            CREATE INDEX IF NOT EXISTS idx_participants_completed ON challenge_participants(is_completed);
        `;

        this.db.exec(createParticipantsTable);
        this.db.exec(createParticipantsIndexes);
        console.log('✅ Challenge participants table created successfully');
    }

    async createCommunityRecognitionTable() {
        console.log('🌟 Creating community recognition table...');
        
        const createRecognitionTable = `
            CREATE TABLE IF NOT EXISTS community_recognition (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipient_id INTEGER NOT NULL,
                nominator_id INTEGER,
                recognition_type ENUM('citizen_of_month', 'eco_hero', 'team_player', 'innovator', 'mentor', 'custom') NOT NULL,
                title VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                badge_image TEXT,
                points_awarded INTEGER DEFAULT 0,
                month INTEGER,
                year INTEGER,
                is_featured BOOLEAN DEFAULT false,
                votes_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                approved_at DATETIME,
                approved_by INTEGER,
                is_active BOOLEAN DEFAULT true,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (nominator_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
            );
        `;

        const createRecognitionIndexes = `
            CREATE INDEX IF NOT EXISTS idx_recognition_recipient ON community_recognition(recipient_id);
            CREATE INDEX IF NOT EXISTS idx_recognition_nominator ON community_recognition(nominator_id);
            CREATE INDEX IF NOT EXISTS idx_recognition_type ON community_recognition(recognition_type);
            CREATE INDEX IF NOT EXISTS idx_recognition_featured ON community_recognition(is_featured);
            CREATE INDEX IF NOT EXISTS idx_recognition_date ON community_recognition(month, year);
        `;

        this.db.exec(createRecognitionTable);
        this.db.exec(createRecognitionIndexes);
        console.log('✅ Community recognition table created successfully');
    }

    async createSocialNotificationsTable() {
        console.log('🔔 Creating social notifications table...');
        
        const createNotificationsTable = `
            CREATE TABLE IF NOT EXISTS social_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipient_id INTEGER NOT NULL,
                sender_id INTEGER,
                notification_type ENUM('team_invite', 'post_like', 'post_comment', 'post_share', 'challenge_invite', 'recognition', 'new_follower', 'achievement_unlocked') NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                action_url TEXT,
                related_id INTEGER, -- ID of related entity (post, team, challenge, etc.)
                is_read BOOLEAN DEFAULT false,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                read_at DATETIME,
                is_deleted BOOLEAN DEFAULT false,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `;

        const createNotificationsIndexes = `
            CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON social_notifications(recipient_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_sender ON social_notifications(sender_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_type ON social_notifications(notification_type);
            CREATE INDEX IF NOT EXISTS idx_notifications_read ON social_notifications(is_read);
            CREATE INDEX IF NOT EXISTS idx_notifications_created ON social_notifications(created_at DESC);
        `;

        this.db.exec(createNotificationsTable);
        this.db.exec(createNotificationsIndexes);
        console.log('✅ Social notifications table created successfully');
    }

    async createFollowRelationshipsTable() {
        console.log('👥 Creating follow relationships table...');
        
        const createFollowsTable = `
            CREATE TABLE IF NOT EXISTS follow_relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                follower_id INTEGER NOT NULL,
                following_id INTEGER NOT NULL,
                follow_type ENUM('follow', 'friend') DEFAULT 'follow',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(follower_id, following_id),
                CHECK(follower_id != following_id)
            );
        `;

        const createFollowsIndexes = `
            CREATE INDEX IF NOT EXISTS idx_follows_follower ON follow_relationships(follower_id);
            CREATE INDEX IF NOT EXISTS idx_follows_following ON follow_relationships(following_id);
            CREATE INDEX IF NOT EXISTS idx_follows_type ON follow_relationships(follow_type);
        `;

        this.db.exec(createFollowsTable);
        this.db.exec(createFollowsIndexes);
        console.log('✅ Follow relationships table created successfully');
    }

    async close() {
        if (this.db) {
            this.db.close();
            console.log('🔐 Database connection closed');
        }
    }
}

// Export for use in other modules
module.exports = SocialFeaturesMigration;

// Run migration if called directly
if (require.main === module) {
    const migration = new SocialFeaturesMigration();
    migration.runMigration()
        .then(() => {
            migration.close();
            console.log('\n🎉 Social Features System migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migration failed:', error);
            migration.close();
            process.exit(1);
        });
}