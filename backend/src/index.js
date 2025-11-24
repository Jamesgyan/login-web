import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth.js";          // Correct
import adminUserRoutes from "./routes/adminUsers.js"; // Correct
import attendanceRoutes from "./routes/attendance.js"; // Correct

dotenv.config();
const app = express();
export const prisma = new PrismaClient();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/attendance", attendanceRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 4000}`);
});
