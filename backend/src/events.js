const EventEmitter = require('events');

class AppEmitter extends EventEmitter {}

const emitter = new AppEmitter();

// Optional: Add a listener for error events to prevent unhandled exceptions
emitter.on('error', (err) => {
  console.error('An error occurred in the event emitter:', err);
});

module.exports = emitter;
