import express from "express";
import { login, callback, me, logout } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/login", login);
router.get("/callback", callback);
router.get("/me", authMiddleware, me);
router.get("/logout", logout);

export default router;
