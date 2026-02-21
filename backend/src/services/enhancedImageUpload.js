const multer = require('multer');
const sharp = require('sharp');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const exifr = require('exifr');
const piexifjs = require('piexifjs');
const geolib = require('geolib');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configure AWS S3
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();
const useCloudStorage = process.env.USE_CLOUD_STORAGE === 'true';

// Create upload directories if they don't exist (for local storage)
const createUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/avatars', 
    'uploads/events',
    'uploads/progress',
    'uploads/posts',
    'uploads/temp'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, '../../', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

// Initialize upload directories
createUploadDirs();

// GPS Metadata utilities
const gpsMetadataProcessor = {
  // Extract GPS coordinates from image EXIF data
  extractGPS: async (imagePath) => {
    try {
      const exifData = await exifr.parse(imagePath, ['gps', 'latitude', 'longitude']);
      if (exifData && exifData.latitude && exifData.longitude) {
        return {
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          accuracy: exifData.gpsAccuracy || null,
          altitude: exifData.altitude || null,
          device: exifData.make || null,
          model: exifData.model || null
        };
      }
      return null;
    } catch (error) {
      console.warn('Failed to extract GPS data:', error.message);
      return null;
    }
  },

  // Add GPS metadata to image if not present
  addGPS: async (imagePath, latitude, longitude) => {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const exifObj = piexifjs.load(imageBuffer);
      
      // Convert coordinates to EXIF format
      const latDeg = Math.abs(latitude);
      const latRef = latitude >= 0 ? 'N' : 'S';
      const lonDeg = Math.abs(longitude);
      const lonRef = longitude >= 0 ? 'E' : 'W';
      
      exifObj.GPS[piexifjs.GPSIFD.GPSLatitudeRef] = latRef;
      exifObj.GPS[piexifjs.GPSIFD.GPSLatitude] = piexifjs.GPSHelper.degToDmsRational(latDeg);
      exifObj.GPS[piexifjs.GPSIFD.GPSLongitudeRef] = lonRef;
      exifObj.GPS[piexifjs.GPSIFD.GPSLongitude] = piexifjs.GPSHelper.degToDmsRational(lonDeg);
      
      const exifBytes = piexifjs.dump(exifObj);
      const newImageBuffer = piexifjs.insert(exifBytes, imageBuffer);
      
      fs.writeFileSync(imagePath, newImageBuffer);
      return { success: true };
    } catch (error) {
      console.warn('Failed to add GPS metadata:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Validate GPS coordinates against expected event location
  validateLocation: (photoGPS, eventLocation, maxDistance = 500) => {
    if (!photoGPS || !eventLocation) return { valid: false, reason: 'Missing location data' };
    
    const distance = geolib.getDistance(
      { latitude: photoGPS.latitude, longitude: photoGPS.longitude },
      { latitude: eventLocation.latitude, longitude: eventLocation.longitude }
    );
    
    const isValid = distance <= maxDistance;
    return {
      valid: isValid,
      distance: distance,
      maxDistance: maxDistance,
      reason: isValid ? 'Valid location' : `Photo taken ${distance}m from event location (max: ${maxDistance}m)`
    };
  }
};

// AI Impact Analysis Service
const aiImpactAnalyzer = {
  // Analyze before/after impact using simple image comparison
  analyzeImpact: async (beforeImagePath, afterImagePath) => {
    try {
      // Get basic image statistics for comparison
      const beforeStats = await sharp(beforeImagePath).stats();
      const afterStats = await sharp(afterImagePath).stats();
      
      // Simple analysis based on brightness and color distribution
      const impactScore = aiImpactAnalyzer.calculateImpactScore(beforeStats, afterStats);
      
      return {
        success: true,
        impact: {
          score: impactScore,
          improvement: impactScore > 0.5,
          confidence: Math.min(Math.abs(impactScore - 0.5) * 2, 1),
          analysis: aiImpactAnalyzer.generateAnalysisText(impactScore)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Calculate impact score based on image statistics
  calculateImpactScore: (beforeStats, afterStats) => {
    // Compare brightness channels (cleaner areas are typically brighter)
    const beforeBrightness = (beforeStats.channels[0].mean + beforeStats.channels[1].mean + beforeStats.channels[2].mean) / 3;
    const afterBrightness = (afterStats.channels[0].mean + afterStats.channels[1].mean + afterStats.channels[2].mean) / 3;
    
    const brightnessImprovement = (afterBrightness - beforeBrightness) / 255;
    
    // Normalize to 0-1 scale (0.5 = no change, >0.5 = improvement, <0.5 = degradation)
    return Math.max(0, Math.min(1, 0.5 + brightnessImprovement));
  },

  // Generate human-readable analysis
  generateAnalysisText: (score) => {
    if (score >= 0.8) return 'Excellent cleanup impact detected!';
    if (score >= 0.6) return 'Good cleanup improvement visible';
    if (score >= 0.4) return 'Moderate cleanup progress detected';
    if (score >= 0.2) return 'Minor cleanup improvements visible';
    return 'Limited visual improvement detected';
  },

  // Estimate waste volume from image (simplified analysis)
  estimateWasteVolume: async (imagePath) => {
    try {
      const { width, height } = await sharp(imagePath).metadata();
      const stats = await sharp(imagePath).stats();
      
      // Simple heuristic based on dark areas (assuming waste is darker than clean areas)
      const avgBrightness = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
      const pixelArea = width * height;
      
      // Estimate waste coverage as percentage
      const wasteCoverage = Math.max(0, (200 - avgBrightness) / 200);
      
      // Convert to estimated volume (rough approximation)
      const estimatedVolume = pixelArea * wasteCoverage * 0.000001; // Convert to cubic meters
      
      return {
        success: true,
        estimate: {
          coveragePercent: Math.round(wasteCoverage * 100),
          estimatedVolume: Math.round(estimatedVolume * 100) / 100,
          confidence: 'low', // Simple analysis has low confidence
          method: 'image_brightness_analysis'
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Cloud Storage Configuration
const createCloudStorage = () => {
  if (!useCloudStorage) return null;
  
  return multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET || 'city-cleanup-photos',
    acl: 'private',
    key: function (req, file, cb) {
      const uploadType = req.params.type || 'temp';
      const timestamp = Date.now();
      const uniqueId = crypto.randomUUID();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uploadType}/${timestamp}-${uniqueId}${ext}`);
    },
    metadata: function (req, file, cb) {
      const metadata = {
        'Content-Type': file.mimetype,
        'Upload-Time': new Date().toISOString()
      };
      
      // Add GPS metadata if available
      if (req.body.latitude && req.body.longitude) {
        metadata['GPS-Latitude'] = req.body.latitude;
        metadata['GPS-Longitude'] = req.body.longitude;
      }
      
      if (req.body.eventId) {
        metadata['Event-ID'] = req.body.eventId;
      }
      
      cb(null, metadata);
    }
  });
};

// Configure storage (cloud or local)
const storage = useCloudStorage ? createCloudStorage() : multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.params.type || 'temp';
    const uploadPath = path.join(__dirname, '../../uploads', uploadType);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${timestamp}-${uniqueId}${ext}`;
    cb(null, filename);
  }
});

// File filter for images only
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'), false);
  }
};

// Configure multer with enhanced settings
const uploadConfig = {
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // Increased to 20MB for high-quality photos
    files: 10 // Increased to 10 files per upload
  },
  fileFilter: imageFilter
};

const upload = useCloudStorage ? multer(uploadConfig) : multer(uploadConfig);

// Enhanced image processing utilities
const imageProcessor = {
  // Process avatar images with GPS preservation
  processAvatar: async (inputPath, outputPath, gpsData = null) => {
    try {
      // Process image with sharp
      await sharp(inputPath)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toFile(outputPath);
      
      // Add GPS metadata if provided
      if (gpsData && gpsData.latitude && gpsData.longitude) {
        await gpsMetadataProcessor.addGPS(outputPath, gpsData.latitude, gpsData.longitude);
      }
      
      return { success: true, path: outputPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Process cleanup photos with full analysis
  processCleanupPhoto: async (inputPath, outputPath, options = {}) => {
    try {
      const { width = 1200, quality = 80, preserveGPS = true, performAnalysis = true } = options;
      
      // Extract original GPS data before processing
      let originalGPS = null;
      if (preserveGPS) {
        originalGPS = await gpsMetadataProcessor.extractGPS(inputPath);
      }
      
      // Process image
      await sharp(inputPath)
        .resize(width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ 
          quality: quality,
          progressive: true 
        })
        .toFile(outputPath);
      
      // Restore GPS metadata if it was present
      if (originalGPS) {
        await gpsMetadataProcessor.addGPS(outputPath, originalGPS.latitude, originalGPS.longitude);
      } else if (options.gpsData) {
        await gpsMetadataProcessor.addGPS(outputPath, options.gpsData.latitude, options.gpsData.longitude);
      }
      
      let analysis = null;
      if (performAnalysis) {
        analysis = await aiImpactAnalyzer.estimateWasteVolume(outputPath);
      }
      
      return { 
        success: true, 
        path: outputPath,
        gpsData: originalGPS || options.gpsData,
        analysis: analysis
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Create high-quality thumbnails
  createThumbnail: async (inputPath, outputPath) => {
    try {
      await sharp(inputPath)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ 
          quality: 70,
          progressive: true 
        })
        .toFile(outputPath);
      
      return { success: true, path: outputPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get comprehensive image metadata
  getImageInfo: async (imagePath) => {
    try {
      const metadata = await sharp(imagePath).metadata();
      const gpsData = await gpsMetadataProcessor.extractGPS(imagePath);
      const stats = fs.statSync(imagePath);
      
      return {
        success: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: metadata.size,
          quality: metadata.quality,
          created: stats.birthtime,
          modified: stats.mtime,
          gps: gpsData,
          hasAlpha: metadata.hasAlpha,
          fileSize: stats.size
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Visual Progress Tracking utilities
const visualProgressTracker = {
  // Compare before and after photos for impact assessment
  comparePhotos: async (beforePath, afterPath, eventLocation = null) => {
    try {
      // Extract GPS data from both photos
      const beforeGPS = await gpsMetadataProcessor.extractGPS(beforePath);
      const afterGPS = await gpsMetadataProcessor.extractGPS(afterPath);
      
      // Validate locations if event location provided
      let locationValidation = null;
      if (eventLocation) {
        const beforeLocationCheck = gpsMetadataProcessor.validateLocation(beforeGPS, eventLocation);
        const afterLocationCheck = gpsMetadataProcessor.validateLocation(afterGPS, eventLocation);
        
        locationValidation = {
          before: beforeLocationCheck,
          after: afterLocationCheck,
          valid: beforeLocationCheck.valid && afterLocationCheck.valid
        };
      }
      
      // Perform AI impact analysis
      const impactAnalysis = await aiImpactAnalyzer.analyzeImpact(beforePath, afterPath);
      
      // Get waste volume estimates
      const beforeWasteEstimate = await aiImpactAnalyzer.estimateWasteVolume(beforePath);
      const afterWasteEstimate = await aiImpactAnalyzer.estimateWasteVolume(afterPath);
      
      return {
        success: true,
        comparison: {
          gpsData: { before: beforeGPS, after: afterGPS },
          locationValidation: locationValidation,
          impactAnalysis: impactAnalysis.success ? impactAnalysis.impact : null,
          wasteEstimates: {
            before: beforeWasteEstimate.success ? beforeWasteEstimate.estimate : null,
            after: afterWasteEstimate.success ? afterWasteEstimate.estimate : null
          },
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Generate visual progress report
  generateProgressReport: (comparisonData) => {
    const { impactAnalysis, wasteEstimates, locationValidation } = comparisonData;
    
    const report = {
      overallScore: 0,
      improvements: [],
      concerns: [],
      recommendations: []
    };
    
    // Analyze impact score
    if (impactAnalysis) {
      report.overallScore = impactAnalysis.score * 100;
      
      if (impactAnalysis.improvement) {
        report.improvements.push(`Visible cleanup improvement detected (${Math.round(impactAnalysis.confidence * 100)}% confidence)`);
      }
      
      if (impactAnalysis.score > 0.7) {
        report.improvements.push('Excellent cleanup impact achieved!');
      } else if (impactAnalysis.score < 0.3) {
        report.concerns.push('Limited visual improvement detected');
        report.recommendations.push('Consider additional cleanup efforts in this area');
      }
    }
    
    // Location validation feedback
    if (locationValidation && !locationValidation.valid) {
      report.concerns.push('Photos may not be taken at the correct event location');
      report.recommendations.push('Ensure photos are taken within the designated cleanup area');
    }
    
    // Waste volume analysis
    if (wasteEstimates.before && wasteEstimates.after) {
      const volumeReduction = wasteEstimates.before.coveragePercent - wasteEstimates.after.coveragePercent;
      if (volumeReduction > 20) {
        report.improvements.push(`Significant waste reduction: ${volumeReduction}% area cleaned`);
      } else if (volumeReduction > 0) {
        report.improvements.push(`Waste reduction detected: ${volumeReduction}% area cleaned`);
      }
    }
    
    return report;
  }
};

// Cleanup utility to remove temporary files
const cleanupTempFiles = (filePaths) => {
  filePaths.forEach(filePath => {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn(`Failed to cleanup temp file: ${filePath}`, error.message);
      }
    }
  });
};

// Generate URL for image access (cloud or local)
const getImageUrl = (filePath, baseUrl = '/api/v1/images') => {
  if (!filePath) return null;
  
  if (useCloudStorage) {
    // Return S3 URL for cloud storage
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;
  } else {
    // Return local URL
    const relativePath = filePath.replace(/.*uploads\//, '');
    return `${baseUrl}/${relativePath}`;
  }
};

module.exports = {
  upload,
  imageProcessor,
  gpsMetadataProcessor,
  aiImpactAnalyzer,
  visualProgressTracker,
  cleanupTempFiles,
  getImageUrl,
  createUploadDirs,
  useCloudStorage
};