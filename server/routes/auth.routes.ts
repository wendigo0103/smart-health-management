import { Router, type RequestHandler } from "express";
import type { AuthResponse, RegisterBody, LoginBody, UserRole } from "@shared/api";
import { requireAuth } from "../middleware/auth";
import {
  createUser,
  findUserByEmailWithSecret,
  signToken,
  userToPublic,
  verifyPassword,
} from "../services/auth.service";
import { User } from "../models/User";

const router = Router();

const register: RequestHandler = async (req, res) => {
  const body = req.body as RegisterBody;
  const { email, password, name, phone, role: requestedRole } = body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required" });
    return;
  }
  let role: UserRole = "patient";
  if (requestedRole && requestedRole !== "patient") {
    if (process.env.ALLOW_STAFF_REGISTER === "true") {
      role = requestedRole;
    }
  }
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const user = await createUser({
    email,
    password,
    name,
    phone,
    role,
  });
  const token = signToken(user._id.toString(), user.role);
  const out: AuthResponse = { token, user: userToPublic(user) };
  res.status(201).json(out);
};

const login: RequestHandler = async (req, res) => {
  const body = req.body as LoginBody;
  if (!body.email || !body.password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  const user = await findUserByEmailWithSecret(body.email);
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken(user._id.toString(), user.role);
  const out: AuthResponse = { token, user: userToPublic(user) };
  res.json(out);
};

const me: RequestHandler = async (req, res) => {
  const u = await User.findById(req.authUser!.id);
  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(userToPublic(u));
};

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);

export default router;
