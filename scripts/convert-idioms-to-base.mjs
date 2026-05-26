/**
 * convert-idioms-to-base.mjs
 * Script to convert the `idiom` field of all idioms in JSON files to their base/bare infinitive form.
 *
 * HOW TO USE:
 *   1. Make sure VITE_GEMINI_API_KEY is in your .env file
 *   2. Run from project root:
 *      node --env-file=.env scripts/convert-idioms-to-base.mjs
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

// Gemini free tier limits
const DELAY_MS = 5000
const MAX_RETRIES = 3
const RETRY_WAIT_MS = 20000

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

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
    return results.sort()
}

async function processFile(filePath) {
    const raw = fs.readFileSync(filePath, "utf8")
    const data = JSON.parse(raw)

    const isNewFormat = !Array.isArray(data)
    const idioms = isNewFormat ? data.idioms : data
    if (!idioms || idioms.length === 0) {
        console.log(`  ⚠️  No idioms found — skipping ${path.basename(filePath)}`)
        return
    }

    console.log(`  🤖  Converting idioms in ${path.basename(path.dirname(filePath))}/${path.basename(filePath)} to base form…`)

    const prompt = `You are a lexicographer assistant for an English idiom learning app.
Given a list of idioms (which were extracted from conversations and might be in conjugated, inflected, or specific grammatical tenses/forms), you must convert each idiom into its standard dictionary "bare infinitive" (base/base-inf) form.

Examples of conversions:
- "checking in" -> "check in"
- "pull up your reservation" -> "pull up" or "pull up one's reservation"
- "reeks of" -> "reek of"
- "earning points" -> "earn points"
- "making a racket" -> "make a racket"
- "runs small" -> "run small"
- "marked down" -> "mark down"
- "try them on" -> "try something on" or "try on"
- "not crazy about" -> "not be crazy about" or "not crazy about"
- "a little snug" -> "snug" or "be snug" or "a little snug" (keep as "snug" or "a little snug")

Please convert the following list of idioms. Keep any nouns/pronouns generalized (e.g. use "one's" or "someone's" where appropriate).

Idioms:
${JSON.stringify(idioms.map(i => ({ id: i.id, idiom: i.idiom, context: i.context })), null, 2)}

Return ONLY a valid JSON array where each object has:
{ "id": "<idiom id>", "bare_idiom": "<the bare infinitive / base form of the idiom>" }`

    let text
    try {
        text = await askGemini(prompt)
    } catch (err) {
        console.error(`  ❌  API request failed for ${filePath}:`, err.message)
        return
    }

    const clean = text.replace(/```json|```/g, "").trim()

    let conversions
    try {
        let parsed
        try {
            parsed = JSON.parse(clean)
        } catch {
            const match = clean.match(/\[[\s\S]*\]/)
            if (!match) throw new Error("Could not parse JSON array")
            parsed = JSON.parse(match[0])
        }
        conversions = Object.fromEntries(parsed.map(x => [x.id, x.bare_idiom]))
    } catch (e) {
        console.error(`  ❌  Failed to parse response for ${filePath}:`, e.message)
        console.error("  Raw response:", text.slice(0, 300))
        return
    }

    let modified = false
    for (const item of idioms) {
        const baseForm = conversions[item.id]
        if (baseForm && baseForm !== item.idiom) {
            console.log(`     🔄  "${item.idiom}" -> "${baseForm}"`)
            item.idiom = baseForm
            modified = true
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")
        console.log(`  💾  Saved updated ${path.basename(filePath)}`)
    } else {
        console.log(`  ✅  No changes needed for ${path.basename(filePath)}`)
    }
}

async function main() {
    console.log("📖   Idiom Base Form Converter — scanning", DATA_DIR, "\n")

    const files = findJsonFiles(DATA_DIR)
    console.log(`Found ${files.length} JSON file(s)\n`)
    console.log(`⏱️   Delay between requests: ${DELAY_MS / 1000}s\n`)
    console.log("─".repeat(50) + "\n")

    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
            await processFile(file)
        } catch (err) {
            console.error(`  ❌  Error processing ${file}:`, err.message)
        }

        if (i < files.length - 1) {
            await sleep(DELAY_MS)
        }
    }

    console.log("\n✅  Done! All existing idioms converted to base form.")
    console.log("👉  Please run: npm run rehighlight  to update conversation markings.")
}

main()
