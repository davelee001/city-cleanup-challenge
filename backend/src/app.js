const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const emitter = require('./events');
const { upload, imageProcessor, cleanupTempFiles, getImageUrl } = require('./services/imageUpload');

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

	app.use('/api/v1', apiRouter);

	return app;
}

module.exports = { createApp };
