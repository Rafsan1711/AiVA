import dotenv from "dotenv";
import fetch from "node-fetch";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onChildAdded, set, remove, update, get, child } from "firebase/database";

dotenv.config();

// Firebase config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// HuggingFace query
async function query(data) {
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await response.json();
  return result;
}

// Listen for pending jobs
const pendingRef = ref(db, "pending");
onChildAdded(pendingRef, async (snap) => {
  const uid = snap.key;
  const jobs = snap.val();
  if (!jobs) return;

  for (const [jobId, job] of Object.entries(jobs)) {
    try {
      const payload = {
        messages: [{ role: "system", content: "You are AiVA, a concise helpful assistant." }]
          .concat(job.text ? [{ role: "user", content: job.text }] : []),
        model: job.model || "openai/gpt-oss-120b:together",
      };
      const resp = await query(payload);
      const replyText = resp?.result?.output?.[0]?.content || "";

      // Save reply to chat
      await set(ref(db, `chats/${uid}/${job.chatId}/${job.messageId}/aiReply`), {
        senderId: "aiva_bot",
        senderName: "AiVA",
        text: replyText,
        timestamp: Date.now(),
        status: "Sent",
        source: "worker",
      });

      // Remove job
      await remove(ref(db, `pending/${uid}/${jobId}`));
      console.log(`Job ${jobId} processed for user ${uid}`);
    } catch (err) {
      console.error(`Error processing job ${jobId} for user ${uid}:`, err);
      // increment attempt counter
      const attempts = (job.attempts || 0) + 1;
      await update(ref(db, `pending/${uid}/${jobId}`), { attempts });
    }
  }
});

console.log("AiVA Worker running, listening to pending jobs...");
