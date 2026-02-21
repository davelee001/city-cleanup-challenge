/**
 * Database migration for Enhanced Image Features
 * Adds GPS metadata, AI impact analysis, and cloud storage support
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Run the migration to add enhanced image features
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise<void>}
 */
async function runMigration(db) {
    const migrations = [
        // Add GPS columns to cleanup_progress table
        `ALTER TABLE cleanup_progress ADD COLUMN beforePhotoGPS TEXT`,
        `ALTER TABLE cleanup_progress ADD COLUMN afterPhotoGPS TEXT`,
        `ALTER TABLE cleanup_progress ADD COLUMN impactAnalysis TEXT`,
        
        // Add enhanced metadata columns
        `ALTER TABLE cleanup_progress ADD COLUMN photoQuality TEXT`,
        `ALTER TABLE cleanup_progress ADD COLUMN locationValidated INTEGER DEFAULT 0`,
        `ALTER TABLE cleanup_progress ADD COLUMN cloudStorageEnabled INTEGER DEFAULT 0`,
        
        // Create enhanced_images table for detailed metadata
        `CREATE TABLE IF NOT EXISTS enhanced_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            progressId INTEGER,
            imagePath TEXT NOT NULL,
            imageType TEXT CHECK(imageType IN ('before', 'after', 'avatar')),
            gpsLatitude REAL,
            gpsLongitude REAL,
            gpsAccuracy REAL,
            imageWidth INTEGER,
            imageHeight INTEGER,
            fileSize INTEGER,
            mimeType TEXT,
            aiAnalysisScore REAL,
            brightnessLevel REAL,
            contrastLevel REAL,
            sharpnessLevel REAL,
            colorfulness REAL,
            wasteDetected INTEGER DEFAULT 0,
            estimatedWasteVolume REAL,
            cloudStorageUrl TEXT,
            cloudStorageProvider TEXT,
            processingTimestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(progressId) REFERENCES cleanup_progress(id)
        )`,
        
        // Create indexes for enhanced queries
        `CREATE INDEX IF NOT EXISTS idx_enhanced_images_progress ON enhanced_images(progressId)`,
        `CREATE INDEX IF NOT EXISTS idx_enhanced_images_gps ON enhanced_images(gpsLatitude, gpsLongitude)`,
        `CREATE INDEX IF NOT EXISTS idx_enhanced_images_type ON enhanced_images(imageType)`,
        `CREATE INDEX IF NOT EXISTS idx_enhanced_images_timestamp ON enhanced_images(processingTimestamp)`,
        
        // Create AI analysis results table
        `CREATE TABLE IF NOT EXISTS ai_analysis_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            imageId INTEGER,
            analysisType TEXT CHECK(analysisType IN ('impact', 'waste_detection', 'quality', 'comparison')),
            confidenceScore REAL,
            analysisData TEXT,
            processingTime REAL,
            algorithmVersion TEXT DEFAULT '1.0',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(imageId) REFERENCES enhanced_images(id)
        )`,
        
        // Create GPS validation table
        `CREATE TABLE IF NOT EXISTS gps_validations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            progressId INTEGER,
            eventId INTEGER,
            expectedLatitude REAL,
            expectedLongitude REAL,
            actualLatitude REAL,
            actualLongitude REAL,
            distanceFromEvent REAL,
            validationStatus TEXT CHECK(validationStatus IN ('valid', 'warning', 'invalid')),
            validationMessage TEXT,
            validatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(progressId) REFERENCES cleanup_progress(id),
            FOREIGN KEY(eventId) REFERENCES events(id)
        )`,
        
        // Update users table for enhanced avatar support
        `CREATE TABLE IF NOT EXISTS user_avatars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            username TEXT,
            avatarPath TEXT,
            gpsLatitude REAL,
            gpsLongitude REAL,
            uploadTimestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            imageMetadata TEXT,
            cloudUrl TEXT,
            isActive INTEGER DEFAULT 1,
            FOREIGN KEY(username) REFERENCES users(username)
        )`
    ];
    
    console.log('Starting enhanced image features migration...');
    
    for (let i = 0; i < migrations.length; i++) {
        const migration = migrations[i];
        try {
            await new Promise((resolve, reject) => {
                db.run(migration, (err) => {
                    if (err) {
                        // Check if error is due to column already exists
                        if (err.message.includes('duplicate column name')) {
                            console.log(`Column already exists, skipping: ${migration.substring(0, 50)}...`);
                            resolve();
                        } else {
                            console.error(`Migration ${i + 1} failed:`, err.message);
                            reject(err);
                        }
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
    
    console.log('Enhanced image features migration completed successfully!');
}

/**
 * Rollback the migration (remove added columns and tables)
 * Note: SQLite has limited ALTER TABLE support, so this is simplified
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise<void>}
 */
async function rollbackMigration(db) {
    const rollbackCommands = [
        `DROP TABLE IF EXISTS gps_validations`,
        `DROP TABLE IF EXISTS ai_analysis_results`,
        `DROP TABLE IF EXISTS enhanced_images`,
        `DROP TABLE IF EXISTS user_avatars`
        // Note: Cannot easily drop columns in SQLite, so we leave them
    ];
    
    console.log('Rolling back enhanced image features migration...');
    
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
    
    console.log('Rollback completed');
}

module.exports = {
    runMigration,
    rollbackMigration
};