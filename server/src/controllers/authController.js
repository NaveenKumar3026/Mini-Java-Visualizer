import bcrypt from "bcryptjs";
import db from "../config/db.js";

// Helper to run a simple SELECT query
const findUserByUsername = (username, cb) => {
  db.query(
    "SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1",
    [username],
    (err, results) => {
      if (err) return cb(err);
      cb(null, results[0] || null);
    }
  );
};

export const register = (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  findUserByUsername(username, (findErr, existing) => {
    if (findErr) {
      console.error(findErr);
      return res.status(500).json({ error: "Database error." });
    }

    if (existing) {
      return res.status(409).json({ error: "Username already exists." });
    }

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (hashErr, hash) => {
      if (hashErr) {
        console.error(hashErr);
        return res.status(500).json({ error: "Failed to hash password." });
      }

      db.query(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        [username, hash],
        (insertErr, result) => {
          if (insertErr) {
            console.error(insertErr);
            return res.status(500).json({ error: "Failed to create user." });
          }

          const user = { id: result.insertId, username };
          res.status(201).json({ user });
        }
      );
    });
  });
};

export const login = (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  findUserByUsername(username, (findErr, user) => {
    if (findErr) {
      console.error(findErr);
      return res.status(500).json({ error: "Database error." });
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    bcrypt.compare(password, user.password_hash, (compareErr, same) => {
      if (compareErr) {
        console.error(compareErr);
        return res.status(500).json({ error: "Failed to verify password." });
      }

      if (!same) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      res.json({ user: { id: user.id, username: user.username } });
    });
  });
};

