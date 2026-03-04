import express from "express";
import { runCompiler, getHistory } from "../controllers/compilerController.js";

const router = express.Router();

// Existing route
router.post("/run", runCompiler);

// 👉 Add this
router.get("/history", getHistory);

export default router;