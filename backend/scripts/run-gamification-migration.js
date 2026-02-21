#!/usr/bin/env node
/**
 * Run Gamification System Migration
 * This script applied the gamification database schema to the City Cleanup Challenge database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { runGamificationMigration } = require('../src/migrations/gamification-system');

async function runMigration() {
    const dbPath = path.join(__dirname, '../database.sqlite');
    
    console.log('🔄 Starting Gamification System Migration...');
    console.log('Database path:', dbPath);

    // Open database connection
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Failed to open database:', err.message);
            process.exit(1);
        }
        console.log('✅ Connected to SQLite database');
    });

    try {
        // Run gamification migration
        await runGamificationMigration(db);
        
        console.log('🎉 Gamification System Migration completed successfully!');
        console.log('\n📊 The following tables have been created:');
        console.log('  • user_points - Track points earned by users');
        console.log('  • user_achievements - Store user achievements');
        console.log('  • user_streaks - Track activity streaks');
        console.log('  • user_actions - Record first-time bonuses');
        console.log('  • environmental_impact - Track environmental impact data');
        console.log('  • leaderboard_cache - Cache leaderboard data for performance');
        console.log('  • user_badges - Store user badge collections');
        console.log('  • seasonal_challenges - Manage seasonal challenges');
        console.log('  • challenge_participation - Track challenge participation');
        console.log('  • user_levels - Store user level progression');
        console.log('  • user_goals - Manage daily/weekly goals');
        console.log('  • achievements_master - Master list of available achievements');
        
        console.log('\n🎯 Default achievements and challenges have been loaded');
        console.log('\n🚀 Your gamification system is ready to use!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    } finally {
        // Close database connection
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('✅ Database connection closed');
            }
        });
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    runMigration().catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { runMigration };