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
