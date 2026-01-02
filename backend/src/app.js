const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

function createApp() {
	const app = express();
	app.use(cors());
	app.use(express.json());
	app.use(morgan('dev'));

	// In-memory users array for demonstration
	const users = [
		{ username: 'admin', password: 'password' }
	];


	app.post('/signup', (req, res) => {
		const { username, password } = req.body;
		if (!username || !password) {
			return res.status(400).json({ success: false, message: 'Username and password required' });
		}
		if (users.find(u => u.username === username)) {
			return res.status(409).json({ success: false, message: 'Username already exists' });
		}
		users.push({ username, password });
		return res.json({ success: true, username });
	});

	app.post('/login', (req, res) => {
		const { username, password } = req.body;
		const user = users.find(u => u.username === username && u.password === password);
		if (user) {
			return res.json({ success: true, username });
		}
		return res.status(401).json({ success: false, message: 'Invalid credentials' });
	});

	// Health check route
	app.get('/health', (req, res) => {
		res.send('OK');
	});

	return app;
}

module.exports = { createApp };
