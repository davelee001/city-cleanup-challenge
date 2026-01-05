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
		if (!message || /how.*post|make.*post|create.*post/i.test(message)) {
			reply = 'To make a post, go to the main screen and tap the "+" button. Fill in the details and submit!';
		} else if (/hello|hi|hey/i.test(message)) {
			reply = 'Hello! Ask me how to make a post or any other question about using the app.';
		} else {
			reply = 'I can help you with making posts. Try asking: "How do I make a post?"';
		}
		res.json({ reply });
	});

	// Health check route
	app.get('/health', (req, res) => {
		res.send('OK');
	});

	return app;
}

module.exports = { createApp };
