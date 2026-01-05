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
