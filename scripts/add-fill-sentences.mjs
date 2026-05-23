/**
 * add-fill-sentences.mjs
 * One-time script — adds `fill_sentence` to every idiom in your JSON files.
 *
 * HOW TO USE:
 *   1. Make sure VITE_GEMINI_API_KEY is in your .env file
 *   2. Run from project root:  npm run add-fill-sentences
 *
 * It rewrites each week_XX_idioms.json in place, adding a `fill_sentence`
 * field to every idiom. Safe to re-run — already-filled idioms are skipped.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, "../src/data/idioms")

// Node scripts use process.env directly (not import.meta.env)
// Works with both:  node --env-file=.env  OR  dotenv loaded manually
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
const RETRY_WAIT_MS = 20000  // 20s on rate limit hit

// ── helpers ───────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

async function generateFillSentence(idiom, meaning_en) {
    const prompt = `You are writing fill-in-the-blank exercises for English idiom learners (Vietnamese students, intermediate level).

Given this idiom: "${idiom}"
Meaning: "${meaning_en}"

Write a short paragraph of 2-5 sentences that:
1. Sets up a clear, relatable real-life situation (work, school, daily life, travel, health)
2. Uses the idiom naturally in ONE of the sentences
3. Makes it IMPOSSIBLE to substitute any other idiom — the context must point to only this idiom
4. The idiom must appear EXACTLY as written: "${idiom}"
5. The surrounding sentences give enough context that a learner can infer the meaning

Return ONLY a valid JSON object, no markdown, no backticks, no explanation:
{
  "fill_sentence": "the full 2-5 sentence paragraph here"
}`

    let attempts = 0

    while (attempts < MAX_RETRIES) {
        try {
            const result = await model.generateContent(prompt)
            const text = result.response.text().trim()
            const clean = text.replace(/```json|```/g, "").trim()

            let parsed
            try {
                parsed = JSON.parse(clean)
            } catch {
                // Try to extract JSON manually if model added extra text
                const match = clean.match(/\{[\s\S]*\}/)
                if (!match) throw new Error("Could not parse JSON: " + text.slice(0, 150))
                parsed = JSON.parse(match[0])
            }

            if (!parsed.fill_sentence || typeof parsed.fill_sentence !== "string") {
                throw new Error("fill_sentence field missing from response")
            }

            return parsed.fill_sentence

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
}

function findJsonFiles(dir) {
    const results = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) results.push(...findJsonFiles(full))
        else if (entry.isFile() && entry.name.endsWith(".json")) results.push(full)
    }
    return results.sort()  // process in order: week_01, week_02, ...
}

async function processFile(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    const isNewFormat = !Array.isArray(raw)
    const idioms = isNewFormat ? raw.idioms : raw

    if (!idioms || idioms.length === 0) {
        console.log(`  ⚠️  No idioms found — skipping`)
        return 0
    }

    const untagged = idioms.filter(i => !i.fill_sentence)

    if (untagged.length === 0) {
        console.log(`  ✅  Already complete — skipping`)
        return 0
    }

    console.log(`  🤖  Generating for ${untagged.length} idiom(s)...`)

    let successCount = 0

    for (let i = 0; i < untagged.length; i++) {
        const idiom = untagged[i]

        process.stdout.write(`     [${i + 1}/${untagged.length}] "${idiom.idiom}" ... `)

        try {
            idiom.fill_sentence = await generateFillSentence(idiom.idiom, idiom.meaning_en)
            console.log("✓")
            successCount++

            // Save after every successful generation so progress isn't lost
            // if the script is interrupted mid-file
            const output = isNewFormat ? { ...raw, idioms } : idioms
            fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8")

        } catch (err) {
            console.log("✗")
            console.error(`     ❌  Failed: ${err.message}`)
        }

        // Always wait between requests (even after failures) to respect rate limit
        if (i < untagged.length - 1) {
            await sleep(DELAY_MS)
        }
    }

    if (successCount > 0) {
        console.log(`  💾  Saved ${successCount}/${untagged.length} idioms in ${path.basename(filePath)}\n`)
    }

    return successCount
}

// ── main ──────────────────────────────────────────────────────────────────

async function main() {
    console.log("✏️   Fill Sentence Generator\n")
    console.log(`📂  Scanning: ${DATA_DIR}\n`)

    const files = findJsonFiles(DATA_DIR)

    if (files.length === 0) {
        console.error("❌  No JSON files found in", DATA_DIR)
        process.exit(1)
    }

    console.log(`Found ${files.length} file(s)\n`)
    console.log("⏱️   Delay between requests: " + DELAY_MS / 1000 + "s (Gemini free tier: 15 req/min)\n")
    console.log("─".repeat(50) + "\n")

    let totalSuccess = 0
    let totalSkipped = 0

    for (const file of files) {
        const relPath = path.relative(process.cwd(), file)
        console.log(`📄  ${relPath}`)

        try {
            const count = await processFile(file)
            if (count === 0) totalSkipped++
            else totalSuccess += count
        } catch (err) {
            console.error(`  ❌  Error: ${err.message}\n`)
        }

        // Extra pause between files to give the quota a breather
        await sleep(1000)
    }

    console.log("\n" + "─".repeat(50))
    console.log(`\n✅  Done!`)
    console.log(`   Generated: ${totalSuccess} fill_sentence(s)`)
    console.log(`   Skipped (already done): ${totalSkipped} file(s)`)
    console.log(`\n👉  Review the fill_sentence fields, then commit your JSON files.\n`)
}

main()
