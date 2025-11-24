import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { prisma } from "../index.js";

dotenv.config();
const router = express.Router();
const SALT_ROUNDS = 10;

// Register (for initial use; later you can restrict this)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, employeeId, role } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { employeeId }] }
    });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        employeeId,
        password: hash,
        role: role === "ADMIN" ? "ADMIN" : "EMPLOYEE"
      }
    });

    res.json({ message: "User created", user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { emailOrEmployeeId, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrEmployeeId },
          { employeeId: emailOrEmployeeId }
        ]
      }
    });

    if (!user || !user.isActive) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: false, // set true in production (https)
        sameSite: "lax"
      })
      .json({
        message: "Logged in",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token").json({ message: "Logged out" });
});

export default router;
