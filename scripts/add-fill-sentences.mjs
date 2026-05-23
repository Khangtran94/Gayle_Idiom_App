// scripts/add-fill-sentences.mjs
import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "fs"
import path from "path"

const apiKey = process.env.VITE_GEMINI_API_KEY
if (!apiKey) {
    console.error("Error: VITE_GEMINI_API_KEY environment variable is not set.")
    process.exit(1)
}

const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
})

async function generateFillSentence(idiom, meaning_en) {
    const prompt = `You are writing fill-in-the-blank exercises for English idiom learners.

Given this idiom: "${idiom}"
Meaning: "${meaning_en}"

Write a short paragraph of 2-5 sentences that:
1. Sets up a clear real-life situation
2. Uses the idiom naturally in one of the sentences  
3. Makes it IMPOSSIBLE to substitute any other idiom as the answer
4. The idiom must appear EXACTLY as written: "${idiom}"
5. The surrounding sentences should make the meaning inferrable from context

Return ONLY a JSON object, no markdown, no explanation:
{
  "fill_sentence": "the full 2-5 sentence paragraph"
}`

    let retries = 3
    while (retries > 0) {
        try {
            const result = await model.generateContent(prompt)
            const text = result.response.text().trim()
            const clean = text.replace(/```json|```/g, "").trim()
            const parsed = JSON.parse(clean)
            return parsed.fill_sentence
        } catch (err) {
            const errMsg = err.message || ""
            if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("limit exceeded")) {
                console.warn(`  ⚠ Rate limited. Retrying in 17 seconds...`)
                await new Promise(resolve => setTimeout(resolve, 17000))
                retries--
            } else {
                throw err
            }
        }
    }
    throw new Error("Failed after maximum retries due to rate limiting.")
}

async function processFile(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    const idioms = Array.isArray(raw) ? raw : raw.idioms

    let changed = false

    for (const idiom of idioms) {
        // Skip if already has fill_sentence
        if (idiom.fill_sentence) continue

        try {
            console.log(`  generating: "${idiom.idiom}"`)
            idiom.fill_sentence = await generateFillSentence(
                idiom.idiom,
                idiom.meaning_en
            )
            changed = true

            // Delay to avoid rate limiting (Gemini free tier has a 15 RPM limit)
            await new Promise(r => setTimeout(r, 4200))
        } catch (err) {
            console.error(`  ✗ failed for "${idiom.idiom}":`, err.message)
        }
    }

    if (changed) {
        if (Array.isArray(raw)) {
            fs.writeFileSync(filePath, JSON.stringify(idioms, null, 2))
        } else {
            raw.idioms = idioms
            fs.writeFileSync(filePath, JSON.stringify(raw, null, 2))
        }
        console.log(`  ✅ saved ${filePath}`)
    }
}

async function main() {
    const idiomsDir = path.join("src", "data", "idioms")
    let files = []
    if (fs.existsSync(idiomsDir)) {
        files = fs.readdirSync(idiomsDir, { recursive: true })
            .filter(file => file.endsWith(".json"))
            .map(file => path.join(idiomsDir, file))
    }
    console.log(`Found ${files.length} files\n`)

    for (const file of files) {
        console.log(`Processing: ${file}`)
        await processFile(file)
    }

    console.log("\n✅ All done!")
}

main()