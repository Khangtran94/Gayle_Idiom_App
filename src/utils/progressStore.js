// progressStore.js
// Handles all progress tracking: localStorage cache + Firebase Firestore sync
//
// HOW TO USE:
//   import { recordAnswer, getStats, generateSyncCode, loadFromCode, getSyncCode } from './progressStore'
//
// FIREBASE SETUP REQUIRED in your project:
//   npm install firebase
//   Then replace the firebaseConfig below with your actual Firebase project config.

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

// ─── REPLACE THIS WITH YOUR FIREBASE CONFIG ───────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyBwGqP3N-Cam_XKs5yfpjKRIkH79rjoJzI",
    authDomain: "gayle-idiom-firebase.firebaseapp.com",
    projectId: "gayle-idiom-firebase",
    storageBucket: "gayle-idiom-firebase.firebasestorage.app",
    messagingSenderId: "330912087221",
    appId: "1:330912087221:web:7a144f4f9276d4ef8452fc",
    measurementId: "G-CDZB62Q524"
};
// ──────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const COLLECTION = "progress"
const LOCAL_STATS_KEY = "gayle_idiom_stats"
const LOCAL_CODE_KEY = "gayle_sync_code"

// ── Sync Code ─────────────────────────────────────────────────────────────────

const ADJECTIVES = [
    "sunny", "brave", "calm", "cold", "dark", "fast", "free", "glad",
    "gold", "good", "cool", "kind", "lazy", "loud", "mild", "neat",
    "nice", "pink", "pure", "rare", "rich", "safe", "slim", "soft",
    "tall", "tiny", "warm", "wild", "wise", "young"
]
const NOUNS = [
    "apple", "beach", "bread", "brook", "cloud", "coral", "creek",
    "daisy", "eagle", "flame", "frost", "grape", "grove", "honey",
    "ivory", "jewel", "lemon", "maple", "olive", "panda", "pearl",
    "poppy", "river", "robin", "solar", "stone", "storm", "sugar",
    "tiger", "tulip", "viola", "water", "wheat", "zebra"
]

function makeCode() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
    const num = Math.floor(Math.random() * 90) + 10
    return `${adj}-${noun}-${num}`
}

/** Returns the current sync code, generating one if needed */
export function getSyncCode() {
    let code = localStorage.getItem(LOCAL_CODE_KEY)
    if (!code) {
        code = makeCode()
        localStorage.setItem(LOCAL_CODE_KEY, code)
    }
    return code
}

// ── Local Stats ───────────────────────────────────────────────────────────────

/** Returns all stats from localStorage: { idiomId: { correct, wrong, lastSeen } } */
export function getStats() {
    try {
        const raw = localStorage.getItem(LOCAL_STATS_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

function saveStatsLocally(stats) {
    localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats))
}

/**
 * Records the result of one answered question.
 * Call this every time a question is answered in GameScreen.
 * Does NOT sync to Firebase — call flushToFirebase() at end of session.
 */
export function recordAnswer(idiomId, wasCorrect) {
    const stats = getStats()
    const existing = stats[idiomId] || { correct: 0, wrong: 0, lastSeen: 0 }
    stats[idiomId] = {
        correct: existing.correct + (wasCorrect ? 1 : 0),
        wrong: existing.wrong + (wasCorrect ? 0 : 1),
        lastSeen: Date.now(),
    }
    saveStatsLocally(stats)
}

/**
 * Returns only idioms where error rate > 50% and answered at least once.
 * Returns array of idiom IDs.
 */
export function getWeakIdiomIds() {
    const stats = getStats()
    return Object.entries(stats)
        .filter(([, s]) => {
            const total = s.correct + s.wrong
            if (total === 0) return false
            return s.wrong / total > 0.5
        })
        .map(([id]) => id)
}

/**
 * Returns a weight multiplier for an idiom (used for spaced repetition).
 * Idioms with higher error rates get higher weight (appear more in pool).
 * Range: 1–5
 */
export function getIdiomWeight(idiomId) {
    const stats = getStats()
    const s = stats[idiomId]
    if (!s) return 1
    const total = s.correct + s.wrong
    if (total === 0) return 1
    const errorRate = s.wrong / total
    // 0% error → weight 1, 100% error → weight 5
    return Math.round(1 + errorRate * 4)
}

// ── Firebase Sync ─────────────────────────────────────────────────────────────

/**
 * Writes the current local stats to Firebase under the current sync code.
 * Call this at the end of a game session (EndScreen).
 */
export async function flushToFirebase() {
    const code = getSyncCode()
    const stats = getStats()
    try {
        const ref = doc(db, COLLECTION, code)
        await setDoc(ref, { stats, updatedAt: Date.now() }, { merge: true })
        return { ok: true }
    } catch (err) {
        console.error("Firebase flush failed:", err)
        return { ok: false, error: err.message }
    }
}

/**
 * Loads stats from Firebase using the given sync code.
 * Merges remote stats with local stats, keeping the higher counts.
 * Returns { ok, error? }
 */
export async function loadFromCode(code) {
    const trimmed = code.trim().toLowerCase()
    if (!trimmed) return { ok: false, error: "Empty code" }
    try {
        const ref = doc(db, COLLECTION, trimmed)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
            return { ok: false, error: "No data found for that code. Check the code and try again." }
        }
        const remote = snap.data().stats || {}
        const local = getStats()

        // Merge: for each idiom, take the max of local and remote counts
        const merged = { ...local }
        for (const [id, remoteVal] of Object.entries(remote)) {
            const localVal = local[id] || { correct: 0, wrong: 0, lastSeen: 0 }
            merged[id] = {
                correct: Math.max(localVal.correct, remoteVal.correct),
                wrong: Math.max(localVal.wrong, remoteVal.wrong),
                lastSeen: Math.max(localVal.lastSeen, remoteVal.lastSeen),
            }
        }

        saveStatsLocally(merged)

        // Also update the sync code to this one
        localStorage.setItem(LOCAL_CODE_KEY, trimmed)

        return { ok: true }
    } catch (err) {
        console.error("Firebase load failed:", err)
        return { ok: false, error: "Connection error. Check your internet and try again." }
    }
}

/**
 * Checks if Firebase is properly configured (i.e. not still using placeholder values).
 * Useful for showing a warning in dev.
 */
export function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY"
}