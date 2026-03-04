import express from "express";
import cors from "cors";
import compilerRoutes from "./routes/compilerRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

// CORS Configuration
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Mini Compiler Visualizer Backend API", status: "running" });
});

app.use("/api/compiler", compilerRoutes);
app.use("/api/auth", authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

export default app;