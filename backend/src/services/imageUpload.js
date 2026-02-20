const multer = require('multer');
// const sharp = require('sharp'); // Disabled for now
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create upload directories if they don't exist
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

// Configure multer for different upload types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.params.type || 'temp';
    const uploadPath = path.join(__dirname, '../../uploads', uploadType);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
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

// Configure multer with size limits and file filtering
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  },
  fileFilter: imageFilter
});

// Image processing utilities (simplified without sharp for now)
const imageProcessor = {
  // Process avatar images (basic copy for now)
  processAvatar: async (inputPath, outputPath) => {
    try {
      // For now, just copy the file
      fs.copyFileSync(inputPath, outputPath);
      return { success: true, path: outputPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Process event/progress photos (basic copy for now)
  processPhoto: async (inputPath, outputPath, options = {}) => {
    try {
      // For now, just copy the file
      fs.copyFileSync(inputPath, outputPath);
      return { success: true, path: outputPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Create thumbnail (basic copy for now)
  createThumbnail: async (inputPath, outputPath) => {
    try {
      // For now, just copy the file
      fs.copyFileSync(inputPath, outputPath);
      return { success: true, path: outputPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get image metadata (basic file stats for now)
  getImageInfo: async (imagePath) => {
    try {
      const stats = fs.statSync(imagePath);
      return {
        success: true,
        metadata: {
          size: stats.size,
          format: path.extname(imagePath).toLowerCase().substring(1),
          created: stats.birthtime,
          modified: stats.mtime
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
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

// Generate relative URL for frontend access
const getImageUrl = (filePath, baseUrl = '/api/v1/images') => {
  if (!filePath) return null;
  const relativePath = filePath.replace(/.*uploads\//, '');
  return `${baseUrl}/${relativePath}`;
};

module.exports = {
  upload,
  imageProcessor,
  cleanupTempFiles,
  getImageUrl,
  createUploadDirs
};