const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const buildPath = path.join(__dirname, "build");

// Serve static assets from the React build directory
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));

  // SPA fallback: send index.html for all non-asset requests
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
} else {
  app.get("*", (req, res) => {
    res.status(503).send("Frontend build not found. Please run 'npm run build' first.");
  });
}

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vaidyasthana Frontend server listening on port ${PORT}`);
  });
}

module.exports = app;
