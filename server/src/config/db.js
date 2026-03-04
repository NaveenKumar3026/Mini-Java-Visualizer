// src/config/db.js
import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Nave@123",
  database: "compiler_db",
});

db.connect((err) => {
  if (err) console.log(err);
  else console.log("✅ DB Connected");
});

export default db;