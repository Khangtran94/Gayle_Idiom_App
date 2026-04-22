import { useState } from "react"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export default function AdminUpload({ onIdiomsExtracted }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [extractedData, setExtractedData] = useState(null)
    const [weekNumber, setWeekNumber] = useState("")

    function handleFileChange(e) {
        const selected = e.target.files[0]
        if (!selected) return
        setFile(selected)
        setExtractedData(null)
        setError(null)

        if (selected.type.startsWith("image/")) {
            const reader = new FileReader()
            reader.onload = () => setPreview(reader.result)
            reader.readAsDataURL(selected)
        } else {
            setPreview(null)
        }
    }

    async function handleExtract() {
        if (!file || !weekNumber) {
            setError("Please select a file and enter the week number.")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.readAsDataURL(file)
                reader.onload = () => resolve(reader.result.split(",")[1])
                reader.onerror = () => reject(new Error("Failed to read file"))
            })

            const mediaType = file.type
            const isImage = mediaType.startsWith("image/")
            const isPDF = mediaType === "application/pdf"

            if (!isImage && !isPDF) {
                setError("Please upload an image (jpg, png) or PDF file.")
                setLoading(false)
                return
            }

            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })

            const prompt = `This is a paper from an English class. It contains a conversation with idioms.

Return a single JSON object ONLY — no explanation, no markdown, no backticks.

Format:
{
  "title": "the topic/title of the conversation (e.g. Going Shopping)",
  "conversation": "the full conversation text, each line separated by \\n. IMPORTANT: every idiom must be wrapped EXACTLY like this: <u><b>idiom</b></u>. Always include BOTH opening AND closing tags. Never omit closing tags."
  "idioms": [
    {
      "id": "w${weekNumber.padStart(2, "0")}_01",
      "idiom": "the idiom phrase",
      "meaning_en": "clear English explanation",
      "meaning_vi": "giải thích bằng tiếng Việt",
      "example": "a natural example sentence",
      "context": "original sentence from the paper",
      "week": ${parseInt(weekNumber)}
    }
  ]
}

Rules:
- Identify all idioms in the conversation.
- Wrap each idiom EXACTLY as: <u><b>idiom</b></u>
- Always close tags in the correct order: </b></u>
- Do NOT repeat opening tags
- Do NOT leave tags unclosed
- Keep the conversation natural and unchanged except for formatting idioms.
- Number idioms sequentially.

Return ONLY the JSON object, nothing else. No markdown, no backticks.`;

            const imagePart = {
                inlineData: {
                    data: base64,
                    mimeType: mediaType
                }
            }

            const result = await model.generateContent([prompt, imagePart])
            const text = result.response.text().trim()
            console.log("Raw Gemini response:", text)

            const clean = text.replace(/```json|```/g, "").trim()

            let parsed
            try {
                parsed = JSON.parse(clean)
            } catch (parseErr) {
                console.error("JSON parse failed:", parseErr)
                setError("AI returned invalid format. Please try again.")
                return
            }

            // Make sure idioms array exists
            if (!parsed.idioms || parsed.idioms.length === 0) {
                setError("No idioms found. Try a clearer image.")
                return
            }

            setExtractedData(parsed)

        } catch (err) {
            console.error("Full error:", err)
            setError("Something went wrong: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    function handleConfirm() {
        if (extractedData) {
            onIdiomsExtracted(extractedData, parseInt(weekNumber))
        }
    }

    function handleExportJSON() {
        const blob = new Blob([JSON.stringify(extractedData, null, 2)], {
            type: "application/json"
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `week_${weekNumber.padStart(2, "0")}_idioms.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-indigo-700 mb-1">📤 Upload Gayle's Paper</h2>
                <p className="text-gray-500 text-sm mb-6">
                    Upload a photo or PDF — AI will extract the idioms automatically and export as JSON
                </p>

                {/* Week number */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Week Number</label>
                    <input
                        type="number"
                        min="1"
                        max="30"
                        value={weekNumber}
                        onChange={e => setWeekNumber(e.target.value)}
                        placeholder="e.g. 3"
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    />
                </div>

                {/* File upload */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Paper (image or PDF)
                    </label>
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                    />
                </div>

                {/* Image preview */}
                {preview && (
                    <div className="mb-4">
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-h-64 rounded-xl border border-gray-200 object-contain"
                        />
                    </div>
                )}

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                <button
                    onClick={handleExtract}
                    disabled={loading || !file || !weekNumber}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "🤖 AI is reading the paper..." : "✨ Extract Idioms with AI"}
                </button>
            </div>

            {/* Results */}
            {extractedData && (
                <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

                    {/* Title and conversation preview */}
                    {extractedData.title && (
                        <div className="mb-4 p-3 bg-indigo-50 rounded-xl">
                            <p className="text-sm font-semibold text-indigo-600">
                                📖 Title: {extractedData.title}
                            </p>
                            {extractedData.conversation && (
                                <p className="text-xs text-gray-400 mt-1">
                                    ✅ Conversation text extracted ({extractedData.conversation.split("\n").length} lines)
                                </p>
                            )}
                        </div>
                    )}

                    <h3 className="text-lg font-bold text-gray-700 mb-1">
                        ✅ Found {extractedData.idioms.length} idioms
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Review below, then export as JSON to save into your project
                    </p>

                    {/* Idiom list */}
                    <div className="flex flex-col gap-3 mb-6">
                        {extractedData.idioms.map((item, i) => (
                            <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                                <p className="font-bold text-indigo-700">"{item.idiom}"</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">EN:</span> {item.meaning_en}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">VI:</span> {item.meaning_vi}
                                </p>
                                <p className="text-sm text-gray-400 italic mt-1">"{item.example}"</p>
                                {item.context && (
                                    <p className="text-xs text-gray-300 mt-1">Context: {item.context}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportJSON}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
                        >
                            📥 Export as JSON
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
                        >
                            ✅ Use in app now
                        </button>
                    </div>

                    <p className="text-xs text-gray-400 mt-3 text-center">
                        💡 Export JSON → fix any errors → drop into src/data/idioms/week_XX/idioms.json
                    </p>
                </div>
            )}
        </div>
    )
}