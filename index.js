require("dotenv").config();
/* console.log("USER:", process.env.EMAIL_USER);
console.log("PASS:", process.env.EMAIL_PASS); */
const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { createRemoteJWKSet, jwtVerify } = require("jose");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const nodemailer = require('nodemailer');
const admin = require("firebase-admin");

////////////////////////////////////////////////////////////
/// ✅ APP INITIALIZATION (MOVED TO TOP)
////////////////////////////////////////////////////////////
const app = express();
const server = http.createServer(app);
app.set("trust proxy", 1);

//const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
/*const serviceAccount = require("./serviceAccountKey.json");
 admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
}); */


let firebaseReady = false;

try {
  let serviceAccount;

  if (process.env.FIREBASE_KEY_BASE64) {
    serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString("utf8")
    );
  } else if (process.env.FIREBASE_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
  } else {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : "";

    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !privateKey
    ) {
      throw new Error("Firebase env missing");
    }

    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    };
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  firebaseReady = true;
  console.log("✅ Firebase Admin ready");
} catch (e) {
  console.log("⚠️ Firebase Admin disabled:", e.message);
}

////////////////////////////////////////////////////////////
/// ALLOWED ORIGINS (For CORS + Socket.IO)
////////////////////////////////////////////////////////////
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://10.121.144.189:5173",
  "https://teamtracker-backend-1.onrender.com"
];
////////////////////////////////////////////////////////////
/// RATE LIMITING
////////////////////////////////////////////////////////////
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: "Too many requests, try later ❌",
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    return res.status(429).json({
      message: "Too many login attempts, try later ❌"
    });
  }
});

const messageRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: "Too many messages, slow down ❌"
});

////////////////////////////////////////////////////////////
/// DB CONNECTION (ONLY ONE - Use callback-style mysql2)
////////////////////////////////////////////////////////////
const db = require("./db");
// ✅ NEVER declare db again! This is the ONLY db instance.

////////////////////////////////////////////////////////////
/// SOCKET.IO SETUP
////////////////////////////////////////////////////////////
const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

const io = require("socket.io")(server, {
  cors: corsOptions,
});

app.use(cors(corsOptions));

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("No token ❌"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error("Invalid token ❌"));
      }

      const userId = decoded.id || decoded.userId;
      if (!userId) {
        return next(new Error("Invalid token"));
      }

      db.query(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [userId],
        (dbErr, rows) => {
          if (dbErr) {
            console.log("Socket auth DB error:", dbErr.message);
            return next(new Error("Auth DB error"));
          }

          if (!rows || rows.length === 0) {
            return next(new Error("User deleted or not found"));
          }

          const dbUser = rows[0];
          if (dbUser.status === "blocked") {
            return next(new Error("Account blocked"));
          }

          socket.user = {
            ...decoded,
            ...dbUser,
            id: dbUser.id,
            role: dbUser.role || decoded.role,
            team_id: dbUser.team_id || decoded.team_id || "1",
          };
          next();
        }
      );
    });
  } catch (e) {
    next(new Error("Auth error ❌"));
  }
});

io.on("connection", (socket) => {
  console.log("🔥 User connected:", socket.id);

  socket.on("joinRoom", () => {
    const team_id = socket.user.team_id;
    socket.join(`team_${team_id}`);
    console.log("✅ Joined secure room:", team_id);
  });

  socket.on("joinUser", (user_id) => {
    socket.join(user_id.toString());
    console.log("✅ User joined personal room:", user_id);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

////////////////////////////////////////////////////////////
/// GLOBAL RATE LIMITER
////////////////////////////////////////////////////////////
//app.use("/login", loginLimiter);
app.use("/send-message", messageRateLimiter);

////////////////////////////////////////////////////////////
/// MIDDLEWARE SETUP
////////////////////////////////////////////////////////////
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

////////////////////////////////////////////////////////////
/// UPLOAD DIRECTORY
////////////////////////////////////////////////////////////
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

////////////////////////////////////////////////////////////
/// TEST DATABASE CONNECTION
////////////////////////////////////////////////////////////
function testDBConnection() {
  db.query("SELECT 1 AS ok", (err, rows) => {
    if (err) {
      console.log("❌ DB Connection Failed:", err.message);
      process.exit(1);
      return;
    }

    console.log("✅ DB Pool Connected Successfully");
    console.log("DB Test Result:", rows);

    // Show active database
    db.query("SELECT DATABASE() AS db", (err2, dbInfo) => {
      if (err2) {
        console.log("⚠️ DB Info query failed:", err2.message);
        return;
      }

      console.log("📦 Connected Database:", dbInfo[0].db);

      // Show total users
      db.query("SELECT COUNT(*) AS total FROM users", (err3, userCount) => {
        if (err3) {
          console.log("⚠️ User count query failed:", err3.message);
          return;
        }

        console.log("👥 Total Users:", userCount[0].total);
      });
    });
  });
}

testDBConnection();

////////////////////////////////////////////////////////////
/// HANDLE UNEXPECTED DB ERRORS
////////////////////////////////////////////////////////////
db.on?.("error", (err) => {
  console.log("❌ MySQL Pool Error:", err.message);

  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("⚠️ Database connection lost.");
  }

  if (err.code === "ER_CON_COUNT_ERROR") {
    console.log("⚠️ Too many DB connections.");
  }

  if (err.code === "ECONNREFUSED") {
    console.log("⚠️ Database connection refused.");
  }
});

////////////////////////////////////////////////////////////
/// JWT VERIFY MIDDLEWARE
////////////////////////////////////////////////////////////
function verifyToken(req, res, next) {
  try {
    const bearerHeader = req.headers["authorization"];

    if (!bearerHeader || !bearerHeader.startsWith("Bearer ")) {
      return res.status(403).json({ message: "Token Required" });
    }

    const token = bearerHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid Token" });
      }

      const userId = decoded?.id || decoded?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Invalid Token Payload" });
      }

      db.query(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [userId],
        (dbErr, rows) => {
          if (dbErr) {
            console.log("Token DB recheck error:", dbErr.message);
            return res.status(500).json({ message: "Server Error" });
          }

          if (!rows || rows.length === 0) {
            return res.status(401).json({ message: "User deleted or not found" });
          }

          const dbUser = rows[0];

          if (dbUser.status === "blocked") {
            return res.status(403).json({ message: "Account blocked" });
          }

          req.user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role || decoded.role,
            team_id: dbUser.team_id || decoded.team_id || "1",
            status: dbUser.status,
          };

          next();
        }
      );
    });
  } catch (error) {
    console.log("verifyToken crash:", error.message);
    return res.status(500).json({ message: "Auth Error" });
  }
}

function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only ❌" });
  }
  next();
}

////////////////////////////////////////////////////////////
/// APPLE LOGIN SETUP
////////////////////////////////////////////////////////////
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID;
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET missing in .env ❌");
}

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn("⚠️ EMAIL_USER / EMAIL_PASS missing in .env");
}

if (!APPLE_BUNDLE_ID) {
  console.warn("⚠️ APPLE_BUNDLE_ID missing in .env. Apple login may fail.");
}

const appleJwks = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

////////////////////////////////////////////////////////////
/// MULTER STORAGE
////////////////////////////////////////////////////////////
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads'),
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "_" + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();

  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "audio/aac",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
    "application/octet-stream",
  ];

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
    ".m4a",
    ".aac",
    ".mp3",
    ".wav",
    ".ogg",
    ".webm",
  ];

  const isAllowed =
    allowedMimeTypes.includes(mime) ||
    allowedExtensions.includes(ext) ||
    mime.startsWith("audio/");

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

db.query(
  `CREATE TABLE IF NOT EXISTS uploaded_files (
    filename VARCHAR(255) PRIMARY KEY,
    original_name VARCHAR(255) NULL,
    mime_type VARCHAR(120) NULL,
    size INT NULL,
    data LONGBLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  (err) => {
    if (err) console.log("Uploaded files table check failed:", err.message);
    else console.log("Uploaded files table ready");
  }
);

function persistUploadedFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.filename || !file.path) return resolve(false);

    fs.readFile(file.path, (readErr, buffer) => {
      if (readErr) {
        console.log("Upload backup read failed:", readErr.message);
        return resolve(false);
      }

      db.query(
        `INSERT INTO uploaded_files
          (filename, original_name, mime_type, size, data)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          original_name = VALUES(original_name),
          mime_type = VALUES(mime_type),
          size = VALUES(size),
          data = VALUES(data)`,
        [
          file.filename,
          file.originalname || file.filename,
          file.mimetype || "application/octet-stream",
          file.size || buffer.length,
          buffer,
        ],
        (dbErr) => {
          if (dbErr) {
            console.log("Upload backup DB failed:", dbErr.message);
            return resolve(false);
          }
          resolve(true);
        }
      );
    });
  });
}

app.get("/uploads/:filename", (req, res) => {
  const filename = path.basename(req.params.filename || "");
  if (!filename) return res.status(404).send("File not found");

  db.query(
    "SELECT mime_type, data FROM uploaded_files WHERE filename = ? LIMIT 1",
    [filename],
    (err, rows) => {
      if (err) return res.status(500).send("File fetch failed");
      if (!rows || rows.length === 0) {
        return res.status(404).send("File not found");
      }

      res.setHeader(
        "Content-Type",
        rows[0].mime_type || "application/octet-stream"
      );
      res.setHeader("Cache-Control", "public, max-age=31536000");
      return res.send(rows[0].data);
    }
  );
});

////////////////////////////////////////////////////////////
/// EMAIL CONFIGURATION
////////////////////////////////////////////////////////////
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS (important for port 587)

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // MUST be App Password (not normal Gmail password)
  },

  tls: {
    rejectUnauthorized: false, // helps avoid Render / SSL handshake issues
  },

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

// Verify mail server connection
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Mail Error:", error);
  } else {
    console.log("✅ Mail server ready");
  }
});

console.log("📧 Mail transporter configured");

////////////////////////////////////////////////////////////
/// OTP STORE (In-memory, TODO: Move to DB)
////////////////////////////////////////////////////////////
const otpStore = {};

////////////////////////////////////////////////////////////
/// ✅ HELPER: Send FCM push to a list of tokens
/// Rule 4: Caller always excludes sender before calling this
////////////////////////////////////////////////////////////
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!firebaseReady || !tokens || tokens.length === 0) return;
  try {
    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: "TEAM WORK TRACKER", body },
      android: {
        priority: "high",
        notification: {
          channelId: "tl_updates",
          priority: "high",
          sound: "default",
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: "public",
          icon: "ic_launcher",
        },
      },
      data: { click_action: "FLUTTER_NOTIFICATION_CLICK", ...data },
    });
    console.log(`✅ Push sent: ${result.successCount}/${tokens.length}`);
  } catch (err) {
    console.log("⚠️ Push notification error:", err.message);
  }
}

/// ✅ HELPER: Get FCM tokens for given user IDs (notification_enabled = 1)
/// Rule 4: excludeUserId filters out the sender
function getFcmTokens(userIds, excludeUserId, callback) {
  if (!userIds || userIds.length === 0) return callback(null, []);
  const filtered = userIds.filter((id) => id != excludeUserId);
  if (filtered.length === 0) return callback(null, []);
  const placeholders = filtered.map(() => "?").join(",");
  db.query(
    `SELECT ut.fcm_token FROM user_tokens ut
     JOIN users u ON u.id = ut.user_id
     WHERE ut.user_id IN (${placeholders}) AND u.notification_enabled = 1`,
    filtered,
    (err, rows) => {
      if (err) return callback(err, []);
      callback(null, rows.map((r) => r.fcm_token).filter(Boolean));
    }
  );
}

/// ✅ HELPER: Get employee IDs in a team (Rule 3: same team only, Rule 4: excludes sender)
function getTeamEmployeeIds(teamId, excludeUserId, callback) {
  db.query(
    `SELECT id FROM users WHERE team_id = ? AND role = 'employee' AND id != ? AND status = 'active'`,
    [teamId, excludeUserId],
    (err, rows) => {
      if (err) return callback(err, []);
      callback(null, rows.map((r) => r.id));
    }
  );
}

/// ✅ HELPER: Get TL IDs in a team (Rule 3: same team only, Rule 4: excludes sender)
function getTeamTLIds(teamId, excludeUserId, callback) {
  db.query(
    `SELECT id FROM users WHERE team_id = ? AND (role = 'tl' OR role = 'tel') AND id != ? AND status = 'active'`,
    [teamId, excludeUserId],
    (err, rows) => {
      if (err) return callback(err, []);
      callback(null, rows.map((r) => r.id));
    }
  );
}

////////////////////////////////////////////////////////////
/// 5. CHAT SYSTEM ROUTES
////////////////////////////////////////////////////////////

app.post("/send-message", verifyToken, upload.single("media"), (req, res) => {
  const userId = req.user.id;
  const team_id = req.user.team_id;

  const {
    sender_name,
    message,
    role,
    message_type,
    reply_to_id,
    reply_to_message,
    reply_to_sender
  } = req.body;

  // FIX: Single validation (removed duplicate)
  if ((!message || !message.trim()) && !req.file) {
    return res.status(400).json({ error: "Empty message!" });
  }

  if (!validator.isLength(message || "", { max: 1000 })) {
    return res.status(400).json({ error: "Message too long (max 1000 chars) ❌" });
  }

  if (sender_name && sender_name.length > 50) {
    return res.status(400).json({ error: "Invalid name ❌" });
  }

  if (!team_id) {
    return res.status(400).json({ error: "Missing Team ID!" });
  }

  const mediaFile = req.file ? req.file.filename : null;
  let finalType = message_type || "text";

  if (req.file) {
    const mime = (req.file.mimetype || "").toLowerCase();
    const ext = path.extname(req.file.originalname || "").toLowerCase();

    if (
      mime.startsWith("audio/") ||
      ["audio/mp4", "audio/x-m4a", "application/octet-stream"].includes(mime) ||
      [".m4a", ".aac", ".mp3", ".wav", ".ogg", ".webm"].includes(ext)
    ) {
      finalType = "audio";
    } else if (mime.startsWith("image/")) {
      finalType = "image";
    } else {
      finalType = "file";
    }
  }

  db.query(
    `SELECT id, empCode, profile_image FROM users WHERE id = ? LIMIT 1`,
    [userId],
    async (userErr, userRows) => {
      if (userErr) {
        console.error("❌ User Fetch Error:", userErr.message);
        return res.status(500).json({ error: userErr.message });
      }

      if (!userRows.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const dbUser = userRows[0];
      const finalSenderId = dbUser.id.toString();

      const sql = `
        INSERT INTO team_messages
        (sender_id, sender_user_id, sender_name, message, team_id, role, message_type, media_url, reply_to_id, reply_to_message, reply_to_sender)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sql,
        [
          finalSenderId,
          userId,
          sender_name,
          message || "",
          team_id,
          role,
          finalType,
          mediaFile,
          reply_to_id || null,
          reply_to_message || null,
          reply_to_sender || null
        ],
        async (err, result) => {
          if (err) {
            console.error("❌ DB Insert Error:", err.message);
            return res.status(500).json({ error: err.message });
          }

          await persistUploadedFile(req.file);

          const newMessageData = {
            id: result.insertId,
            sender_id: finalSenderId,
            sender_user_id: dbUser.id,
            sender_name,
            message: message || "",
            team_id,
            role,
            message_type: finalType,
            media_url: mediaFile,
            reply_to_id: reply_to_id || null,
            reply_to_message: reply_to_message || null,
            reply_to_sender: reply_to_sender || null,
            profile_image: dbUser.profile_image,
            is_seen_by_tl: 0,
            created_at: new Date(),
          };

          io.to(`team_${team_id}`).emit("newMessage", newMessageData);

          // ✅ Rule 1: TL message → notify same-team employees only
          // ✅ Rule 2: EMP message → notify TL + same-team colleagues
          // ✅ Rule 3: team isolation via helpers (same team_id only)
          // ✅ Rule 4: sender (userId) always excluded
          const isTL = role === "tl" || role === "tel";
          const notifBody = message
            ? `${sender_name}: ${message}`
            : `${sender_name}: ${finalType === "audio" ? "🎤 Voice message" : "📎 Media message"}`;
          const notifData = { type: "chat", sender_name: sender_name || "", message: message || "" };

          if (isTL) {
            // Rule 1: TL → employees in same team
            getTeamEmployeeIds(team_id, userId, (e1, empIds) => {
              if (e1 || !empIds.length) {
                return res.status(200).json({ message: "Sent successfully ✅", messageId: result.insertId, media_url: mediaFile, data: newMessageData });
              }
              getFcmTokens(empIds, userId, async (e2, tokens) => {
                if (!e2 && tokens.length > 0) await sendPushNotification(tokens, "TEAM WORK TRACKER", notifBody, notifData);
                res.status(200).json({ message: "Sent successfully ✅", messageId: result.insertId, media_url: mediaFile, data: newMessageData });
              });
            });
          } else {
            // Rule 2: EMP → TL in same team
            getTeamTLIds(team_id, userId, (e1, tlIds) => {
              getFcmTokens(tlIds || [], userId, async (e2, tlTokens) => {
                if (!e2 && tlTokens.length > 0) await sendPushNotification(tlTokens, "TEAM WORK TRACKER", notifBody, notifData);
              });
            });
            // Rule 2: EMP → colleagues in same team
            getTeamEmployeeIds(team_id, userId, (e3, colleagueIds) => {
              getFcmTokens(colleagueIds || [], userId, async (e4, colTokens) => {
                if (!e4 && colTokens.length > 0) await sendPushNotification(colTokens, "TEAM WORK TRACKER", notifBody, { ...notifData, type: "colleague_chat" });
              });
            });
            res.status(200).json({ message: "Sent successfully ✅", messageId: result.insertId, media_url: mediaFile, data: newMessageData });
          }
        }
      );
    }
  );
});

app.get('/get-messages', verifyToken, (req, res) => {
  const teamId = req.user.team_id;
  const userId = req.user.id;

  if (!teamId) {
    return res.status(400).json({ error: "Team ID missing!" });
  }

  const sql = `
    SELECT m.*, u.profile_image, u.id AS sender_user_id
    FROM team_messages m
    LEFT JOIN users u ON u.id = m.sender_user_id
    LEFT JOIN deleted_chat_messages d
      ON d.message_id = m.id AND d.user_id = ?
    WHERE m.team_id = ?
      AND m.created_at >= (
        SELECT created_at FROM users WHERE id = ?
      )
      AND d.id IS NULL
    ORDER BY m.created_at ASC
  `;

  db.query(sql, [userId, teamId, userId], (err, results) => {
    if (err) {
      console.error("❌ Get messages error:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
});

app.delete('/clear-chat', verifyToken, (req, res) => {
  const team_id = req.user.team_id;
  if (!team_id) return res.status(400).json({ error: "Team ID missing!" });

  const sql = "DELETE FROM team_messages WHERE team_id = ?";
  db.query(sql, [team_id], (err) => {
    if (err) {
      console.error("❌ Clear Chat Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "Chat cleared for team " + team_id });
  });
});

app.delete("/delete-message", verifyToken, (req, res) => {
  const { message_id } = req.body;
  const userId = req.user.id;

  if (!message_id) {
    return res.status(400).json({ error: "Message ID required" });
  }

  db.query(
    "SELECT id FROM team_messages WHERE id = ? LIMIT 1",
    [message_id],
    (findErr, rows) => {
      if (findErr) {
        return res.status(500).json({ error: findErr.message });
      }

      if (!rows.length) {
        return res.status(404).json({ error: "Message not found" });
      }

      db.query(
        "INSERT IGNORE INTO deleted_chat_messages (message_id, user_id) VALUES (?, ?)",
        [message_id, userId],
        (insertErr) => {
          if (insertErr) {
            return res.status(500).json({ error: insertErr.message });
          }

          console.log(`✅ Message ${message_id} hidden for user ${userId}`);
          return res.status(200).json({
            message: "Message hidden for this user ✅"
          });
        }
      );
    }
  );
});

app.delete("/delete-message-for-everyone", verifyToken, (req, res) => {
  const { message_id } = req.body;
  const userId = req.user.id;

  if (!message_id) {
    return res.status(400).json({ error: "Message ID required" });
  }

  db.query(
    "SELECT id, sender_user_id, media_url FROM team_messages WHERE id = ? LIMIT 1",
    [message_id],
    (findErr, rows) => {
      if (findErr) {
        return res.status(500).json({ error: findErr.message });
      }

      if (!rows.length) {
        return res.status(404).json({ error: "Message not found" });
      }

      const message = rows[0];

      if (message.sender_user_id != userId) {
        return res.status(403).json({
          error: "Only sender can delete for everyone ❌"
        });
      }

      db.query(
        "DELETE FROM deleted_chat_messages WHERE message_id = ?",
        [message_id],
        (cleanErr) => {
          if (cleanErr) {
            return res.status(500).json({ error: cleanErr.message });
          }

          db.query(
            "DELETE FROM team_messages WHERE id = ?",
            [message_id],
            (deleteErr, result) => {
              if (deleteErr) {
                return res.status(500).json({ error: deleteErr.message });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Message not found" });
              }

              const mediaUrl = message.media_url;

              if (mediaUrl) {
                const filePath = path.join(uploadDir, mediaUrl);
                if (fs.existsSync(filePath)) {
                  fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) {
                      console.log("⚠️ File delete warning:", unlinkErr.message);
                    }
                  });
                }
              }

              return res.status(200).json({
                message: "Message deleted for everyone ✅"
              });
            }
          );
        }
      );
    }
  );
});

////////////////////////////////////////////////////////////
/// 6. AUTH & USER ROUTES
////////////////////////////////////////////////////////////

app.post("/register", async (req, res) => {
  const { name, email, password, role, team_id } = req.body;

  const finalRole = (role || "employee").toString().trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);
  const finalStatus = finalRole === "tl" ? "pending" : "active";
  const checkSql = "SELECT * FROM users WHERE email = ?";

  db.query(checkSql, [email], (checkErr, checkResult) => {
    if (checkErr) {
      console.log("❌ Registration Check Error:", checkErr);
      return res.status(500).json({ message: "Registration Failed ❌" });
    }

    if (checkResult.length > 0) {
      return res.status(400).json({
        message: "Email already registered ❌"
      });
    }

    const sql = `
      INSERT INTO users (name, email, password, role, status, team_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [name, email, hashedPassword, finalRole, finalStatus, team_id], (err, result) => {
      if (err) {
        console.log("❌ Registration Error:", err);
        return res.status(500).json({ message: "Registration Failed ❌" });
      }

      const token = jwt.sign(
        { id: result.insertId, role: finalRole, team_id },
        process.env.JWT_SECRET
      );

      res.json({
        message: finalRole === "tl"
          ? "Registered successfully. Wait for admin approval ⏳"
          : "Registered Successfully ✅",
        token,
        user: {
          id: result.insertId,
          name,
          email,
          role: finalRole,
          status: finalStatus,
          team_id: team_id,
        }
      });
    });
  });
});

// ✅ FIXED LOGIN ROUTE - All issues fixed
app.post("/login", loginLimiter, async (req, res) => {
  console.log("🔥 LOGIN API HIT");

  const loginTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.log("⏱️ Login timeout");
      return res.status(504).json({ message: "Login timeout - DB took too long ❌" });
    }
  }, 15000);

  const sendJson = (status, body) => {
    clearTimeout(loginTimeout);
    if (!res.headersSent) {
      return res.status(status).json(body);
    }
  };

  try {
    const { email, password } = req.body;

    console.log("📩 Login request:", email);

    if (!email || !password) {
      return sendJson(400, { message: "Email & Password required ❌" });
    }

    console.log("📡 Running DB query...");

    // ✅ FIX 1: Changed WHERE id to WHERE email
    // ✅ FIX 2: Changed parameter from [userId] to [email]
    // ✅ FIX 3: Added async keyword to callback function
    db.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email],
      async (err, result) => {
        console.log("📊 DB response received");

        if (err) {
          console.error("❌ Database Error:", err);
          return sendJson(500, { message: "Database Error ❌", error: err.message });
        }

        if (!result || result.length === 0) {
          console.log("❌ User Not Found:", email);
          return sendJson(401, { message: "User Not Found ❌" });
        }

        const user = result[0];
        console.log("👤 User found:", user.email);

        try {
          if (!user.password) {
            return sendJson(500, { message: "User data error ❌" });
          }

          console.log("🔐 Checking password...");
          // ✅ NOW await WORKS because callback is async
          const isMatch = await bcrypt.compare(password, user.password);

          if (!isMatch) {
            console.log("❌ Wrong Password:", email);
            return sendJson(401, { message: "Wrong Password ❌" });
          }

          if (user.role === "tl" && user.status === "pending") {
            return sendJson(403, { message: "Waiting for admin approval ⏳" });
          }

          if (user.status === "blocked") {
            return sendJson(403, { message: "Account blocked ❌" });
          }

          const finalTeamId = user.team_id || "1";

          if (!user.team_id) {
            db.query("UPDATE users SET team_id = '1' WHERE id = ?", [user.id]);
          }

          if (!process.env.JWT_SECRET) {
            return sendJson(500, { message: "Server config error ❌" });
          }

          const token = jwt.sign(
            { id: user.id, role: user.role, team_id: finalTeamId },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
          );

          console.log("🎉 Login Success:", email);

          return sendJson(200, {
            message: "Login Success ✅",
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              emp_code: user.emp_code || user.empCode,
              theme_preference: user.theme_preference,
              team_id: finalTeamId,
              profile_image: user.profile_image,
              status: user.status,
            },
          });
        } catch (bcryptErr) {
          console.error("❌ Bcrypt Error:", bcryptErr);
          return sendJson(500, { message: "Password check error ❌" });
        }
      }
    );
  } catch (error) {
    console.error("❌ Login API Crash:", error);
    return sendJson(500, { message: "Server crash ❌" });
  }
});

////////////////////////////////////////////////////////////
/// 7. WORK UPDATE ROUTES
////////////////////////////////////////////////////////////

app.get("/work", verifyToken, (req, res) => {
  const teamId = req.user.team_id;
  const userId = req.user.id;
  const role = (req.user.role || "").toString().toLowerCase();

  let sql = "";
  let params = [];

  if (role === "tl" || role === "tel" || role === "admin") {
    sql = `
      SELECT wu.*, u.name, u.profile_image
      FROM work_updates wu
      JOIN users u ON wu.user_id = u.id
      WHERE wu.team_id = ?
      ORDER BY wu.created_at DESC
    `;
    params = [teamId];
  } else {
    sql = `
      SELECT wu.*, u.name, u.profile_image
      FROM work_updates wu
      JOIN users u ON wu.user_id = u.id
      WHERE wu.user_id = ?
      ORDER BY wu.created_at DESC
    `;
    params = [userId];
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.log("❌ DB ERROR:", err);
      return res.status(500).json({ message: "DB Error" });
    }

    res.json(result);
  });
});

app.post("/work", verifyToken, upload.single("media"), (req, res) => {
  const userId = req.user.id;
  const { description } = req.body;
  const mediaFile = req.file ? req.file.filename : null;
  const teamId = req.user.team_id;

  if (!description || !description.trim()) {
    return res.status(400).json({ message: "Description is required ❌" });
  }

  const sql = `
    INSERT INTO work_updates (user_id, description, media, status, team_id, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  db.query(sql, [userId, description.trim(), mediaFile, "pending", teamId], async (err, result) => {
    if (err) {
      console.error("❌ Work Insert Error:", err.message);
      return res.status(500).json({ message: "DB Error ❌" });
    }

    await persistUploadedFile(req.file);

    db.query(
      "SELECT name FROM users WHERE id = ? LIMIT 1",
      [userId],
      async (userErr, users) => {
        const employeeName =
          !userErr && users && users.length > 0 ? users[0].name : "Employee";

        // ✅ Rule 1+3: TL in same team gets notification
        // ✅ Rule 2+3: Colleagues (other employees) in same team also get notification
        // ✅ Rule 4: sender (userId) excluded from both queries
        res.status(200).json({ message: "Work update added ✅", id: result.insertId, status: "pending" });

        getTeamTLIds(teamId, userId, (e1, tlIds) => {
          if (!e1 && tlIds.length > 0) {
            getFcmTokens(tlIds, userId, async (e2, tlTokens) => {
              if (!e2 && tlTokens.length > 0) {
                await sendPushNotification(tlTokens, "TEAM WORK TRACKER", `${employeeName} submitted a work update`, {
                  type: "work_update", sender_name: employeeName, message: description.trim(),
                });
                console.log("✅ Work update notification sent to TL(s)");
              }
            });
          }
        });

        // ✅ Rule 2: Also notify colleagues (other employees in same team)
        getTeamEmployeeIds(teamId, userId, (e3, colleagueIds) => {
          if (!e3 && colleagueIds.length > 0) {
            getFcmTokens(colleagueIds, userId, async (e4, colTokens) => {
              if (!e4 && colTokens.length > 0) {
                await sendPushNotification(colTokens, "TEAM WORK TRACKER", `${employeeName} posted a work update`, {
                  type: "colleague_update", sender_name: employeeName, message: description.trim(),
                });
                console.log("✅ Work update notification sent to colleagues");
              }
            });
          }
        });
      }
    );
  });
});

app.patch("/work/watch/:id", verifyToken, (req, res) => {
  const workId = req.params.id;

  const sql = `
    UPDATE work_updates wu
    JOIN users u ON wu.user_id = u.id
    SET wu.status = 'TL Watched' 
    WHERE wu.id = ? AND wu.status != 'approved' AND wu.team_id = ?
  `;

  db.query(sql, [workId, req.user.team_id], (err) => {
    if (err) return res.status(500).json({ message: "Error ❌" });

    res.json({
      message: "Marked as Watched 👀",
      status: "TL Watched"
    });
  });
});

app.patch("/work/approve/:id", verifyToken, (req, res) => {
  const workId = req.params.id;

  const sql = `
    UPDATE work_updates wu
    JOIN users u ON wu.user_id = u.id
    SET wu.status = 'approved'
    WHERE wu.id = ? AND wu.team_id = ?
  `;

  db.query(sql, [workId, req.user.team_id], (err) => {
    if (err) return res.status(500).json({ message: "Error ❌" });

    res.json({
      message: "Approve here ✅",
      status: "Approved"
    });
  });
});

////////////////////////////////////////////////////////////
/// ✅ DASHBOARD STATS API
////////////////////////////////////////////////////////////
app.get("/dashboard-stats", verifyToken, (req, res) => {
  const userId = req.user.id;

  const allSql = `
    SELECT id, status, created_at
    FROM work_updates
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.query(allSql, [userId], (err, allUpdates) => {
    if (err) {
      console.error("❌ Dashboard Stats Error:", err);
      return res.status(500).json({ message: "DB Error" });
    }

    const total = allUpdates.length;
    const pending = allUpdates.filter(u => u.status === 'pending').length;
    const watched = allUpdates.filter(u => u.status === 'TL Watched').length;
    const approved = allUpdates.filter(u => u.status === 'approved').length;

    const now = new Date();
    let streak = 0;

    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const hasUpdate = allUpdates.some(u => {
        const d = new Date(u.created_at);
        return d.toISOString().split('T')[0] === dateStr;
      });

      if (hasUpdate) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dateStr = day.toISOString().split('T')[0];

      const count = allUpdates.filter(
        u => new Date(u.created_at).toISOString().split('T')[0] === dateStr
      ).length;

      last7Days.push({
        date: dateStr,
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()],
        count
      });
    }

    const last4Weeks = [];
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - w * 7);

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - w * 7 - 7);

      const count = allUpdates.filter(u => {
        const d = new Date(u.created_at);
        return d >= weekStart && d <= weekEnd;
      }).length;

      last4Weeks.push({ week: `W${4 - w}`, count });
    }

    const thisMonth = allUpdates.filter(u => {
      const d = new Date(u.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const monthTotal = thisMonth.length;
    const monthPending = thisMonth.filter(u => u.status === 'pending').length;
    const monthWatched = thisMonth.filter(u => u.status === 'TL Watched').length;
    const monthApproved = thisMonth.filter(u => u.status === 'approved').length;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const thisWeek = allUpdates.filter(u => new Date(u.created_at) >= weekStart);
    const weekTotal = thisWeek.length;
    const weekPending = thisWeek.filter(u => u.status === 'pending').length;
    const weekWatched = thisWeek.filter(u => u.status === 'TL Watched').length;
    const weekApproved = thisWeek.filter(u => u.status === 'approved').length;

    const todayStr = now.toISOString().split('T')[0];
    const todayUpdates = allUpdates.filter(
      u => new Date(u.created_at).toISOString().split('T')[0] === todayStr
    );

    const dayTotal = todayUpdates.length;
    const dayPending = todayUpdates.filter(u => u.status === 'pending').length;
    const dayWatched = todayUpdates.filter(u => u.status === 'TL Watched').length;
    const dayApproved = todayUpdates.filter(u => u.status === 'approved').length;

    const last7Hours = [];
    for (let h = 6; h >= 0; h--) {
      const hourEnd = new Date(now);
      const hourStart = new Date(now);

      hourEnd.setHours(now.getHours() - h);
      hourStart.setHours(now.getHours() - h - 1);
      hourStart.setMinutes(0);
      hourStart.setSeconds(0);
      hourEnd.setMinutes(59);
      hourEnd.setSeconds(59);

      const count = allUpdates.filter(u => {
        const d = new Date(u.created_at);
        return d >= hourStart && d <= hourEnd;
      }).length;

      last7Hours.push({ hour: `${hourStart.getHours()}h`, count });
    }

    res.json({
      total,
      pending,
      watched,
      approved,
      streak,
      week: {
        total: weekTotal,
        pending: weekPending,
        watched: weekWatched,
        approved: weekApproved
      },
      month: {
        total: monthTotal,
        pending: monthPending,
        watched: monthWatched,
        approved: monthApproved
      },
      day: {
        total: dayTotal,
        pending: dayPending,
        watched: dayWatched,
        approved: dayApproved
      },
      last7Days,
      last4Weeks,
      last7Hours,
    });
  });
});

////////////////////////////////////////////////////////////
/// 8. PROFILE ROUTES
////////////////////////////////////////////////////////////

app.get("/profile", verifyToken, (req, res) => {
  try {
    const userId = req.user.id;

    db.query(
      "SELECT name, email, role FROM users WHERE id = ?",
      [userId],
      (err, rows) => {
        if (err) {
          console.log("Profile error:", err);
          return res.status(500).json({ message: "DB Error ❌" });
        }

        if (!rows || rows.length === 0) {
          return res.status(404).json({ message: "User not found ❌" });
        }

        return res.json({ user: rows[0] });
      }
    );
  } catch (err) {
    console.log("Profile error:", err);
    return res.status(500).json({ message: "DB Error ❌" });
  }
});

app.put("/update-profile", verifyToken, upload.single("image"), async (req, res) => {
  const userId = req.user.id;
  const { name, email, empCode, phone } = req.body;
  const imageName = req.file ? req.file.filename : null;

  await persistUploadedFile(req.file);

  let sql = imageName
    ? "UPDATE users SET name=?, email=?, empCode=?, phone=?, profile_image=? WHERE id=?"
    : "UPDATE users SET name=?, email=?, empCode=?, phone=? WHERE id=?";

  let values = imageName
    ? [name, email, empCode, phone, imageName, userId]
    : [name, email, empCode, phone, userId];

  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ message: "DB Error ❌" });
    res.status(200).json({
      message: "Profile Updated Successfully ✅",
      image: imageName
    });
  });
});

app.post("/update-theme", verifyToken, (req, res) => {
  const userId = req.user.id;
  const { theme } = req.body;

  if (!theme) return res.status(400).json({ message: "Theme is required" });

  const sql = "UPDATE users SET theme_preference = ? WHERE id = ?";
  db.query(sql, [theme, userId], (err) => {
    if (err) return res.status(500).json({ message: "DB Error ❌" });
    console.log(`✅ User ${userId} theme updated to: ${theme}`);
    res.status(200).json({ message: "Theme updated in DB ✅" });
  });
});

app.put("/update-team", verifyToken, verifyAdmin, (req, res) => {
  const { userId, team_id } = req.body;

  if (!userId || !team_id) {
    return res.status(400).json({ message: "Missing data ❌" });
  }

  db.query(
    "UPDATE users SET team_id=? WHERE id=?",
    [team_id, userId],
    (err) => {
      if (err) {
        console.log("❌ Team update error:", err);
        return res.status(500).json({ message: "DB Error ❌" });
      }

      console.log(`✅ Team updated: User ${userId} → Team ${team_id}`);
      res.json({ message: "Team updated successfully ✅" });
    }
  );
});

app.post('/mark-as-seen', verifyToken, (req, res) => {
  const team_id = req.user.team_id;
  const sql = "UPDATE team_messages SET is_seen_by_tl = 1 WHERE team_id = ? AND role != 'tl'";

  db.query(sql, [team_id], (err) => {
    if (err) {
      console.error("❌ Mark as seen error:", err);
      return res.status(500).json({ error: "Update failed" });
    }
    res.json({ message: "Messages marked as seen ✅" });
  });
});

////////////////////////////////////////////////////////////
/// SOCIAL LOGIN ROUTES
////////////////////////////////////////////////////////////

app.post("/apple-login", async (req, res) => {
  try {
    const {
      userIdentifier,
      email,
      name,
      identityToken,
      authorizationCode,
      rawNonce,
    } = req.body;

    if (!identityToken || !rawNonce) {
      return res.status(400).json({ message: "Missing Apple credentials ❌" });
    }

    const hashedNonce = sha256Hex(rawNonce);

    let verified;
    try {
      verified = await jwtVerify(identityToken, appleJwks, {
        issuer: "https://appleid.apple.com",
        audience: APPLE_BUNDLE_ID,
      });
    } catch (err) {
      console.log("❌ Apple token verify failed:", err);
      return res.status(401).json({ message: "Invalid Apple token ❌" });
    }

    const claims = verified.payload;

    if (claims.nonce !== hashedNonce) {
      return res.status(401).json({ message: "Invalid Apple nonce ❌" });
    }

    const appleSub = claims.sub;
    const appleEmail = (email || claims.email || "").trim().toLowerCase();
    const appleName = (name || "").trim();

    const findSql = `
      SELECT * FROM users
      WHERE apple_sub = ?
         OR LOWER(TRIM(email)) = ?
      ORDER BY
        CASE
          WHEN role = 'admin' THEN 1
          WHEN role = 'tl' THEN 2
          WHEN role = 'employee' THEN 3
          ELSE 4
        END,
        id ASC
      LIMIT 1
    `;

    db.query(findSql, [appleSub, appleEmail], (err, rows) => {
      if (err) {
        console.log("❌ Apple login DB error:", err);
        return res.status(500).json({ message: "DB Error ❌" });
      }

      if (!rows.length) {
        return res.status(404).json({
          message: "No account found for this Apple ID. Please register first ❌"
        });
      }

      const user = rows[0];

      if (user.role === "tl" && user.status === "pending") {
        return res.status(403).json({ message: "Waiting for admin approval ⏳" });
      }

      if (user.status === "blocked") {
        return res.status(403).json({ message: "Account blocked ❌" });
      }

      const finalTeamId = user.team_id || "1";

      const updateSql = `
        UPDATE users
        SET apple_sub = ?, 
            email = CASE WHEN (email IS NULL OR email = '') AND ? != '' THEN ? ELSE email END,
            name = CASE WHEN (name IS NULL OR name = '') AND ? != '' THEN ? ELSE name END
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [appleSub, appleEmail, appleEmail, appleName, appleName, user.id],
        (updateErr) => {
          if (updateErr) {
            console.log("❌ Apple link update error:", updateErr);
            return res.status(500).json({ message: "Account link failed ❌" });
          }

          const token = jwt.sign(
            { id: user.id, role: user.role, team_id: finalTeamId },
            process.env.JWT_SECRET
          );

          return res.json({
            message: "Login Success ✅",
            token,
            user: {
              id: user.id,
              name: user.name || appleName || "Apple User",
              email: user.email || appleEmail,
              role: user.role,
              team_id: finalTeamId,
              status: user.status,
              profile_image: user.profile_image
            }
          });
        }
      );
    });
  } catch (e) {
    console.log("❌ Apple login error:", e);
    res.status(500).json({ message: "Apple login failed ❌" });
  }
});

app.post("/google-login", async (req, res) => {
  const { email, googleId } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedEmail || !googleId) {
    return res.status(400).json({ message: "Email and Google ID required ❌" });
  }

  const checkSql = `
    SELECT * FROM users
    WHERE LOWER(TRIM(email)) = ?
    ORDER BY
      CASE
        WHEN role = 'admin' THEN 1
        WHEN role = 'tl' THEN 2
        WHEN role = 'employee' THEN 3
        ELSE 4
      END,
      id ASC
    LIMIT 1
  `;

  db.query(checkSql, [normalizedEmail], async (err, result) => {
    if (err) return res.status(500).json({ message: "DB Error" });

    if (result.length === 0) {
      return res.status(404).json({
        message: "No account found for this Google email. Please register first ❌"
      });
    }

    const user = result[0];

    if (user.role === "tl" && user.status === "pending") {
      return res.status(403).json({ message: "Waiting for admin approval ⏳" });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Account blocked ❌" });
    }

    const finalTeamId = user.team_id || "1";
    const token = jwt.sign(
      { id: user.id, role: user.role, team_id: finalTeamId },
      process.env.JWT_SECRET
    );

    return res.json({
      message: "Login Success ✅",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        team_id: finalTeamId,
        status: user.status,
        profile_image: user.profile_image
      }
    });
  });
});

////////////////////////////////////////////////////////////
/// PASSWORD MANAGEMENT
////////////////////////////////////////////////////////////

app.post("/forgot-password", (req, res) => {
  try {
    const { email } = req.body;

    // 🔥 1. EMAIL VALIDATION
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Invalid email ❌" });
    }

    // 🔥 2. CHECK USER EXISTS
    db.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
      (err, users) => {
        if (err) {
          console.error("❌ Forgot Password DB Error:", err);
          return res.status(500).json({ message: "Server Error ❌" });
        }

        if (!users || users.length === 0) {
          return res.status(404).json({ message: "Email not found ❌" });
        }

        const now = Date.now();

        // 🔥 3. RESEND CONTROL (60 sec)
        if (otpStore[email]) {
          const diff = now - otpStore[email].sentAt;
          if (diff < 60 * 1000) {
            return res.status(400).json({
              message: "Wait 60 seconds before requesting new OTP ⏳"
            });
          }
        }

        // 🔥 4. GENERATE OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 🔥 5. SAVE OTP
        otpStore[email] = {
          otp,
          expiry: now + 10 * 60 * 1000, // 10 minutes
          sentAt: now
        };

        console.log("OTP Generated:", otp);

        // 🔥 6. EMAIL OPTIONS
        const mailOptions = {
          from: `"TeamTracker" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Password Reset OTP",
          html: `
            <div style="font-family:Arial;padding:20px;border:1px solid #eee;">
              <h2 style="color:#4CAF50;">Password Reset OTP</h2>
              <p>Your OTP is:</p>
              <h1 style="color:#333;">${otp}</h1>
              <p style="color:red;">Valid for 10 minutes.</p>
            </div>
          `
        };

        // 🔥 7. SEND EMAIL
        transporter.sendMail(mailOptions, (mailErr) => {
          if (mailErr) {
            console.error("❌ Mail send error:", mailErr);
            return res.status(500).json({ message: "Failed to send OTP ❌" });
          }

          console.log("✅ OTP Email Sent");
          return res.status(200).json({ message: "OTP sent to email ✅" });
        });
      }
    );
  } catch (err) {
    console.error("❌ Forgot Password Error:", err);
    return res.status(500).json({ message: "Server Error ❌" });
  }
});

app.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const stored = otpStore[email];

  if (!stored) return res.status(400).json({ message: "OTP not found ❌" });
  if (stored.otp !== otp) return res.status(400).json({ message: "Wrong OTP ❌" });
  if (Date.now() > stored.expiry) return res.status(400).json({ message: "OTP expired ❌" });

  // 🔥 ADD THIS
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Password too weak ❌" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  db.query("UPDATE users SET password=? WHERE email=?", [hashedPassword, email], (err) => {
    if (err) return res.status(500).json({ message: "DB Error" });

    delete otpStore[email];

    res.json({ message: "Password reset successfully ✅" });
  });
});

////////////////////////////////////////////////////////////
/// ✅ TL ANNOUNCEMENT ROUTES
////////////////////////////////////////////////////////////

app.post("/tl-post", verifyToken, upload.single("media"), (req, res) => {
  const title = req.body.title;
  const message = req.body.message;
  const team_id = req.user.team_id;
  const mediaFile = req.file ? req.file.filename : null;
  const userId = req.user.id;

  const insertTL = `
    INSERT INTO tl_announcements (title, message, team_id, media_url, created_at)
    VALUES (?, ?, ?, ?, NOW())
  `;

  db.query(insertTL, [title, message, team_id, mediaFile], async (err3, result2) => {
    if (err3) {
      console.log("❌ TL Announcement Insert Error:", err3);
      return res.status(500).json({ error: err3.message });
    }

    await persistUploadedFile(req.file);

    console.log("✅ TL Announcement saved:", result2.insertId);

    db.query(
      `SELECT ut.fcm_token
       FROM user_tokens ut
       JOIN users u ON u.id = ut.user_id
       WHERE u.team_id = ?
       AND u.notification_enabled = 1
       AND u.role = 'employee'
       AND u.id != ?`,
      [team_id, userId],
      async (err2, rows) => {
        if (err2) {
          console.log("❌ Token Fetch Error:", err2);
          return res.status(500).json({ error: err2.message });
        }

        const tokens = rows.map((r) => r.fcm_token).filter(Boolean);

        if (tokens.length > 0) {
          try {
            await admin.messaging().sendEachForMulticast({
              tokens,
              notification: {
                title: "TEAM WORK TRACKER",
                body: `${title}: ${message}`,
              },
              android: {
                priority: "high",
                notification: {
                  channelId: "tl_updates",
                  priority: "high",
                  sound: "default",
                  defaultSound: true,
                  defaultVibrateTimings: true,
                  visibility: "public",
                  icon: "ic_launcher",
                },
              },
              data: {
                click_action: "FLUTTER_NOTIFICATION_CLICK",
                type: "tl_post",
                title: title || "",
                message: message || "",
              },
            });
          } catch (pushErr) {
            console.log("⚠️ Push notification error:", pushErr.message);
          }
        }

        res.json({
          message: "Post saved + Notification sent ✅",
          postId: result2.insertId,
          media_url: mediaFile,
        });
      }
    );
  });
});

app.get("/tl-updates", verifyToken, (req, res) => {
  const sql = `
    SELECT * FROM tl_announcements
    WHERE team_id = ?
    AND created_at >= (
      SELECT created_at FROM users WHERE id = ?
    )
    ORDER BY created_at DESC
    LIMIT 50
  `;

  db.query(sql, [req.user.team_id, req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/tl-updates/unread-count", verifyToken, (req, res) => {
  const sql = `
    SELECT COUNT(*) as unread 
    FROM tl_announcements a
    WHERE a.team_id = ?
    AND a.created_at >= (
      SELECT created_at FROM users WHERE id = ?
    )
    AND a.id NOT IN (
      SELECT announcement_id 
      FROM tl_announcement_reads 
      WHERE user_id = ?
    )
  `;

  db.query(
    sql,
    [req.user.team_id, req.user.id, req.user.id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const unread = result?.[0]?.unread || 0;
      return res.json({ unread });
    }
  );
});

app.post("/tl-updates/mark-read", verifyToken, (req, res) => {
  const getSql = `
    SELECT id FROM tl_announcements
    WHERE team_id = ?
    AND id NOT IN (
      SELECT announcement_id FROM tl_announcement_reads WHERE user_id = ?
    )
  `;

  db.query(getSql, [req.user.team_id, req.user.id], (err, items) => {
    if (err || items.length === 0) return res.json({ message: "Nothing to mark" });

    const values = items.map(a => [a.id, req.user.id]);

    db.query(
      "INSERT IGNORE INTO tl_announcement_reads (announcement_id, user_id) VALUES ?",
      [values],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: "Marked as read ✅" });
      }
    );
  });
});

app.put("/tl-post/:id", verifyToken, (req, res) => {
  const { title, message } = req.body;

  db.query(
    "SELECT created_at, team_id FROM tl_announcements WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err || !result.length) return res.status(404).json({ error: "Not found" });
      if (result[0].team_id != req.user.team_id) {
        return res.status(403).json({ error: "Unauthorized ❌" });
      }

      const mins = (Date.now() - new Date(result[0].created_at).getTime()) / 60000;
      if (mins > 60) {
        return res.status(403).json({ error: "Edit time expired (1 hour limit)" });
      }

      db.query(
        "UPDATE tl_announcements SET title=?, message=?, edited_at=NOW() WHERE id=?",
        [title, message, req.params.id],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: "Updated ✅" });
        }
      );
    }
  );
});

app.delete("/tl-post/:id", verifyToken, (req, res) => {
  db.query(
    "SELECT team_id FROM tl_announcements WHERE id = ?",
    [req.params.id],
    (err0, rows) => {
      if (err0) return res.status(500).json({ error: err0.message });
      if (!rows.length) return res.status(404).json({ error: "Post not found ❌" });
      if (rows[0].team_id != req.user.team_id) {
        return res.status(403).json({ error: "Unauthorized ❌" });
      }

      db.query("DELETE FROM tl_announcements WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Post not found ❌" });
        }

        console.log(`✅ TL Post ${req.params.id} deleted`);
        res.status(200).json({ message: "Post deleted ✅" });
      });
    }
  );
});

////////////////////////////////////////////////////////////
/// ✅ NOTIFICATION PREFERENCE & FCM TOKEN
////////////////////////////////////////////////////////////

app.post("/save-fcm-token", verifyToken, (req, res) => {
  const { fcm_token } = req.body;

  if (!fcm_token) {
    return res.status(400).json({ error: "Token required" });
  }

  db.query(
    "SELECT * FROM user_tokens WHERE user_id=? AND fcm_token=?",
    [req.user.id, fcm_token],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      if (rows.length > 0) {
        console.log("⚠️ Token already exists");
        return res.json({ message: "Token already saved" });
      }

      db.query(
        "INSERT INTO user_tokens (user_id, fcm_token) VALUES (?, ?)",
        [req.user.id, fcm_token],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });

          console.log("✅ Token saved for user:", req.user.id);
          res.json({ message: "Token saved ✅" });
        }
      );
    }
  );
});

app.post("/notification-pref", verifyToken, (req, res) => {
  const { enabled } = req.body;

  const dbValue = enabled ? 1 : 0;

  db.query(
    "UPDATE users SET notification_enabled=? WHERE id=?",
    [dbValue, req.user.id],
    (err, result) => {
      if (err) {
        console.log("❌ DB error:", err);
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        console.log("⚠️ No rows updated");
      } else {
        console.log("✅ Notification updated in DB");
      }

      res.json({ message: "Updated ✅", saved: dbValue });
    }
  );
});

app.get("/notification-pref", verifyToken, (req, res) => {
  db.query("SELECT notification_enabled FROM users WHERE id=?", [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ enabled: result[0]?.notification_enabled === 1 });
  });
});

////////////////////////////////////////////////////////////
/// ✅ TL ANNOUNCEMENT REPLIES
////////////////////////////////////////////////////////////

app.post("/tl-announcement-reply", verifyToken, (req, res) => {
  const { announcement_id, message } = req.body;
  const user_id = req.user.id;

  if (!announcement_id || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.query("SELECT name, empCode, profile_image, team_id FROM users WHERE id=?", [user_id], (err, users) => {
    if (err || !users.length) return res.status(500).json({ error: "User not found" });
    const user = users[0];

    db.query("SELECT team_id, title FROM tl_announcements WHERE id=?", [announcement_id], (errAnn, announcements) => {
      if (errAnn || !announcements.length) return res.status(404).json({ error: "Announcement not found" });
      const announcement = announcements[0];

      if (announcement.team_id != req.user.team_id) {
        return res.status(403).json({ error: "Unauthorized ❌" });
      }

      db.query(
        "INSERT INTO tl_announcement_replies (announcement_id, user_id, user_name, message) VALUES (?,?,?,?)",
        [announcement_id, user_id, user.name, message],
        (err2, result) => {
          if (err2) return res.status(500).json({ error: err2.message });

          console.log(`✅ Reply saved by ${user.name}`);
          res.json({ message: "Reply sent ✅", id: result.insertId });

          // ✅ Rule 2+3: Notify ALL TLs in same team (not LIMIT 1)
          // ✅ Rule 4: EMP (user_id) excluded via getTeamTLIds
          getTeamTLIds(announcement.team_id, user_id, (e4, tlIds) => {
            if (e4 || !tlIds.length) return;

            // Socket emit to each TL
            tlIds.forEach((tlId) => {
              io.to(tlId.toString()).emit("new_notification", {
                sender_name: user.name,
                emp_id: user.empCode,
                sender_profile: user.profile_image,
                message: message,
                announcement_id: announcement_id,
                announcement_title: announcement.title,
              });
              console.log(`✅ Socket emitted to TL ${tlId}`);
            });

            // FCM push to all TLs in same team
            getFcmTokens(tlIds, user_id, async (e5, tokens) => {
              if (!e5 && tokens.length > 0) {
                await sendPushNotification(tokens, "TEAM WORK TRACKER", `${user.name}: ${message}`, {
                  type: "reply",
                  sender_name: user.name || "",
                  message: message || "",
                  announcement_title: announcement.title || "",
                });
                console.log("✅ TL reply push sent to all TLs");
              }
            });
          });
        }
      );
    });
  });
});

app.get("/tl-announcement-replies", verifyToken, (req, res) => {
  const sql = `
    SELECT r.*, a.title as announcement_title
    FROM tl_announcement_replies r
    JOIN tl_announcements a ON r.announcement_id = a.id
    WHERE a.team_id = ?
    ORDER BY r.created_at DESC
    LIMIT 50
  `;

  db.query(sql, [req.user.team_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/tl-announcement-replies/:id", verifyToken, (req, res) => {
  const sql = `
    SELECT r.*
    FROM tl_announcement_replies r
    JOIN tl_announcements a ON r.announcement_id = a.id
    WHERE r.announcement_id = ? AND a.team_id = ?
    ORDER BY r.created_at ASC
  `;

  db.query(sql, [req.params.id, req.user.team_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

////////////////////////////////////////////////////////////
/// ADMIN ROUTES
////////////////////////////////////////////////////////////

app.get("/create-admin", async (req, res) => {
  try {
    const plainPassword = process.env.ADMIN_PASSWORD || "123456";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const sql = `
      UPDATE users
      SET password = ?, role = 'admin', status = 'active'
      WHERE email = ?
    `;

    db.query(sql, [hashedPassword, "admin@gmail.com"], (err, result) => {
      if (err) return res.status(500).send(err);

      if (result.affectedRows > 0) {
        return res.send("✅ Admin password updated with hashed password");
      }

      const insertSql = `
        INSERT INTO users (name, email, password, role, status)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        ["Admin", "admin@gmail.com", hashedPassword, "admin", "active"],
        (err2) => {
          if (err2) return res.status(500).send(err2);
          res.send("✅ Admin created with hashed password");
        }
      );
    });
  } catch (e) {
    console.log("❌ Create admin error:", e);
    res.status(500).json({ message: "Admin create failed ❌" });
  }
});

app.get("/pending-users", verifyToken, verifyAdmin, (req, res) => {
  db.query(
    `SELECT id, name, email, role, status, created_at, team_id
     FROM users
     WHERE LOWER(TRIM(role)) = 'tl'
       AND LOWER(TRIM(status)) = 'pending'
     ORDER BY id DESC`,
    (err, result) => {
      if (err) {
        console.log("❌ Pending users error:", err);
        return res.status(500).json({ error: err.message });
      }

      res.json(result);
    }
  );
});

app.get("/all-users", verifyToken, verifyAdmin, (req, res) => {
  const sql = `
    SELECT id, name, email, role, team_id, status, created_at
    FROM users
    WHERE role IN ('tl','employee')
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log("❌ All Users Error:", err);
      return res.status(500).json(err);
    }

    res.json(result);
  });
});

app.post("/approve-user", verifyToken, verifyAdmin, (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User id required ❌" });
  }

  db.query(
    `UPDATE users
     SET status = 'active'
     WHERE id = ?
       AND LOWER(TRIM(role)) = 'tl'
       AND LOWER(TRIM(status)) = 'pending'`,
    [id],
    (err, result) => {
      if (err) {
        console.log("❌ Approve user error:", err);
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Pending TL not found ❌" });
      }

      res.json({ message: "TL approved ✅" });
    }
  );
});

app.post("/reject-user", verifyToken, verifyAdmin, (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User id required ❌" });
  }

  db.query(
    `SELECT id, profile_image
     FROM users
     WHERE id = ?
       AND LOWER(TRIM(role)) = 'tl'
       AND LOWER(TRIM(status)) = 'pending'
     LIMIT 1`,
    [id],
    (findErr, rows) => {
      if (findErr) {
        console.log("❌ Find pending TL error:", findErr);
        return res.status(500).json({ error: findErr.message });
      }

      if (!rows.length) {
        return res.status(404).json({ message: "Pending TL not found ❌" });
      }

      const userId = rows[0].id;
      const profileImage = rows[0].profile_image || null;

      db.query("DELETE FROM user_tokens WHERE user_id = ?", [userId], (err1) => {
        if (err1) return res.status(500).json({ error: err1.message });

        db.query("DELETE FROM work_updates WHERE user_id = ?", [userId], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });

          db.query("DELETE FROM tl_announcement_reads WHERE user_id = ?", [userId], (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });

            db.query("DELETE FROM tl_announcement_replies WHERE user_id = ?", [userId], (err4) => {
              if (err4) return res.status(500).json({ error: err4.message });

              db.query("DELETE FROM users WHERE id = ?", [userId], (err5) => {
                if (err5) return res.status(500).json({ error: err5.message });

                if (profileImage) {
                  const profilePath = path.join(uploadDir, profileImage);
                  if (fs.existsSync(profilePath)) {
                    fs.unlink(profilePath, (unlinkErr) => {
                      if (unlinkErr) {
                        console.log("⚠️ Profile image delete warning:", unlinkErr.message);
                      }
                    });
                  }
                }

                res.json({ message: "Pending TL rejected and deleted ✅" });
              });
            });
          });
        });
      });
    }
  );
});

app.delete("/delete-account", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT empCode, profile_image FROM users WHERE id = ? LIMIT 1",
    [userId],
    (err, rows) => {
      if (err) {
        console.log("❌ Delete account error:", err);
        return res.status(500).json({ error: err.message });
      }

      if (!rows || !rows.length) {
        console.log("❌ No user found:", userId);
        return res.status(404).json({ message: "User not found ❌" });
      }

      const empCode = (rows[0].empCode || "").toString().trim();

      if (!empCode) {
        console.log("❌ empCode missing");
        return res.status(400).json({
          message: "EmpCode required before deleting account ❌"
        });
      }

      // Delete in sequence
      db.query("DELETE FROM user_tokens WHERE user_id = ?", [userId], (err1) => {
        if (err1) return res.status(500).json({ error: err1.message });

        db.query("DELETE FROM work_updates WHERE user_id = ?", [userId], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });

          db.query("DELETE FROM tl_announcement_reads WHERE user_id = ?", [userId], (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });

            db.query("DELETE FROM tl_announcement_replies WHERE user_id = ?", [userId], (err4) => {
              if (err4) return res.status(500).json({ error: err4.message });

              db.query("DELETE FROM team_messages WHERE sender_id = ?", [userId], (err5) => {
                if (err5) return res.status(500).json({ error: err5.message });

                db.query("DELETE FROM users WHERE id = ?", [userId], (err6) => {
                  if (err6) return res.status(500).json({ error: err6.message });

                  console.log("✅ User deleted successfully:", userId);
                  return res.json({ message: "Account deleted ✅" });
                });
              });
            });
          });
        });
      });
    }
  );
});

app.get("/mail-test", async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"TeamTracker" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "TeamTracker Mail Test",
      text: "Mail working ✅",
    });

    res.json({ message: "Mail sent ✅" });
  } catch (err) {
    console.log("❌ Mail test failed:", err.message);
    res.status(500).json({ message: "Mail failed ❌", error: err.message });
  }
});

////////////////////////////////////////////////////////////
/// HEALTH CHECK
////////////////////////////////////////////////////////////
app.get("/", (req, res) => {
  res.send("Backend Working 💪");
});

app.get("/db-test", (req, res) => {
  db.query(
    {
      sql: "SELECT 1 AS ok, DATABASE() AS db",
      timeout: 10000,
    },
    (err, result) => {
      if (err) {
        console.log("❌ DB TEST ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      return res.json({
        message: "DB working",
        result,
      });
    }
  );
});

////////////////////////////////////////////////////////////
/// DB INFO LOGGING
////////////////////////////////////////////////////////////
console.log(
  "Connected DB:",
  db.config.connectionConfig.database
);

console.log(
  "DB Host:",
  db.config.connectionConfig.host
);

db.query(
  { sql: "SELECT COUNT(*) as total FROM users", timeout: 10000 },
  (err, result) => {
    if (err) console.log("❌ Users count failed:", err.message);
    else console.log("✅ Total users:", result[0].total);
  }
);

////////////////////////////////////////////////////////////
/// ✅ SERVER START
////////////////////////////////////////////////////////////
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});