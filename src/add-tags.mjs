/**
 * add-tags.mjs
 * One-time script — run once to add `tags` to every idiom in your JSON files.
 *
 * HOW TO USE:
 *   1. Set your API key:  export ANTHROPIC_API_KEY=sk-ant-...
 *   2. Run from project root:  node scripts/add-tags.mjs
 *
 * It will rewrite each week_XX_idioms.json in place, adding a `tags` array
 * to every idiom object. Safe to re-run — already-tagged idioms are skipped.
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, "../src/data/idioms")
const API_KEY = process.env.ANTHROPIC_API_KEY

if (!API_KEY) {
    console.error("❌  Missing ANTHROPIC_API_KEY environment variable.")
    process.exit(1)
}

// ── helpers ───────────────────────────────────────────────────────────────

async function askClaude(prompt) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",   // cheapest model — perfect for tagging
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }],
        }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return data.content[0].text.trim()
}

function findJsonFiles(dir) {
    const results = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) results.push(...findJsonFiles(full))
        else if (entry.isFile() && entry.name.endsWith(".json")) results.push(full)
    }
    return results
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

Return ONLY a JSON array. No markdown, no backticks, no explanation.`

    const text = await askClaude(prompt)
    const clean = text.replace(/```json|```/g, "").trim()

    let tagMap
    try {
        const arr = JSON.parse(clean)
        tagMap = Object.fromEntries(arr.map(x => [x.id, x.tags]))
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

    for (const file of files) {
        try {
            await tagFile(file)
            // Small delay to be kind to the API rate limits
            await new Promise(r => setTimeout(r, 300))
        } catch (err) {
            console.error(`  ❌  Error processing ${file}:`, err.message)
        }
    }

    console.log("\n✅  Done! All files processed.")
    console.log("👉  Commit the updated JSON files and you're good to go.")
}

main()
