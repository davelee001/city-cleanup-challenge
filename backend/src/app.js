const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const emitter = require('./events');
const { upload, imageProcessor, cleanupTempFiles, getImageUrl } = require('./services/imageUpload');
const { 
  upload: enhancedUpload, 
  imageProcessor: enhancedImageProcessor,
  gpsMetadataProcessor,
  aiImpactAnalyzer,
  visualProgressTracker,
  useCloudStorage
} = require('./services/enhancedImageUpload');
const { initializeGamificationAPI } = require('./routes/gamification');
const GamificationIntegration = require('./services/gamificationIntegration');

// --- Event Listeners ---

// Listener for user signup event to handle analytics
emitter.on('user:signup', (user) => {
  db.run(
    'INSERT INTO usage_analytics (activity_type, user, metadata) VALUES (?, ?, ?)',
    ['user_signup', user.username, JSON.stringify({ userId: user.id })],
    (err) => {
      if (err) {
        // Emit a system error event for logging or monitoring
        emitter.emit('error', new Error(`Failed to record user_signup activity for ${user.username}: ${err.message}`));
      }
    }
  );
});

// Listener for new post event to handle analytics
emitter.on('post:created', (post) => {
    db.run(
        'INSERT INTO usage_analytics (activity_type, user, metadata) VALUES (?, ?, ?)',
        ['post_created', post.username, JSON.stringify({ postId: post.id })],
        (err) => {
            if (err) {
                emitter.emit('error', new Error(`Failed to record post_created activity for ${post.username}: ${err.message}`));
            }
        }
    );
});

// Listener for new event creation to handle analytics
emitter.on('event:created', (event) => {
    db.run(
        'INSERT INTO usage_analytics (activity_type, user, metadata) VALUES (?, ?, ?)',
        ['event_created', event.username, JSON.stringify({ eventId: event.id, title: event.title })],
        (err) => {
            if (err) {
                emitter.emit('error', new Error(`Failed to record event_created activity for ${event.username}: ${err.message}`));
            }
        }
    );
});

// Listener for new plan creation to handle analytics
emitter.on('plan:created', (plan) => {
    db.run(
        'INSERT INTO usage_analytics (activity_type, user, metadata) VALUES (?, ?, ?)',
        ['plan_created', plan.created_by, JSON.stringify({ planId: plan.id, title: plan.title })],
        (err) => {
            if (err) {
                emitter.emit('error', new Error(`Failed to record plan_created activity for ${plan.created_by}: ${err.message}`));
            }
        }
    );
});


// Middleware to check if user is admin
function requireAdmin(req, res, next) {
	const { username } = req.body;
	if (!username) {
		return res.status(401).json({ success: false, message: 'Authentication required' });
	}
	
	db.get('SELECT role FROM users WHERE username = ?', [username], (err, user) => {
		if (err || !user || user.role !== 'admin') {
			return res.status(403).json({ success: false, message: 'Admin access required' });
		}
		next();
	});
}

function createApp() {
	const app = express();
	app.use(cors());
	app.use(express.json());
	app.use(morgan('dev'));

	// Initialize gamification integration
	const gamificationIntegration = new GamificationIntegration(db, emitter);

	// Health check endpoint
	app.get('/health', (req, res) => {
		db.get('SELECT name FROM sqlite_master WHERE type="table"', (err) => {
			if (err) {
				return res.status(500).json({ status: 'error', message: 'Database connection failed' });
			}
			res.json({ status: 'ok', message: 'Backend is running and database is connected' });
		});
	});

	const apiRouter = express.Router();

	// User authentication endpoints
	apiRouter.post('/signup', (req, res) => {
		const { username, password } = req.body;
		if (!username || !password) {
			return res.status(400).json({ success: false, message: 'Username and password required' });
		}
		const role = 'user'; // Default role for new users
		db.run(
			'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
			[username, password, role],
			function (err) {
				if (err) {
					return res.status(400).json({ success: false, message: 'Username already exists' });
				}
                const newUser = { id: this.lastID, username, role };
                // Emit an event for the new user signup
                emitter.emit('user:signup', newUser);
				res.json({ success: true, user: newUser });
			}
		);
	});

	app.post('/login', (req, res) => {
		const { username, password } = req.body;
		if (!username || !password) {
			return res.status(400).json({ success: false, message: 'Username and password required' });
		}
		db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!user) {
				return res.status(401).json({ success: false, message: 'Invalid credentials' });
			}
			res.json({ success: true, user: { username: user.username, role: user.role } });
		});
	});

	// Posts endpoints
	app.post('/posts', (req, res) => {
		const { username, content } = req.body;
		if (!username || !content) {
			return res.status(400).json({ success: false, message: 'Username and content required' });
		}
		const createdAt = new Date().toISOString();
		db.run(
			'INSERT INTO posts (username, content, createdAt) VALUES (?, ?, ?)',
			[username, content, createdAt],
			function (err) {
				if (err) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				
				db.get('SELECT * FROM posts WHERE id = ?', [this.lastID], (err2, post) => {
					if (err2) {
						return res.status(500).json({ success: false, message: 'Database error' });
					}
                    // Emit an event for the new post
                    emitter.emit('post:created', post);
					return res.json({ success: true, post });
				});
			}
		);
	});

	apiRouter.get('/posts', (req, res) => {
		db.all('SELECT * FROM posts ORDER BY createdAt DESC', (err, posts) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true, posts });
		});
	});

	app.put('/posts/:id', (req, res) => {
		const { id } = req.params;
		const { username, content } = req.body;
		if (!username || !content) {
			return res.status(400).json({ success: false, message: 'Username and content required' });
		}
		db.get('SELECT * FROM posts WHERE id = ?', [id], (err, post) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!post) {
				return res.status(404).json({ success: false, message: 'Post not found' });
			}
			if (post.username !== username) {
				return res.status(403).json({ success: false, message: 'Not authorized' });
			}
			db.run('UPDATE posts SET content = ? WHERE id = ?', [content, id], function (err2) {
				if (err2) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				res.json({ success: true });
			});
		});
	});

	app.delete('/posts/:id', (req, res) => {
		const { id } = req.params;
		const { username } = req.body;
		if (!username) {
			return res.status(400).json({ success: false, message: 'Username required' });
		}
		db.get('SELECT * FROM posts WHERE id = ?', [id], (err, post) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!post) {
				return res.status(404).json({ success: false, message: 'Post not found' });
			}
			if (post.username !== username) {
				return res.status(403).json({ success: false, message: 'Not authorized' });
			}
			db.run('DELETE FROM posts WHERE id = ?', [id], function (err2) {
				if (err2) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				res.json({ success: true });
			});
		});
	});

	// Events endpoints
	app.post('/events', (req, res) => {
		const { title, description, date, time, location, username } = req.body;
		if (!title || !description || !date || !time || !location || !username) {
			return res.status(400).json({ success: false, message: 'All fields required' });
		}
		const createdAt = new Date().toISOString();
		db.run(
			'INSERT INTO events (title, description, date, time, location, username, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[title, description, date, time, location, username, createdAt],
			function (err) {
				if (err) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				
				db.get('SELECT * FROM events WHERE id = ?', [this.lastID], (err2, event) => {
					if (err2) {
						return res.status(500).json({ success: false, message: 'Database error' });
					}
                    emitter.emit('event:created', event);
					return res.json({ success: true, event });
				});
			}
		);
	});

	apiRouter.get('/events', (req, res) => {
		db.all('SELECT * FROM events ORDER BY date ASC', (err, events) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true, events });
		});
	});

	app.put('/events/:id', (req, res) => {
		const { id } = req.params;
		const { title, description, date, time, location, username } = req.body;
		if (!title || !description || !date || !time || !location || !username) {
			return res.status(400).json({ success: false, message: 'All fields required' });
		}
		db.get('SELECT * FROM events WHERE id = ?', [id], (err, event) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!event) {
				return res.status(404).json({ success: false, message: 'Event not found' });
			}
			if (event.username !== username) {
				return res.status(403).json({ success: false, message: 'Not authorized' });
			}
			db.run(
				'UPDATE events SET title = ?, description = ?, date = ?, time = ?, location = ? WHERE id = ?',
				[title, description, date, time, location, id],
				function (err2) {
					if (err2) {
						return res.status(500).json({ success: false, message: 'Database error' });
					}
					res.json({ success: true });
				}
			);
		});
	});

	app.delete('/events/:id', (req, res) => {
		const { id } = req.params;
		const { username } = req.body;
		if (!username) {
			return res.status(400).json({ success: false, message: 'Username required' });
		}
		db.get('SELECT * FROM events WHERE id = ?', [id], (err, event) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!event) {
				return res.status(404).json({ success: false, message: 'Event not found' });
			}
			if (event.username !== username) {
				return res.status(403).json({ success: false, message: 'Not authorized' });
			}
			db.run('DELETE FROM events WHERE id = ?', [id], function (err2) {
				if (err2) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				res.json({ success: true });
			});
		});
	});

	// Admin endpoints
	// Cleanup Plans Management
	app.get('/admin/cleanup-plans', requireAdmin, (req, res) => {
		db.all('SELECT * FROM cleanup_plans ORDER BY created_at DESC', (err, plans) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true, plans });
		});
	});

	app.post('/admin/cleanup-plans', requireAdmin, (req, res) => {
		const { title, description, requirements, codes, username } = req.body;
		if (!title || !description || !requirements || !codes) {
			return res.status(400).json({ success: false, message: 'All fields required' });
		}
		const created_at = new Date().toISOString();
		const codesJson = JSON.stringify(codes);
		const requirementsJson = JSON.stringify(requirements);
		
		db.run(
			'INSERT INTO cleanup_plans (title, description, requirements, codes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
			[title, description, requirementsJson, codesJson, username, created_at],
			function (err) {
				if (err) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				
				db.get('SELECT * FROM cleanup_plans WHERE id = ?', [this.lastID], (err2, plan) => {
					if (err2) {
						return res.status(500).json({ success: false, message: 'Database error' });
					}
					// Parse JSON fields for response
					plan.requirements = JSON.parse(plan.requirements);
					plan.codes = JSON.parse(plan.codes);
                    emitter.emit('plan:created', plan);
					return res.json({ success: true, plan });
				});
			}
		);
	});

	apiRouter.put('/admin/cleanup-plans/:id', requireAdmin, (req, res) => {
		const { id } = req.params;
		const { title, description, requirements, codes, username } = req.body;
		if (!title || !description || !requirements || !codes) {
			return res.status(400).json({ success: false, message: 'All fields required' });
		}
		const codesJson = JSON.stringify(codes);
		const requirementsJson = JSON.stringify(requirements);
		
		db.run(
			'UPDATE cleanup_plans SET title = ?, description = ?, requirements = ?, codes = ? WHERE id = ?',
			[title, description, requirementsJson, codesJson, id],
			function (err) {
				if (err) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				res.json({ success: true });
			}
		);
	});

	app.delete('/admin/cleanup-plans/:id', requireAdmin, (req, res) => {
		const { id } = req.params;
		db.run('DELETE FROM cleanup_plans WHERE id = ?', [id], function (err) {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true });
		});
	});

	// User Management
	app.get('/admin/users', requireAdmin, (req, res) => {
		db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true, users });
		});
	});

	app.put('/admin/users/:id/role', requireAdmin, (req, res) => {
		const { id } = req.params;
		const { role } = req.body;
		if (!role || !['user', 'admin'].includes(role)) {
			return res.status(400).json({ success: false, message: 'Valid role required (user or admin)' });
		}
		
		db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function (err) {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true });
		});
	});

	// Usage Analytics
	app.get('/admin/analytics', requireAdmin, (req, res) => {
		const { startDate, endDate, activityType } = req.query;
		let query = 'SELECT * FROM usage_analytics WHERE 1=1';
		const params = [];
		
		if (startDate) {
			query += ' AND timestamp >= ?';
			params.push(startDate);
		}
		if (endDate) {
			query += ' AND timestamp <= ?';
			params.push(endDate);
		}
		if (activityType) {
			query += ' AND activity_type = ?';
			params.push(activityType);
		}
		
		query += ' ORDER BY timestamp DESC';
		
		db.all(query, params, (err, analytics) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true, analytics });
		});
	});

	app.get('/admin/analytics/summary', requireAdmin, (req, res) => {
		const queries = [
			'SELECT COUNT(*) as total_users FROM users',
			'SELECT COUNT(*) as total_posts FROM posts',
			'SELECT COUNT(*) as total_events FROM events',
			'SELECT COUNT(*) as total_plans FROM cleanup_plans',
			`SELECT COUNT(*) as active_users FROM (
				SELECT DISTINCT user FROM usage_analytics 
				WHERE timestamp >= datetime('now', '-7 days')
			)`,
			`SELECT activity_type, COUNT(*) as count FROM usage_analytics 
			 WHERE timestamp >= datetime('now', '-30 days') 
			 GROUP BY activity_type`,
		];
		
		Promise.all(queries.map(query => 
			new Promise((resolve, reject) => {
				db.all(query, (err, result) => {
					if (err) reject(err);
					else resolve(result);
				});
			})
		)).then(results => {
			const [totalUsers, totalPosts, totalEvents, totalPlans, activeUsers, activityStats] = results;
			
			res.json({
				success: true,
				summary: {
					totalUsers: totalUsers[0].total_users,
					totalPosts: totalPosts[0].total_posts,
					totalEvents: totalEvents[0].total_events,
					totalPlans: totalPlans[0].total_plans,
					activeUsers: activeUsers[0].active_users,
					activityStats: activityStats
				}
			});
		}).catch(err => {
			res.status(500).json({ success: false, message: 'Database error' });
		});
	});

	// === IMAGE UPLOAD ENDPOINTS ===

	// Serve static image files
	app.use('/api/v1/images', express.static(path.join(__dirname, '../uploads')));

	// Upload avatar endpoint
	apiRouter.post('/upload/avatar', upload.single('avatar'), async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ success: false, message: 'No file uploaded' });
			}

			const { username } = req.body;
			if (!username) {
				cleanupTempFiles([req.file.path]);
				return res.status(400).json({ success: false, message: 'Username required' });
			}

			// Process the avatar image
			const outputPath = path.join(path.dirname(req.file.path), `processed-${req.file.filename}`);
			const processResult = await imageProcessor.processAvatar(req.file.path, outputPath);

			if (!processResult.success) {
				cleanupTempFiles([req.file.path]);
				return res.status(500).json({ success: false, message: 'Failed to process image' });
			}

			// Update user avatar in database
			const relativePath = outputPath.replace(/.*uploads\//, '');
			db.run('UPDATE users SET avatar = ? WHERE username = ?', [relativePath, username], function(err) {
				// Cleanup temp files
				cleanupTempFiles([req.file.path]);

				if (err) {
					cleanupTempFiles([outputPath]);
					return res.status(500).json({ success: false, message: 'Failed to update avatar' });
				}

				const imageUrl = getImageUrl(relativePath);
				res.json({ 
					success: true, 
					message: 'Avatar uploaded successfully',
					avatarUrl: imageUrl,
					path: relativePath
				});
			});

		} catch (error) {
			if (req.file) {
				cleanupTempFiles([req.file.path]);
			}
			res.status(500).json({ success: false, message: error.message });
		}
	});

	// Upload event photos (before/after cleanup)
	apiRouter.post('/upload/progress/:eventId', upload.fields([
		{ name: 'beforePhoto', maxCount: 1 },
		{ name: 'afterPhoto', maxCount: 1 }
	]), async (req, res) => {
		try {
			const { eventId } = req.params;
			const { username, wasteCollected, wasteType, notes } = req.body;

			if (!username || !eventId) {
				return res.status(400).json({ success: false, message: 'Username and event ID required' });
			}

			const processedPhotos = {};
			const tempFiles = [];

			// Process uploaded photos
			if (req.files.beforePhoto) {
				const beforeFile = req.files.beforePhoto[0];
				tempFiles.push(beforeFile.path);
				
				const outputPath = path.join(path.dirname(beforeFile.path), `before-${beforeFile.filename}`);
				const result = await imageProcessor.processPhoto(beforeFile.path, outputPath);
				
				if (result.success) {
					processedPhotos.beforePhotoPath = outputPath.replace(/.*uploads\//, '');
				}
			}

			if (req.files.afterPhoto) {
				const afterFile = req.files.afterPhoto[0];
				tempFiles.push(afterFile.path);
				
				const outputPath = path.join(path.dirname(afterFile.path), `after-${afterFile.filename}`);
				const result = await imageProcessor.processPhoto(afterFile.path, outputPath);
				
				if (result.success) {
					processedPhotos.afterPhotoPath = outputPath.replace(/.*uploads\//, '');
				}
			}

			// Update or insert progress record
			const updateQuery = `
				INSERT OR REPLACE INTO cleanup_progress 
				(eventId, username, wasteCollected, wasteType, beforePhotoPath, afterPhotoPath, notes, updatedAt)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`;

			const updatedAt = new Date().toISOString();
			
			db.run(updateQuery, [
				eventId, 
				username, 
				wasteCollected || 0, 
				wasteType || '', 
				processedPhotos.beforePhotoPath || null,
				processedPhotos.afterPhotoPath || null,
				notes || '',
				updatedAt
			], function(err) {
				// Cleanup temp files
				cleanupTempFiles(tempFiles);

				if (err) {
					return res.status(500).json({ success: false, message: 'Failed to save progress' });
				}

				// Award gamification points for progress update
				gamificationIntegration.awardProgressUpdate(username, eventId, {
					wasteCollected: wasteCollected || 0,
					hasPhotos: !!(processedPhotos.beforePhotoPath || processedPhotos.afterPhotoPath),
					notes: notes || ''
				}).catch(gamificationError => {
					console.error('Error awarding progress points:', gamificationError);
				});

				// Prepare response with image URLs
				const response = {
					success: true,
					message: 'Progress updated successfully',
					progressId: this.lastID || this.changes,
					photos: {}
				};

				if (processedPhotos.beforePhotoPath) {
					response.photos.beforePhoto = getImageUrl(processedPhotos.beforePhotoPath);
				}
				if (processedPhotos.afterPhotoPath) {
					response.photos.afterPhoto = getImageUrl(processedPhotos.afterPhotoPath);
				}

				res.json(response);
			});

		} catch (error) {
			// Cleanup any uploaded files on error
			if (req.files) {
				const tempFiles = [];
				if (req.files.beforePhoto) tempFiles.push(req.files.beforePhoto[0].path);
				if (req.files.afterPhoto) tempFiles.push(req.files.afterPhoto[0].path);
				cleanupTempFiles(tempFiles);
			}
			res.status(500).json({ success: false, message: error.message });
		}
	});

	// Upload general event photos
	apiRouter.post('/upload/event/:eventId', upload.array('photos', 5), async (req, res) => {
		try {
			const { eventId } = req.params;
			const { username } = req.body;

			if (!username || !eventId || !req.files || req.files.length === 0) {
				return res.status(400).json({ success: false, message: 'Username, event ID, and at least one photo required' });
			}

			const processedPhotos = [];
			const tempFiles = req.files.map(file => file.path);

			// Process each uploaded photo
			for (const file of req.files) {
				const outputPath = path.join(path.dirname(file.path), `event-${file.filename}`);
				const result = await imageProcessor.processPhoto(file.path, outputPath);
				
				if (result.success) {
					const relativePath = outputPath.replace(/.*uploads\//, '');
					processedPhotos.push({
						originalName: file.originalname,
						path: relativePath,
						url: getImageUrl(relativePath),
						size: file.size
					});
				}
			}

			// Cleanup temp files
			cleanupTempFiles(tempFiles);

			res.json({
				success: true,
				message: `${processedPhotos.length} photos uploaded successfully`,
				photos: processedPhotos
			});

		} catch (error) {
			if (req.files) {
				cleanupTempFiles(req.files.map(file => file.path));
			}
			res.status(500).json({ success: false, message: error.message });
		}
	});

	// Get user avatar
	apiRouter.get('/user/:username/avatar', (req, res) => {
		const { username } = req.params;
		
		db.get('SELECT avatar FROM users WHERE username = ?', [username], (err, user) => {
			if (err || !user) {
				return res.status(404).json({ success: false, message: 'User not found' });
			}
			
			if (!user.avatar) {
				return res.status(404).json({ success: false, message: 'No avatar set' });
			}

			res.json({
				success: true,
				avatarUrl: getImageUrl(user.avatar)
			});
		});
	});

	// Get cleanup progress photos for an event
	apiRouter.get('/progress/:eventId/photos', (req, res) => {
		const { eventId } = req.params;
		
		const query = `
			SELECT username, beforePhotoPath, afterPhotoPath, wasteCollected, 
				   wasteType, notes, updatedAt
			FROM cleanup_progress 
			WHERE eventId = ? AND (beforePhotoPath IS NOT NULL OR afterPhotoPath IS NOT NULL)
		`;
		
		db.all(query, [eventId], (err, progressRecords) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			
			const photosWithUrls = progressRecords.map(record => ({
				username: record.username,
				wasteCollected: record.wasteCollected,
				wasteType: record.wasteType,
				notes: record.notes,
				updatedAt: record.updatedAt,
				photos: {
					before: record.beforePhotoPath ? getImageUrl(record.beforePhotoPath) : null,
					after: record.afterPhotoPath ? getImageUrl(record.afterPhotoPath) : null
				}
			}));
			
			res.json({
				success: true,
				eventId: eventId,
				progressPhotos: photosWithUrls
			});
		});
	});

	// === ENHANCED IMAGE UPLOAD ENDPOINTS WITH GPS & AI ANALYSIS ===

	// Enhanced progress photo upload with GPS metadata and AI impact analysis
	apiRouter.post('/enhanced/upload/progress/:eventId', enhancedUpload.fields([
		{ name: 'beforePhoto', maxCount: 1 },
		{ name: 'afterPhoto', maxCount: 1 }
	]), async (req, res) => {
		try {
			const { eventId } = req.params;
			const { username, wasteCollected, wasteType, notes, latitude, longitude } = req.body;

			if (!username || !eventId) {
				return res.status(400).json({ success: false, message: 'Username and event ID required' });
			}

			// Get event location for validation
			const event = await new Promise((resolve, reject) => {
				db.get('SELECT latitude, longitude, location FROM events WHERE id = ?', [eventId], (err, row) => {
					if (err) reject(err);
					else resolve(row);
				});
			});

			const processedPhotos = {};
			const analysisResults = {};
			const tempFiles = [];
			let gpsData = null;

			// Create GPS data if provided
			if (latitude && longitude) {
				gpsData = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
			}

			// Process before photo with GPS and analysis
			if (req.files && req.files.beforePhoto) {
				const beforeFile = req.files.beforePhoto[0];
				tempFiles.push(useCloudStorage ? null : beforeFile.path);
				
				const outputPath = useCloudStorage 
					? beforeFile.key || beforeFile.location 
					: path.join(path.dirname(beforeFile.path), `enhanced-before-${beforeFile.filename}`);
				
				const result = await enhancedImageProcessor.processCleanupPhoto(
					useCloudStorage ? beforeFile.location : beforeFile.path, 
					useCloudStorage ? outputPath : outputPath,
					{ 
						gpsData: gpsData,
						performAnalysis: true,
						preserveGPS: true 
					}
				);
				
				if (result.success) {
					processedPhotos.beforePhotoPath = useCloudStorage ? outputPath : outputPath.replace(/.*uploads\//, '');
					processedPhotos.beforeGPS = result.gpsData;
					analysisResults.beforeAnalysis = result.analysis;
				}
			}

			// Process after photo with GPS and analysis
			if (req.files && req.files.afterPhoto) {
				const afterFile = req.files.afterPhoto[0];
				tempFiles.push(useCloudStorage ? null : afterFile.path);
				
				const outputPath = useCloudStorage 
					? afterFile.key || afterFile.location
					: path.join(path.dirname(afterFile.path), `enhanced-after-${afterFile.filename}`);
				
				const result = await enhancedImageProcessor.processCleanupPhoto(
					useCloudStorage ? afterFile.location : afterFile.path, 
					useCloudStorage ? outputPath : outputPath,
					{ 
						gpsData: gpsData,
						performAnalysis: true,
						preserveGPS: true 
					}
				);
				
				if (result.success) {
					processedPhotos.afterPhotoPath = useCloudStorage ? outputPath : outputPath.replace(/.*uploads\//, '');
					processedPhotos.afterGPS = result.gpsData;
					analysisResults.afterAnalysis = result.analysis;
				}
			}

			// Perform comparative analysis if both photos exist
			let impactAnalysis = null;
			if (processedPhotos.beforePhotoPath && processedPhotos.afterPhotoPath) {
				const beforePath = useCloudStorage ? req.files.beforePhoto[0].location : req.files.beforePhoto[0].path;
				const afterPath = useCloudStorage ? req.files.afterPhoto[0].location : req.files.afterPhoto[0].path;
				
				const comparisonResult = await visualProgressTracker.comparePhotos(
					beforePath, 
					afterPath, 
					event && event.latitude ? { latitude: event.latitude, longitude: event.longitude } : null
				);
				
				if (comparisonResult.success) {
					impactAnalysis = comparisonResult.comparison;
					// Generate visual progress report
					const progressReport = visualProgressTracker.generateProgressReport(impactAnalysis);
					impactAnalysis.progressReport = progressReport;
				}
			}

			// Update database with enhanced data
			const updateQuery = `
				INSERT OR REPLACE INTO cleanup_progress 
				(eventId, username, wasteCollected, wasteType, beforePhotoPath, afterPhotoPath, notes, updatedAt, 
				 beforePhotoGPS, afterPhotoGPS, impactAnalysis)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`;

			const updatedAt = new Date().toISOString();
			
			db.run(updateQuery, [
				eventId, 
				username, 
				wasteCollected || 0, 
				wasteType || '', 
				processedPhotos.beforePhotoPath || null,
				processedPhotos.afterPhotoPath || null,
				notes || '',
				updatedAt,
				JSON.stringify(processedPhotos.beforeGPS || null),
				JSON.stringify(processedPhotos.afterGPS || null),
				JSON.stringify(impactAnalysis || null)
			], function(err) {
				// Cleanup temp files for local storage
				if (!useCloudStorage) {
					cleanupTempFiles(tempFiles.filter(f => f !== null));
				}

				if (err) {
					return res.status(500).json({ success: false, message: 'Failed to save enhanced progress' });
				}

				// Award gamification points for enhanced progress update
				gamificationIntegration.awardProgressUpdate(username, eventId, {
					wasteCollected: wasteCollected || 0,
					hasPhotos: !!(processedPhotos.beforePhotoPath || processedPhotos.afterPhotoPath),
					hasGPS: !!(processedPhotos.beforeGPS || processedPhotos.afterGPS),
					hasAI: !!impactAnalysis,
					notes: notes || ''
				}).catch(gamificationError => {
					console.error('Error awarding enhanced progress points:', gamificationError);
				});

				// Award additional points for photos with GPS and AI analysis
				if (processedPhotos.beforePhotoPath || processedPhotos.afterPhotoPath) {
					gamificationIntegration.awardPhotoUpload(username, eventId, {
						hasGPS: !!(processedPhotos.beforeGPS || processedPhotos.afterGPS),
						aiAnalysis: impactAnalysis,
						photoType: 'progress',
						location: processedPhotos.beforeGPS || processedPhotos.afterGPS
					}).catch(gamificationError => {
						console.error('Error awarding photo upload points:', gamificationError);
					});
				}

				// Prepare enhanced response
				const response = {
					success: true,
					message: 'Enhanced progress uploaded with GPS and AI analysis',
					progressId: this.lastID || this.changes,
					photos: {},
					gpsData: {
						before: processedPhotos.beforeGPS,
						after: processedPhotos.afterGPS
					},
					analysis: analysisResults,
					impactAnalysis: impactAnalysis
				};

				if (processedPhotos.beforePhotoPath) {
					response.photos.beforePhoto = getImageUrl(processedPhotos.beforePhotoPath);
				}
				if (processedPhotos.afterPhotoPath) {
					response.photos.afterPhoto = getImageUrl(processedPhotos.afterPhotoPath);
				}

				res.json(response);
			});

		} catch (error) {
			// Cleanup any uploaded files on error
			if (req.files && !useCloudStorage) {
				const tempFiles = [];
				if (req.files.beforePhoto) tempFiles.push(req.files.beforePhoto[0].path);
				if (req.files.afterPhoto) tempFiles.push(req.files.afterPhoto[0].path);
				cleanupTempFiles(tempFiles);
			}
			res.status(500).json({ 
				success: false, 
				message: error.message,
				stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
			});
		}
	});

	// Enhanced avatar upload with GPS metadata
	apiRouter.post('/enhanced/upload/avatar', enhancedUpload.single('avatar'), async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ success: false, message: 'No file uploaded' });
			}

			const { username, latitude, longitude } = req.body;
			if (!username) {
				if (!useCloudStorage) cleanupTempFiles([req.file.path]);
				return res.status(400).json({ success: false, message: 'Username required' });
			}

			// Create GPS data if provided
			let gpsData = null;
			if (latitude && longitude) {
				gpsData = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
			}

			// Process the avatar image with GPS
			const outputPath = useCloudStorage 
				? req.file.key || req.file.location
				: path.join(path.dirname(req.file.path), `enhanced-avatar-${req.file.filename}`);
			
			const processResult = await enhancedImageProcessor.processAvatar(
				useCloudStorage ? req.file.location : req.file.path, 
				outputPath, 
				gpsData
			);

			if (!processResult.success) {
				if (!useCloudStorage) cleanupTempFiles([req.file.path]);
				return res.status(500).json({ success: false, message: 'Failed to process image' });
			}

			// Update user avatar in database with GPS metadata
			const relativePath = useCloudStorage ? outputPath : outputPath.replace(/.*uploads\//, '');
			const avatarData = {
				path: relativePath,
				gps: gpsData,
				uploadedAt: new Date().toISOString()
			};

			db.run('UPDATE users SET avatar = ? WHERE username = ?', [JSON.stringify(avatarData), username], function(err) {
				// Cleanup temp files for local storage
				if (!useCloudStorage) {
					cleanupTempFiles([req.file.path]);
				}

				if (err) {
					if (!useCloudStorage) cleanupTempFiles([outputPath]);
					return res.status(500).json({ success: false, message: 'Failed to update avatar' });
				}

				const imageUrl = getImageUrl(relativePath);
				res.json({ 
					success: true, 
					message: 'Enhanced avatar uploaded successfully with GPS metadata',
					avatarUrl: imageUrl,
					path: relativePath,
					gpsData: gpsData
				});
			});

		} catch (error) {
			if (req.file && !useCloudStorage) {
				cleanupTempFiles([req.file.path]);
			}
			res.status(500).json({ 
				success: false, 
				message: error.message,
				stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
			});
		}
	});

	// Get enhanced progress analysis for an event
	apiRouter.get('/enhanced/progress/:eventId/analysis', (req, res) => {
		const { eventId } = req.params;
		
		const query = `
			SELECT username, beforePhotoPath, afterPhotoPath, beforePhotoGPS, afterPhotoGPS, 
				   impactAnalysis, wasteCollected, wasteType, notes, updatedAt
			FROM cleanup_progress 
			WHERE eventId = ? AND impactAnalysis IS NOT NULL
		`;
		
		db.all(query, [eventId], (err, progressRecords) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			
			const enhancedProgress = progressRecords.map(record => ({
				username: record.username,
				wasteCollected: record.wasteCollected,
				wasteType: record.wasteType,
				notes: record.notes,
				updatedAt: record.updatedAt,
				photos: {
					before: record.beforePhotoPath ? getImageUrl(record.beforePhotoPath) : null,
					after: record.afterPhotoPath ? getImageUrl(record.afterPhotoPath) : null
				},
				gpsData: {
					before: record.beforePhotoGPS ? JSON.parse(record.beforePhotoGPS) : null,
					after: record.afterPhotoGPS ? JSON.parse(record.afterPhotoGPS) : null
				},
				impactAnalysis: record.impactAnalysis ? JSON.parse(record.impactAnalysis) : null
			}));
			
			// Calculate aggregate statistics
			const aggregateStats = {
				totalParticipants: enhancedProgress.length,
				averageImpactScore: 0,
				totalValidatedPhotos: 0,
				locationAccuracy: 0
			};

			if (enhancedProgress.length > 0) {
				const validAnalysis = enhancedProgress.filter(p => p.impactAnalysis && p.impactAnalysis.impactAnalysis);
				
				if (validAnalysis.length > 0) {
					aggregateStats.averageImpactScore = validAnalysis.reduce((sum, p) => 
						sum + p.impactAnalysis.impactAnalysis.score, 0) / validAnalysis.length;
				}

				aggregateStats.totalValidatedPhotos = enhancedProgress.filter(p => 
					p.impactAnalysis && p.impactAnalysis.locationValidation && p.impactAnalysis.locationValidation.valid).length;
				
				aggregateStats.locationAccuracy = aggregateStats.totalValidatedPhotos / enhancedProgress.length;
			}
			
			res.json({
				success: true,
				eventId: eventId,
				enhancedProgress: enhancedProgress,
				aggregateStats: aggregateStats
			});
		});
	});

	// AI Impact analysis endpoint for existing photos
	apiRouter.post('/enhanced/analyze-impact', async (req, res) => {
		try {
			const { beforePhotoUrl, afterPhotoUrl, eventId } = req.body;

			if (!beforePhotoUrl || !afterPhotoUrl) {
				return res.status(400).json({ success: false, message: 'Before and after photo URLs required' });
			}

			// Get event location if eventId provided
			let eventLocation = null;
			if (eventId) {
				const event = await new Promise((resolve, reject) => {
					db.get('SELECT latitude, longitude FROM events WHERE id = ?', [eventId], (err, row) => {
						if (err) reject(err);
						else resolve(row);
					});
				});
				eventLocation = event;
			}

			// Convert URLs to file paths (assuming local storage for now)
			const beforePath = beforePhotoUrl.replace('/api/v1/images/', '');
			const afterPath = afterPhotoUrl.replace('/api/v1/images/', '');
			const fullBeforePath = path.join(__dirname, '../../uploads', beforePath);
			const fullAfterPath = path.join(__dirname, '../../uploads', afterPath);

			// Perform analysis
			const analysisResult = await visualProgressTracker.comparePhotos(
				fullBeforePath, 
				fullAfterPath, 
				eventLocation
			);

			if (analysisResult.success) {
				const progressReport = visualProgressTracker.generateProgressReport(analysisResult.comparison);
				analysisResult.comparison.progressReport = progressReport;
			}

			res.json({
				success: analysisResult.success,
				analysis: analysisResult.comparison || null,
				error: analysisResult.error || null
			});

		} catch (error) {
			res.status(500).json({ 
				success: false, 
				message: error.message,
				stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
			});
		}
	});

	app.use('/api/v1', apiRouter);

	// Initialize and mount gamification API routes
	const gamificationRouter = initializeGamificationAPI(db);
	app.use('/api/v1/gamification', gamificationRouter);

	// Initialize and mount social features API routes
	const socialRouter = require('./routes/social');
	app.use('/api/v1/social', socialRouter);

	return app;
}

module.exports = { createApp };
