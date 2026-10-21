import express from "express";
import { prisma } from "../index.js";
import { authRequired, adminOnly } from "../middleware/auth.js";
import bcrypt from "bcrypt";

const router = express.Router();
const SALT_ROUNDS = 10;

// Get all users
router.get("/", authRequired, adminOnly, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create user
router.post("/", authRequired, adminOnly, async (req, res) => {
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

    res.json({ message: "User created", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Change role
router.patch("/:id/role", authRequired, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["ADMIN", "EMPLOYEE"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const updated = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { role }
    });
    res.json({ message: "Role updated", user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Activate / deactivate user
router.patch("/:id/active", authRequired, adminOnly, async (req, res) => {
  try {
    const { isActive } = req.body;
    const updated = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { isActive: Boolean(isActive) }
    });
    res.json({ message: "User updated", user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Hard delete (optional)
router.delete("/:id", authRequired, adminOnly, async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
