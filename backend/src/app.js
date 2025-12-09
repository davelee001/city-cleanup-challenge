const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "City Cleanup Backend is running" });
});

app.get("/api/celo/accounts", (req, res) => {
  res.json({ accounts: [], message: "Celo accounts endpoint" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

module.exports = app;
