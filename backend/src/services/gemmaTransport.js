const nodeFetch = require('node-fetch');

// Existing dependency; honors AbortSignal for headers AND body without native
// fetch's separate headers deadline cutting off a configured long CPU request.
module.exports = { fetch: (...args) => nodeFetch(...args) };
