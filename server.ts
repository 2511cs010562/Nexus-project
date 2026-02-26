import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("mentor_bridge.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('student', 'mentor')) NOT NULL,
    profilePic TEXT,
    rating REAL DEFAULT 0,
    skills TEXT, -- JSON array
    branch TEXT,
    bio TEXT,
    isVerified INTEGER DEFAULT 0,
    linkedinUrl TEXT,
    githubUrl TEXT,
    cvUrl TEXT,
    systemRating REAL DEFAULT 0
  );
`);

// Migration: Add missing columns if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const columns = tableInfo.map(c => c.name);

if (!columns.includes('linkedinUrl')) {
  db.exec("ALTER TABLE users ADD COLUMN linkedinUrl TEXT");
}
if (!columns.includes('githubUrl')) {
  db.exec("ALTER TABLE users ADD COLUMN githubUrl TEXT");
}
if (!columns.includes('cvUrl')) {
  db.exec("ALTER TABLE users ADD COLUMN cvUrl TEXT");
}
if (!columns.includes('systemRating')) {
  db.exec("ALTER TABLE users ADD COLUMN systemRating REAL DEFAULT 0");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS otps (
    email TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    expiresAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    mentorId INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    createdAt INTEGER NOT NULL,
    FOREIGN KEY(studentId) REFERENCES users(id),
    FOREIGN KEY(mentorId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId TEXT NOT NULL,
    senderId INTEGER NOT NULL,
    text TEXT,
    voiceUrl TEXT,
    type TEXT CHECK(type IN ('text', 'video', 'roadmap', 'voice', 'video_call')) DEFAULT 'text',
    timestamp INTEGER NOT NULL,
    FOREIGN KEY(senderId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS swipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    mentorId INTEGER NOT NULL,
    direction TEXT CHECK(direction IN ('left', 'right')) NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY(studentId) REFERENCES users(id),
    FOREIGN KEY(mentorId) REFERENCES users(id),
    UNIQUE(studentId, mentorId)
  );
`);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper for sending OTP
async function sendOTPEmail(email: string, otp: string) {
  // For demo purposes, we'll use Ethereal Email if no real SMTP is provided
  let transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Ethereal Email User:", testAccount.user);
    console.log("Ethereal Email Pass:", testAccount.pass);
  }

  await transporter.sendMail({
    from: '"Virtual Mentor Bridge" <no-reply@mentorbridge.com>',
    to: email,
    subject: "Your OTP Verification Code",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    html: `<b>Your OTP is ${otp}. It expires in 10 minutes.</b>`,
  });
}

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, role, branch, skills } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (name, email, password, role, branch, skills) VALUES (?, ?, ?, ?, ?, ?)");
    const result = stmt.run(name, email, hashedPassword, role, branch, JSON.stringify(skills || []));
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    db.prepare("INSERT OR REPLACE INTO otps (email, otp, expiresAt) VALUES (?, ?, ?)").run(email, otp, expiresAt);
    
    console.log(`[AUTH] OTP for ${email}: ${otp}`);
    
    try {
      await sendOTPEmail(email, otp);
    } catch (mailError) {
      console.error("Failed to send email:", mailError);
      // We still proceed because the OTP is logged to the console for the developer/user
    }
    
    res.json({ 
      message: "Signup successful. Please verify OTP.", 
      userId: result.lastInsertRowid,
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined // Include OTP in response for easier testing in dev
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const row = db.prepare("SELECT * FROM otps WHERE email = ?").get(email) as any;
  
  if (!row || row.otp !== otp || row.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }
  
  db.prepare("UPDATE users SET isVerified = 1 WHERE email = ?").run(email);
  db.prepare("DELETE FROM otps WHERE email = ?").run(email);
  
  res.json({ message: "Email verified successfully" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  if (!user.isVerified) {
    return res.status(403).json({ error: "Please verify your email first" });
  }
  
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      name: user.name, 
      role: user.role, 
      branch: user.branch, 
      skills: JSON.parse(user.skills || "[]"),
      linkedinUrl: user.linkedinUrl,
      githubUrl: user.githubUrl,
      cvUrl: user.cvUrl,
      systemRating: user.systemRating
    } 
  });
});

// User Routes
app.get("/api/mentors", (req, res) => {
  const { studentId } = req.query;
  let mentors;
  if (studentId) {
    mentors = db.prepare(`
      SELECT id, name, email, profilePic, rating, skills, branch, bio, systemRating, linkedinUrl, githubUrl 
      FROM users 
      WHERE role = 'mentor' 
      AND isVerified = 1 
      AND id NOT IN (SELECT mentorId FROM swipes WHERE studentId = ?)
      ORDER BY (rating + systemRating) DESC
    `).all(studentId);
  } else {
    mentors = db.prepare("SELECT id, name, email, profilePic, rating, skills, branch, bio, systemRating, linkedinUrl, githubUrl FROM users WHERE role = 'mentor' AND isVerified = 1 ORDER BY (rating + systemRating) DESC").all();
  }
  res.json(mentors.map((m: any) => ({ ...m, skills: JSON.parse(m.skills || "[]") })));
});

app.post("/api/mentors/verify", (req, res) => {
  const { userId, linkedinUrl, githubUrl, cvUrl, rating } = req.body;
  
  // Use rating from frontend (Gemini) if available, otherwise heuristic
  let systemRating = rating || 1.0; 
  
  if (!rating) {
    if (linkedinUrl && linkedinUrl.includes('linkedin.com')) systemRating += 1.5;
    if (githubUrl && githubUrl.includes('github.com')) systemRating += 1.5;
    if (cvUrl) systemRating += 1.0;
  }
  
  // Cap at 5.0
  systemRating = Math.min(5.0, systemRating);

  try {
    db.prepare(`
      UPDATE users 
      SET linkedinUrl = ?, githubUrl = ?, cvUrl = ?, systemRating = ? 
      WHERE id = ?
    `).run(linkedinUrl, githubUrl, cvUrl, systemRating, userId);
    
    res.json({ message: "Verification submitted", systemRating });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/users/update-skills", (req, res) => {
  const { userId, skills } = req.body;
  db.prepare("UPDATE users SET skills = ? WHERE id = ?").run(JSON.stringify(skills), userId);
  res.json({ message: "Skills updated" });
});

// Swipe & Connection Routes
app.post("/api/swipes", (req, res) => {
  const { studentId, mentorId, direction } = req.body;
  try {
    db.prepare("INSERT OR IGNORE INTO swipes (studentId, mentorId, direction, timestamp) VALUES (?, ?, ?, ?)")
      .run(studentId, mentorId, direction, Date.now());
    
    if (direction === 'right') {
      db.prepare("INSERT OR IGNORE INTO connections (studentId, mentorId, createdAt) VALUES (?, ?, ?)")
        .run(studentId, mentorId, Date.now());
      io.to(`user_${mentorId}`).emit("new_request", { studentId });
    }
    res.json({ message: "Swipe recorded" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/connections/request", (req, res) => {
  const { studentId, mentorId } = req.body;
  const stmt = db.prepare("INSERT INTO connections (studentId, mentorId, createdAt) VALUES (?, ?, ?)");
  stmt.run(studentId, mentorId, Date.now());
  
  // Notify mentor via socket
  io.to(`user_${mentorId}`).emit("new_request", { studentId });
  
  res.json({ message: "Request sent" });
});

app.get("/api/connections/pending/:mentorId", (req, res) => {
  const { mentorId } = req.params;
  const requests = db.prepare(`
    SELECT c.id, c.studentId, u.name as studentName, u.branch as studentBranch 
    FROM connections c 
    JOIN users u ON c.studentId = u.id 
    WHERE c.mentorId = ? AND c.status = 'pending'
  `).all(mentorId);
  res.json(requests);
});

app.post("/api/connections/respond", (req, res) => {
  const { connectionId, status } = req.body;
  db.prepare("UPDATE connections SET status = ? WHERE id = ?").run(status, connectionId);
  
  const conn = db.prepare("SELECT studentId, mentorId FROM connections WHERE id = ?").get(connectionId) as any;
  if (status === 'accepted') {
    const roomId = `${conn.studentId}_${conn.mentorId}`;
    io.to(`user_${conn.studentId}`).emit("request_accepted", { mentorId: conn.mentorId, roomId });
  }
  
  res.json({ message: `Request ${status}` });
});

app.get("/api/connections/active/:userId", (req, res) => {
  const { userId } = req.params;
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
  
  let query = "";
  if (user.role === 'student') {
    query = `
      SELECT c.id, c.mentorId as otherId, u.name as otherName, u.role as otherRole, '${userId}_' || c.mentorId as roomId
      FROM connections c
      JOIN users u ON c.mentorId = u.id
      WHERE c.studentId = ? AND c.status = 'accepted'
    `;
  } else {
    query = `
      SELECT c.id, c.studentId as otherId, u.name as otherName, u.role as otherRole, c.studentId || '_' || '${userId}' as roomId
      FROM connections c
      JOIN users u ON c.studentId = u.id
      WHERE c.mentorId = ? AND c.status = 'accepted'
    `;
  }
  
  const active = db.prepare(query).all(userId);
  res.json(active);
});

// Message Routes
app.get("/api/messages/:roomId", (req, res) => {
  const { roomId } = req.params;
  const messages = db.prepare("SELECT * FROM messages WHERE roomId = ? ORDER BY timestamp ASC").all(roomId);
  res.json(messages);
});

app.post("/api/messages", (req, res) => {
  const { roomId, senderId, text, voiceUrl, type } = req.body;
  const stmt = db.prepare("INSERT INTO messages (roomId, senderId, text, voiceUrl, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)");
  stmt.run(roomId, senderId, text, voiceUrl, type, Date.now());
  
  const message = { roomId, senderId, text, voiceUrl, type, timestamp: Date.now() };
  io.to(roomId).emit("message", message);
  
  res.json(message);
});

// Socket.io logic
io.on("connection", (socket) => {
  socket.on("join_user", (userId) => {
    socket.join(`user_${userId}`);
  });
  
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
  });
  
  socket.on("send_message", (data) => {
    // Handled via API but can also be here
  });
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  
  // One-time update for Samir's photo if he exists
  try {
    const samirPhoto = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=400&h=600";
    db.prepare("UPDATE users SET profilePic = ? WHERE name LIKE '%Samir%'").run(samirPhoto);
    console.log("[DB] Updated Samir's profile picture");
  } catch (e) {
    console.error("[DB] Failed to update Samir's photo:", e);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
