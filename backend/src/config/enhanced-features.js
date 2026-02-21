/**
 * Enhanced Image Processing Configuration
 * Manages GPS metadata, AI analysis, cloud storage, and visual progress tracking
 */

require('dotenv').config();

const config = {
    // === GPS & LOCATION SETTINGS ===
    gps: {
        // Enable GPS metadata processing
        enabled: process.env.GPS_ENABLED === 'true' || true,
        
        // Maximum allowed distance from event location (in meters)
        maxDistanceFromEvent: parseInt(process.env.GPS_MAX_DISTANCE) || 1000,
        
        // GPS accuracy requirements
        minAccuracy: parseFloat(process.env.GPS_MIN_ACCURACY) || 100, // meters
        
        // Validation levels: 'strict', 'moderate', 'lenient'
        validationLevel: process.env.GPS_VALIDATION_LEVEL || 'moderate',
        
        // Default GPS coordinates (fallback)
        defaultCoordinates: {
            latitude: parseFloat(process.env.DEFAULT_LATITUDE) || 0.3476,  // Uganda center
            longitude: parseFloat(process.env.DEFAULT_LONGITUDE) || 32.5825
        },
        
        // Privacy settings
        privacy: {
            // Strip exact GPS coordinates before storing (round to area)
            anonymize: process.env.GPS_ANONYMIZE === 'true' || false,
            // Precision level (decimal places) for anonymized coordinates
            precision: parseInt(process.env.GPS_PRECISION) || 3
        }
    },

    // === CLOUD STORAGE CONFIGURATION ===
    cloudStorage: {
        // Enable cloud storage (AWS S3)
        enabled: process.env.USE_CLOUD_STORAGE === 'true' || false,
        
        // Storage provider: 'aws', 'azure', 'gcp', 'local'
        provider: process.env.CLOUD_PROVIDER || 'aws',
        
        // AWS S3 Configuration
        aws: {
            region: process.env.AWS_REGION || 'us-east-1',
            bucket: process.env.AWS_S3_BUCKET || 'city-cleanup-images',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            
            // S3 folder structure
            folders: {
                avatars: 'avatars',
                progress: 'progress',
                beforePhotos: 'progress/before',
                afterPhotos: 'progress/after',
                temp: 'temp'
            },
            
            // File naming strategy
            naming: {
                strategy: 'uuid', // 'uuid', 'timestamp', 'user-date'
                includeUsername: true,
                includeTimestamp: true
            }
        },
        
        // Fallback to local storage if cloud fails
        fallbackToLocal: true,
        
        // Auto-migrate from local to cloud
        autoMigrate: process.env.AUTO_MIGRATE_TO_CLOUD === 'true' || false
    },

    // === AI ANALYSIS CONFIGURATION ===
    aiAnalysis: {
        // Enable AI-powered impact analysis
        enabled: process.env.AI_ANALYSIS_ENABLED === 'true' || true,
        
        // Analysis types to perform
        features: {
            impactScore: true,        // Calculate cleanup impact
            wasteDetection: true,     // Detect waste in images
            qualityAssessment: true,  // Assess image quality
            colorAnalysis: true,      // Analyze color changes
            contrastAnalysis: true,   // Compare visual contrast
            brightnessAnalysis: true  // Analyze lighting changes
        },
        
        // Impact scoring weights
        impactScoring: {
            brightnessImprovement: 0.25,  // Weight for brightness increase
            contrastImprovement: 0.20,    // Weight for contrast improvement
            colorfulness: 0.15,           // Weight for color vibrancy
            wasteReduction: 0.30,         // Weight for waste removal
            sharpness: 0.10              // Weight for image clarity
        },
        
        // Quality thresholds
        qualityThresholds: {
            minWidth: 300,               // Minimum image width (pixels)
            minHeight: 300,              // Minimum image height (pixels)
            minBrightness: 50,           // Minimum brightness level (0-255)
            maxBrightness: 230,          // Maximum brightness level (0-255)
            minContrast: 0.3,            // Minimum contrast ratio
            minSharpness: 0.4            // Minimum sharpness score
        },
        
        // Processing limits
        processing: {
            maxImageSize: 10 * 1024 * 1024,  // 10MB max file size
            timeoutMs: 30000,                 // 30 second processing timeout
            maxConcurrent: 3                  // Max concurrent analysis jobs
        }
    },

    // === IMAGE PROCESSING SETTINGS ===
    imageProcessing: {
        // Image optimization
        optimization: {
            enabled: true,
            quality: 85,              // JPEG quality (1-100)
            progressive: true,        // Progressive JPEG
            removeMetadata: false     // Keep metadata for GPS
        },
        
        // Image resizing
        resize: {
            enabled: true,
            maxWidth: 1920,
            maxHeight: 1920,
            maintainAspectRatio: true
        },
        
        // Thumbnail generation
        thumbnails: {
            enabled: true,
            sizes: [150, 300, 600],   // Thumbnail sizes
            quality: 75
        },
        
        // Supported formats
        supportedFormats: ['jpeg', 'jpg', 'png', 'webp'],
        
        // Output format preference
        outputFormat: 'jpeg'
    },

    // === VISUAL PROGRESS TRACKING ===
    visualProgress: {
        // Enable visual progress comparison
        enabled: true,
        
        // Comparison algorithms
        algorithms: {
            histogram: true,          // Color histogram comparison
            structural: true,         // Structural similarity (SSIM)
            perceptual: true,         // Perceptual hash
            edgeDetection: true       // Edge detection comparison
        },
        
        // Progress reporting
        reporting: {
            generateReports: true,
            includeMetrics: true,
            includeVisualDiff: false,  // Generate visual diff images
            exportFormats: ['json', 'csv']
        },
        
        // Validation rules
        validation: {
            minSimilarityForComparison: 0.3,  // Minimum similarity to be comparable
            maxTimeBetweenPhotos: 24 * 60 * 60 * 1000,  // 24 hours in ms
            requireSameLocation: false         // Require photos from same GPS location
        }
    },

    // === STORAGE PATHS ===
    storage: {
        // Local storage paths
        local: {
            uploadsDir: process.env.UPLOADS_DIR || './uploads',
            tempDir: process.env.TEMP_DIR || './uploads/temp',
            processedDir: process.env.PROCESSED_DIR || './uploads/processed'
        },
        
        // File naming patterns
        naming: {
            avatars: 'avatar-{username}-{timestamp}',
            beforePhotos: 'before-{eventId}-{username}-{timestamp}',
            afterPhotos: 'after-{eventId}-{username}-{timestamp}',
            enhanced: 'enhanced-{type}-{original}'
        },
        
        // Cleanup settings
        cleanup: {
            tempFileRetentionMinutes: 60,     // How long to keep temp files
            processedFileRetentionDays: 30    // How long to keep processed files
        }
    },

    // === SECURITY & PRIVACY ===
    security: {
        // File upload restrictions
        maxFileSize: 10 * 1024 * 1024,    // 10MB
        allowedMimeTypes: [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/webp'
        ],
        
        // GPS privacy
        gpsPrivacy: {
            enabled: true,
            blurRadius: 100,              // Blur GPS to nearest 100m
            excludeExactCoordinates: true
        },
        
        // Data retention
        dataRetention: {
            imageRetentionDays: 365,      // Keep images for 1 year
            metadataRetentionDays: 730,   // Keep metadata for 2 years
            analysisRetentionDays: 365    // Keep analysis results for 1 year
        }
    },

    // === PERFORMANCE & MONITORING ===
    performance: {
        // Caching
        caching: {
            enabled: true,
            analysisCacheTTL: 60 * 60 * 1000,     // 1 hour
            imageCacheTTL: 24 * 60 * 60 * 1000,   // 24 hours
            metadataCacheTTL: 12 * 60 * 60 * 1000 // 12 hours
        },
        
        // Monitoring
        monitoring: {
            logAnalysisPerformance: true,
            logUploadStatistics: true,
            enableMetrics: process.env.ENABLE_METRICS === 'true' || false
        },
        
        // Rate limiting
        rateLimiting: {
            uploadsPerMinute: 10,
            analysisPerMinute: 5,
            maxConcurrentUploads: 3
        }
    },

    // === FEATURE FLAGS ===
    features: {
        enhancedImageUpload: true,
        gpsMetadata: true,
        aiAnalysis: true,
        cloudStorage: process.env.USE_CLOUD_STORAGE === 'true' || false,
        visualProgressTracking: true,
        realTimeAnalysis: false,
        batchProcessing: true,
        imageOptimization: true
    },

    // === DEVELOPMENT & DEBUG ===
    development: {
        debug: process.env.NODE_ENV === 'development',
        verbose: process.env.VERBOSE === 'true' || false,
        saveIntermediateFiles: process.env.SAVE_INTERMEDIATE === 'true' || false,
        mockAIAnalysis: process.env.MOCK_AI === 'true' || false,
        skipGPSValidation: process.env.SKIP_GPS_VALIDATION === 'true' || false
    }
};

// === VALIDATION FUNCTIONS ===

/**
 * Validate GPS coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} - Valid coordinates
 */
config.validateGPS = (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Get cloud storage configuration
 * @returns {object} - Cloud storage config
 */
config.getCloudStorageConfig = () => {
    if (!config.cloudStorage.enabled) return null;
    
    switch (config.cloudStorage.provider) {
        case 'aws':
            return config.cloudStorage.aws;
        default:
            return null;
    }
};

/**
 * Check if feature is enabled
 * @param {string} feature - Feature name
 * @returns {boolean} - Feature enabled status
 */
config.isFeatureEnabled = (feature) => {
    return config.features[feature] === true;
};

/**
 * Get storage path for image type
 * @param {string} type - Image type (avatar, before, after)
 * @param {object} options - Options (username, eventId, timestamp)
 * @returns {string} - Storage path
 */
config.getStoragePath = (type, options = {}) => {
    const { username, eventId, timestamp = Date.now() } = options;
    
    let pattern = config.storage.naming[type];
    if (!pattern) pattern = `${type}-{timestamp}`;
    
    return pattern
        .replace('{username}', username || 'user')
        .replace('{eventId}', eventId || 'event')
        .replace('{timestamp}', timestamp)
        .replace('{type}', type);
};

module.exports = config;