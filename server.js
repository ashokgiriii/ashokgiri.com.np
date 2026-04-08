const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

const { PORT = 10000 } = process.env;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "media-src": ["'self'"],
    },
  },
}));
app.use(morgan("dev"));
app.use(express.static(__dirname));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
