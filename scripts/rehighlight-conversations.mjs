/**
 * rehighlight-conversations.mjs
 * Utility script to automatically bold and underline idioms in your conversations.
 *
 * HOW TO USE:
 *   1. Make sure VITE_GEMINI_API_KEY is in your .env file
 *   2. Run from project root:
 *      - Re-highlight ALL weeks:
 *        npm run rehighlight
 *      - Re-highlight a specific week (e.g. Week 19):
 *        node --env-file=.env scripts/rehighlight-conversations.mjs 19
 *
 * It will rewrite the target week's json file in place, updating the `conversation`
 * string with <u><b>...</b></u> tags around matching idioms.
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

async function highlightFile(filePath) {
    const raw = fs.readFileSync(filePath, "utf8")
    const data = JSON.parse(raw)

    const isNewFormat = !Array.isArray(data)
    if (!isNewFormat || !data.conversation) {
        console.log(`  ⚠️  Skipping ${path.basename(filePath)} — old format or no conversation field.`)
        return
    }

    const idioms = data.idioms ?? []
    if (idioms.length === 0) {
        console.log(`  ⚠️  Skipping ${path.basename(filePath)} — no idioms list.`)
        return
    }

    // Get list of idiom phrases
    const idiomsList = idioms.map(i => i.idiom)

    // Strip existing <u>, </u>, <b>, </b> tags from the conversation to start fresh
    const cleanConversation = data.conversation.replace(/<\/?(u|b)>/g, "")

    console.log(`  🤖  Re-highlighting conversation in ${path.basename(path.dirname(filePath))}/${path.basename(filePath)} …`)

    const prompt = `You are a helpful assistant for an English learning app.

Given a conversation text and a list of idioms, you need to identify all occurrences of those idioms in the conversation and highlight them by wrapping them EXACTLY in <u><b>idiom</b></u> tags.

Idiom List:
${JSON.stringify(idiomsList, null, 2)}

Clean Conversation:
${cleanConversation}

Rules:
1. Locate every occurrence of the listed idioms in the conversation.
2. An idiom might be used with inflections or variations in the conversation text (for example: "worth one's while" might appear as "worth my while" or "worth your while", "pull up your reservation" might be shortened or inflected to "pull up", "make a racket" might appear as "making a racket" or "made a racket", "checking in" might be "check in" or "checking in", "reeks of" might be "reeks of" or "reeked of"). You MUST identify and wrap these inflections/variations in the tags correctly!
3. Only wrap the idiom part in the tags (e.g., wrap "pull up" or "worth my while"). Do not wrap extra punctuation or words. Always use EXACTLY <u><b> as the opening tags and </b></u> as the closing tags (close bold first, then underline, i.e., <u><b>idiom</b></u>).
4. Do NOT change any other text, characters, punctuation, speaker prefixes (like "Chad:", "Maria:"), stage directions (like "(ten minutes later)"), or newlines.
5. Return ONLY a valid JSON object with a single "conversation" field containing the newly formatted/highlighted conversation text. No explanation, no markdown, no backticks.

Expected JSON output format:
{
  "conversation": "highlighted conversation here..."
}`

    let text
    try {
        text = await askGemini(prompt)
    } catch (err) {
        console.error(`  ❌  API request failed for ${filePath}:`, err.message)
        return
    }

    const clean = text.replace(/```json|```/g, "").trim()

    let highlightedConversation
    try {
        let parsed
        try {
            parsed = JSON.parse(clean)
        } catch {
            const match = clean.match(/\{[\s\S]*\}/)
            if (!match) throw new Error("Could not parse JSON response")
            parsed = JSON.parse(match[0])
        }
        highlightedConversation = parsed.conversation
    } catch (e) {
        console.error(`  ❌  Failed to parse response for ${filePath}:`, e.message)
        console.error("  Raw response:", text.slice(0, 300))
        return
    }

    if (!highlightedConversation) {
        console.error(`  ❌  Response did not contain 'conversation' field for ${filePath}`)
        return
    }

    // Update conversation in the data object
    data.conversation = highlightedConversation

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")
    console.log(`  💾  Saved changes to ${path.basename(filePath)}`)
}

async function main() {
    console.log("✍️   Conversation Re-highlighter — scanning", DATA_DIR, "\n")

    const args = process.argv.slice(2)
    const targetWeekArg = args[0] // e.g., "19" or "week_19"

    let files = findJsonFiles(DATA_DIR)

    if (targetWeekArg) {
        const targetStr = targetWeekArg.toLowerCase()
        const weekNum = targetStr.replace(/[^0-9]/g, "")
        if (weekNum) {
            const paddedWeek = `week_${weekNum.padStart(2, "0")}`
            files = files.filter(f => f.includes(paddedWeek))
            if (files.length === 0) {
                console.error(`❌  No JSON file found matching week "${targetWeekArg}" (expected path containing ${paddedWeek})`)
                process.exit(1)
            }
            console.log(`🎯  Filtering for: ${paddedWeek} (${files.length} file found)\n`)
        }
    } else {
        console.log(`Found ${files.length} JSON file(s) in total. Processing all.\n`)
    }

    console.log(`⏱️   Delay between requests: ${DELAY_MS / 1000}s\n`)
    console.log("─".repeat(50) + "\n")

    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
            await highlightFile(file)
        } catch (err) {
            console.error(`  ❌  Error processing ${file}:`, err.message)
        }

        // Wait between files to respect rate limits
        if (i < files.length - 1) {
            await sleep(DELAY_MS)
        }
    }

    console.log("\n✅  Done! Conversations successfully updated.")
}

main()
