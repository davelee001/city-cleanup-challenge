	// Edit a post (only by owner)
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
				db.get('SELECT * FROM posts WHERE id = ?', [id], (err3, updatedPost) => {
					if (err3) {
						return res.status(500).json({ success: false, message: 'Database error' });
					}
					res.json({ success: true, post: updatedPost });
				});
			});
		});
	});

	// Delete a post (only by owner)
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

	// Get user profile by username
	app.get('/profile/:username', (req, res) => {
		const { username } = req.params;
		db.get('SELECT username FROM users WHERE username = ?', [username], (err, user) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!user) {
				return res.status(404).json({ success: false, message: 'User not found' });
			}
			res.json({ success: true, user });
		});
	});

	// Update user profile (username or password)
	app.put('/profile/:username', (req, res) => {
		const { username } = req.params;
		const { newUsername, newPassword } = req.body;
		if (!newUsername && !newPassword) {
			return res.status(400).json({ success: false, message: 'No update fields provided' });
		}
		db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!user) {
				return res.status(404).json({ success: false, message: 'User not found' });
			}
			let query = 'UPDATE users SET ';
			const params = [];
			if (newUsername) {
				query += 'username = ?';
				params.push(newUsername);
			}
			if (newPassword) {
				if (params.length) query += ', ';
				query += 'password = ?';
				params.push(newPassword);
			}
			query += ' WHERE username = ?';
			params.push(username);
			db.run(query, params, function (err2) {
				if (err2) {
					if (err2.code === 'SQLITE_CONSTRAINT') {
						return res.status(409).json({ success: false, message: 'Username already exists' });
					}
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				res.json({ success: true });
			});
		});
	});
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

function createApp() {
	const app = express();
	app.use(cors());
	app.use(express.json());
	app.use(morgan('dev'));


// SQLite database
const db = require('./db');


	// Create a new post
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
					return res.json({ success: true, post });
				});
			}
		);
	});

	// Get all posts
	app.get('/posts', (req, res) => {
		db.all('SELECT * FROM posts ORDER BY createdAt DESC', [], (err, rows) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true, posts: rows });
		});
	});



	app.post('/signup', (req, res) => {
		const { username, password } = req.body;
		if (!username || !password) {
			return res.status(400).json({ success: false, message: 'Username and password required' });
		}
		db.run(
			'INSERT INTO users (username, password) VALUES (?, ?)',
			[username, password],
			function (err) {
				if (err) {
					if (err.code === 'SQLITE_CONSTRAINT') {
						return res.status(409).json({ success: false, message: 'Username already exists' });
					}
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				return res.json({ success: true, username });
			}
		);
	});

	app.post('/login', (req, res) => {
		const { username, password } = req.body;
		db.get(
			'SELECT * FROM users WHERE username = ? AND password = ?',
			[username, password],
			(err, user) => {
				if (err) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				if (user) {
					return res.json({ success: true, username });
				}
				return res.status(401).json({ success: false, message: 'Invalid credentials' });
			}
		);
	});


	// Chatbot guidance endpoint
	app.post('/chatbot', (req, res) => {
		const { message } = req.body;
		let reply = '';
		if (!message) {
			reply = 'Hi! I can help you with posts, profiles, and using the app. Try asking: "How do I make a post?"';
		} else if (/how.*post|make.*post|create.*post/i.test(message)) {
			reply = 'To make a post, go to the main screen and tap the "+" button. Fill in the details and submit!';
		} else if (/edit.*post|change.*post|update.*post/i.test(message)) {
			reply = 'To edit your post, go to the posts screen, find your post, and tap the edit button. Only your own posts can be edited.';
		} else if (/delete.*post|remove.*post/i.test(message)) {
			reply = 'To delete your post, go to the posts screen, find your post, and tap the delete button. Only your own posts can be deleted.';
		} else if (/profile|change.*username|update.*profile|edit.*profile|change.*password/i.test(message)) {
			reply = 'To update your profile, tap the Profile button after logging in. You can change your username or password there.';
		} else if (/hello|hi|hey/i.test(message)) {
			reply = 'Hello! Ask me how to make, edit, or delete posts, or how to update your profile.';
		} else {
			reply = 'I can help you with making, editing, or deleting posts, and updating your profile. Try asking: "How do I edit my post?"';
		}
		res.json({ reply });
	});

	// ===== EVENT MANAGEMENT ENDPOINTS =====

	// Create a new cleanup event
	app.post('/events', (req, res) => {
		const { title, description, location, latitude, longitude, date, time, creator } = req.body;
		if (!title || !description || !location || !latitude || !longitude || !date || !time || !creator) {
			return res.status(400).json({ success: false, message: 'All event fields required' });
		}
		const createdAt = new Date().toISOString();
		db.run(
			'INSERT INTO events (title, description, location, latitude, longitude, date, time, creator, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[title, description, location, latitude, longitude, date, time, creator, createdAt],
			function (err) {
				if (err) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				db.get('SELECT * FROM events WHERE id = ?', [this.lastID], (err2, event) => {
					if (err2) {
						return res.status(500).json({ success: false, message: 'Database error' });
					}
					return res.json({ success: true, event });
				});
			}
		);
	});

	// Get all active events
	app.get('/events', (req, res) => {
		db.all('SELECT * FROM events WHERE status = "active" ORDER BY date ASC', [], (err, rows) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true, events: rows });
		});
	});

	// Get a specific event by ID
	app.get('/events/:id', (req, res) => {
		const { id } = req.params;
		db.get('SELECT * FROM events WHERE id = ?', [id], (err, event) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!event) {
				return res.status(404).json({ success: false, message: 'Event not found' });
			}
			res.json({ success: true, event });
		});
	});

	// Update an event (only by creator)
	app.put('/events/:id', (req, res) => {
		const { id } = req.params;
		const { title, description, location, latitude, longitude, date, time, username } = req.body;
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
			if (event.creator !== username) {
				return res.status(403).json({ success: false, message: 'Not authorized' });
			}
			db.run(
				'UPDATE events SET title = ?, description = ?, location = ?, latitude = ?, longitude = ?, date = ?, time = ? WHERE id = ?',
				[title, description, location, latitude, longitude, date, time, id],
				function (err2) {
					if (err2) {
						return res.status(500).json({ success: false, message: 'Database error' });
					}
					db.get('SELECT * FROM events WHERE id = ?', [id], (err3, updatedEvent) => {
						if (err3) {
							return res.status(500).json({ success: false, message: 'Database error' });
						}
						res.json({ success: true, event: updatedEvent });
					});
				}
			);
		});
	});

	// Delete an event (only by creator)
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
			if (event.creator !== username) {
				return res.status(403).json({ success: false, message: 'Not authorized' });
			}
			db.run('UPDATE events SET status = "cancelled" WHERE id = ?', [id], function (err2) {
				if (err2) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				res.json({ success: true });
			});
		});
	});

	// ===== CHECK-IN ENDPOINTS =====

	// Check into an event
	app.post('/events/:id/checkin', (req, res) => {
		const { id } = req.params;
		const { username, latitude, longitude } = req.body;
		if (!username) {
			return res.status(400).json({ success: false, message: 'Username required' });
		}
		
		// Check if event exists and is active
		db.get('SELECT * FROM events WHERE id = ? AND status = "active"', [id], (err, event) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!event) {
				return res.status(404).json({ success: false, message: 'Event not found or inactive' });
			}
			
			// Check if user already checked in
			db.get('SELECT * FROM event_checkins WHERE eventId = ? AND username = ?', [id, username], (err2, existing) => {
				if (err2) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				if (existing) {
					return res.status(409).json({ success: false, message: 'Already checked in to this event' });
				}
				
				const checkinTime = new Date().toISOString();
				db.run(
					'INSERT INTO event_checkins (eventId, username, checkinTime, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
					[id, username, checkinTime, latitude, longitude],
					function (err3) {
						if (err3) {
							return res.status(500).json({ success: false, message: 'Database error' });
						}
						res.json({ success: true, checkinId: this.lastID, event });
					}
				);
			});
		});
	});

	// Get check-ins for an event
	app.get('/events/:id/checkins', (req, res) => {
		const { id } = req.params;
		db.all('SELECT * FROM event_checkins WHERE eventId = ? ORDER BY checkinTime DESC', [id], (err, checkins) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			res.json({ success: true, checkins });
		});
	});

	// Get user's check-ins
	app.get('/users/:username/checkins', (req, res) => {
		const { username } = req.params;
		db.all(
			`SELECT ec.*, e.title, e.description, e.location, e.date 
			 FROM event_checkins ec 
			 JOIN events e ON ec.eventId = e.id 
			 WHERE ec.username = ? 
			 ORDER BY ec.checkinTime DESC`,
			[username],
			(err, checkins) => {
				if (err) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				res.json({ success: true, checkins });
			}
		);
	});

	// ===== PROGRESS TRACKING ENDPOINTS =====

	// Update cleanup progress for an event
	app.post('/events/:id/progress', (req, res) => {
		const { id } = req.params;
		const { username, wasteCollected, wasteType, beforePhotoPath, afterPhotoPath, notes } = req.body;
		if (!username) {
			return res.status(400).json({ success: false, message: 'Username required' });
		}
		
		// Check if user is checked into this event
		db.get('SELECT * FROM event_checkins WHERE eventId = ? AND username = ?', [id, username], (err, checkin) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Database error' });
			}
			if (!checkin) {
				return res.status(403).json({ success: false, message: 'Must check in to event before tracking progress' });
			}
			
			const updatedAt = new Date().toISOString();
			
			// Check if progress already exists for this user and event
			db.get('SELECT * FROM cleanup_progress WHERE eventId = ? AND username = ?', [id, username], (err2, existing) => {
				if (err2) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				
				if (existing) {
					// Update existing progress
					db.run(
						'UPDATE cleanup_progress SET wasteCollected = ?, wasteType = ?, beforePhotoPath = ?, afterPhotoPath = ?, notes = ?, updatedAt = ? WHERE eventId = ? AND username = ?',
						[wasteCollected, wasteType, beforePhotoPath, afterPhotoPath, notes, updatedAt, id, username],
						function (err3) {
							if (err3) {
								return res.status(500).json({ success: false, message: 'Database error' });
							}
							db.get('SELECT * FROM cleanup_progress WHERE eventId = ? AND username = ?', [id, username], (err4, progress) => {
								if (err4) {
									return res.status(500).json({ success: false, message: 'Database error' });
								}
								res.json({ success: true, progress });
							});
						}
					);
				} else {
					// Create new progress entry
					db.run(
						'INSERT INTO cleanup_progress (eventId, username, wasteCollected, wasteType, beforePhotoPath, afterPhotoPath, notes, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
						[id, username, wasteCollected, wasteType, beforePhotoPath, afterPhotoPath, notes, updatedAt],
						function (err3) {
							if (err3) {
								return res.status(500).json({ success: false, message: 'Database error' });
							}
							db.get('SELECT * FROM cleanup_progress WHERE id = ?', [this.lastID], (err4, progress) => {
								if (err4) {
									return res.status(500).json({ success: false, message: 'Database error' });
								}
								res.json({ success: true, progress });
							});
						}
					);
				}
			});
		});
	});

	// Get progress for an event
	app.get('/events/:id/progress', (req, res) => {
		const { id } = req.params;
		db.all(
			`SELECT cp.*, e.title, e.location 
			 FROM cleanup_progress cp 
			 JOIN events e ON cp.eventId = e.id 
			 WHERE cp.eventId = ? 
			 ORDER BY cp.updatedAt DESC`,
			[id],
			(err, progress) => {
				if (err) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				
				// Calculate total waste collected
				const totalWaste = progress.reduce((sum, p) => sum + (p.wasteCollected || 0), 0);
				
				res.json({ success: true, progress, totalWasteCollected: totalWaste });
			}
		);
	});

	// Get user's progress across all events
	app.get('/users/:username/progress', (req, res) => {
		const { username } = req.params;
		db.all(
			`SELECT cp.*, e.title, e.location, e.date 
			 FROM cleanup_progress cp 
			 JOIN events e ON cp.eventId = e.id 
			 WHERE cp.username = ? 
			 ORDER BY cp.updatedAt DESC`,
			[username],
			(err, progress) => {
				if (err) {
					return res.status(500).json({ success: false, message: 'Database error' });
				}
				
				// Calculate total waste collected by user
				const totalWaste = progress.reduce((sum, p) => sum + (p.wasteCollected || 0), 0);
				
				res.json({ success: true, progress, totalWasteCollected: totalWaste });
			}
		);
	});

	// Health check route
	app.get('/health', (req, res) => {
		res.send('OK');
	});

	return app;
}

module.exports = { createApp };
