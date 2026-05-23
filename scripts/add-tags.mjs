/**
 * add-tags.mjs
 * One-time script — run once to add `tags` to every idiom in your JSON files.
 *
 * HOW TO USE:
 *   1. Make sure VITE_GEMINI_API_KEY is in your .env file
 *   2. Run from project root:  node --env-file=.env scripts/add-tags.mjs
 *
 * It will rewrite each week_XX_idioms.json in place, adding a `tags` array
 * to every idiom object. Safe to re-run — already-tagged idioms are skipped.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, "../src/data/idioms")
const API_KEY = process.env.VITE_GEMINI_API_KEY

if (!API_KEY) {
    console.error("❌  Missing VITE_GEMINI_API_KEY in your .env file.")
    process.exit(1)
}

const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
})

// Gemini free tier = 15 requests per minute
// 5 seconds between requests = 12 req/min → safely under the limit
const DELAY_MS = 5000
const MAX_RETRIES = 3
const RETRY_WAIT_MS = 20000

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

// ── helpers ───────────────────────────────────────────────────────────────

async function askGemini(prompt) {
    let attempts = 0
    while (attempts < MAX_RETRIES) {
        try {
            const result = await model.generateContent(prompt)
            const text = result.response.text().trim()
            return text
        } catch (err) {
            const msg = err.message || ""
            const isRateLimit = msg.includes("429") ||
                msg.toLowerCase().includes("quota") ||
                msg.toLowerCase().includes("rate") ||
                msg.toLowerCase().includes("limit exceeded")

            if (isRateLimit && attempts < MAX_RETRIES - 1) {
                attempts++
                console.warn(`     ⚠️  Rate limited. Waiting ${RETRY_WAIT_MS / 1000}s before retry ${attempts}/${MAX_RETRIES - 1}...`)
                await sleep(RETRY_WAIT_MS)
            } else {
                throw err
            }
        }
    }
    throw new Error("Failed after maximum retries due to rate limiting.")
}

function findJsonFiles(dir) {
    const results = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) results.push(...findJsonFiles(full))
        else if (entry.isFile() && entry.name.endsWith(".json")) results.push(full)
    }
    return results.sort() // process in order: week_01, week_02, ...
}

// ── main ──────────────────────────────────────────────────────────────────

async function tagFile(filePath) {
    const raw = fs.readFileSync(filePath, "utf8")
    const data = JSON.parse(raw)

    const idioms = data.idioms ?? data   // support both new format {title, conversation, idioms} and old []
    const isNewFormat = !Array.isArray(data)

    // Filter only untagged idioms to avoid wasting API calls on re-runs
    const untagged = idioms.filter(i => !i.tags || i.tags.length === 0)
    if (untagged.length === 0) {
        console.log(`  ✅  All idioms already tagged — skipping ${path.basename(filePath)}`)
        return
    }

    console.log(`  🤖  Tagging ${untagged.length} idioms in ${path.basename(path.dirname(filePath))}/${path.basename(filePath)} …`)

    const prompt = `You are a vocabulary tagging assistant for an English learning app.

Given these idioms, return a JSON array where each element is:
{ "id": "<idiom id>", "tags": ["tag1", "tag2", "tag3"] }

Tag rules:
- 3 to 5 tags per idiom
- Tags should be lowercase single words or short 2-word phrases
- Choose from these semantic categories (use the most fitting ones):
  EMOTION: frustration, happiness, worry, surprise, anger, embarrassment
  SITUATION: money, shopping, health, food, travel, work, social, conflict, negotiation, time-pressure
  MEANING-TYPE: impossibility, delay, difficulty, agreement, refusal, compliment, warning, advice
  REGISTER: formal, casual, polite, sarcastic
- Add 1-2 "meaning cluster" tags that group idioms with similar concepts
  e.g. idioms about being stuck → "being-stuck", idioms about cost → "cost-and-price"

Idioms to tag:
${JSON.stringify(untagged.map(i => ({ id: i.id, idiom: i.idiom, meaning_en: i.meaning_en })), null, 2)}

Return ONLY a valid JSON array. No markdown, no backticks, no explanation.`

    let text
    try {
        text = await askGemini(prompt)
    } catch (err) {
        console.error(`  ❌  API request failed for ${filePath}:`, err.message)
        return
    }

    const clean = text.replace(/```json|```/g, "").trim()

    let tagMap
    try {
        let parsed
        try {
            parsed = JSON.parse(clean)
        } catch {
            const match = clean.match(/\[[\s\S]*\]/)
            if (!match) throw new Error("Could not parse JSON array")
            parsed = JSON.parse(match[0])
        }
        tagMap = Object.fromEntries(parsed.map(x => [x.id, x.tags]))
    } catch (e) {
        console.error(`  ❌  Failed to parse tags for ${filePath}:`, e.message)
        console.error("  Raw response:", text.slice(0, 300))
        return
    }

    // Merge tags back into idiom objects
    for (const idiom of idioms) {
        if (tagMap[idiom.id]) {
            idiom.tags = tagMap[idiom.id]
        }
    }

    // Write back
    const output = isNewFormat
        ? { ...data, idioms }
        : idioms

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf8")
    console.log(`  💾  Saved ${path.basename(filePath)}`)
}

async function main() {
    console.log("🏷️   Idiom Tagger — scanning", DATA_DIR, "\n")

    const files = findJsonFiles(DATA_DIR)
    console.log(`Found ${files.length} JSON file(s)\n`)

    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
            await tagFile(file)
        } catch (err) {
            console.error(`  ❌  Error processing ${file}:`, err.message)
        }

        // Wait between files to give the quota a breather
        if (i < files.length - 1) {
            await sleep(DELAY_MS)
        }
    }

    console.log("\n✅  Done! All files processed.")
    console.log("👉  Commit the updated JSON files and you're good to go.")
}

main()
