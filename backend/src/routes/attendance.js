import express from "express";
import { prisma } from "../index.js";
import { authRequired, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// Employee clock in
router.post("/clock-in", authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { location } = req.body;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay
        }
      }
    });

    if (attendance && attendance.loginTime) {
      return res.status(400).json({ error: "Already clocked in today" });
    }

    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          userId,
          date: startOfDay,
          loginTime: new Date(),
          loginLocation: location || "Location unavailable"
        }
      });
    } else {
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          loginTime: new Date(),
          loginLocation: location || "Location unavailable"
        }
      });
    }

    res.json({ message: "Clocked in", attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Employee clock out
router.post("/clock-out", authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { location } = req.body;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay
        }
      }
    });

    if (!attendance || !attendance.loginTime) {
      return res.status(400).json({ error: "No clock-in record for today" });
    }

    if (attendance.logoutTime) {
      return res.status(400).json({ error: "Already clocked out today" });
    }

    const logoutTime = new Date();
    const diffMs = logoutTime - attendance.loginTime;
    const workMinutes = Math.round(diffMs / 60000);

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        logoutTime,
        logoutLocation: location || "Location unavailable",
        totalWorkDuration: workMinutes
      }
    });

    res.json({ message: "Clocked out", attendance: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin dashboard basic stats
router.get("/admin/summary", authRequired, adminOnly, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const totalEmployees = await prisma.user.count({
      where: { role: "EMPLOYEE", isActive: true }
    });

    const todaysAttendance = await prisma.attendance.findMany({
      where: {
        date: { gte: startOfDay }
      },
      include: { user: true }
    });

    const presentToday = todaysAttendance.length;

    const onLeave = await prisma.leave.count({
      where: {
        status: "APPROVED",
        fromDate: { lte: startOfDay },
        toDate: { gte: startOfDay }
      }
    });

    const recentLogins = await prisma.attendance.findMany({
      orderBy: { loginTime: "desc" },
      take: 5,
      include: { user: true }
    });

    res.json({
      totalEmployees,
      presentToday,
      onLeave,
      recentLogins
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
