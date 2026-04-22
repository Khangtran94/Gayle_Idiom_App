import { useState } from "react"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export default function AdminUpload({ onIdiomsExtracted }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [extractedIdioms, setExtractedIdioms] = useState(null)
    const [weekNumber, setWeekNumber] = useState("")

    function handleFileChange(e) {
        const selected = e.target.files[0]
        if (!selected) return
        setFile(selected)
        setExtractedIdioms(null)
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
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = async () => {
                const base64 = reader.result.split(",")[1]
                const mediaType = file.type

                const isImage = mediaType.startsWith("image/")
                const isPDF = mediaType === "application/pdf"

                if (!isImage && !isPDF) {
                    setError("Please upload an image (jpg, png) or PDF file.")
                    setLoading(false)
                    return
                }

                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

                const prompt = `This is a paper from an English class. It contains a conversation with some idioms underlined or highlighted.

Please extract all the idioms from this document and return them as a JSON array ONLY — no explanation, no markdown, no backticks, just raw JSON.

Each idiom object must follow this exact format:
[
  {
    "id": "w${weekNumber.padStart(2, "0")}_01",
    "idiom": "the idiom phrase",
    "meaning_en": "clear English explanation of the idiom",
    "meaning_vi": "giải thích bằng tiếng Việt",
    "example": "a natural example sentence using this idiom",
    "context": "the original sentence from the paper where this idiom appeared",
    "week": ${parseInt(weekNumber)}
  }
]

Number the ids sequentially: w${weekNumber.padStart(2, "0")}_01, w${weekNumber.padStart(2, "0")}_02, etc.
Return ONLY the JSON array, nothing else. No markdown, no backticks.`

                const imagePart = {
                    inlineData: {
                        data: base64,
                        mimeType: mediaType
                    }
                }

                const result = await model.generateContent([prompt, imagePart])
                const text = result.response.text().trim()

                // Clean up any accidental markdown formatting
                const clean = text.replace(/```json|```/g, "").trim()
                const parsed = JSON.parse(clean)

                setExtractedIdioms(parsed)
                setLoading(false)
            }
        } catch (err) {
            setError("Something went wrong: " + err.message)
            setLoading(false)
        }
    }

    function handleConfirm() {
        if (extractedIdioms) {
            onIdiomsExtracted(extractedIdioms, parseInt(weekNumber))
        }
    }

    function handleExportJSON() {
        const blob = new Blob([JSON.stringify(extractedIdioms, null, 2)], {
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
                        placeholder="e.g. 2"
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
            {extractedIdioms && (
                <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-700 mb-1">
                        ✅ Found {extractedIdioms.length} idioms
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Review below, then export as JSON to save into your project
                    </p>

                    <div className="flex flex-col gap-3 mb-6">
                        {extractedIdioms.map((item, i) => (
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

                    {/* Two action buttons */}
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
                        💡 Export JSON → fix any errors in a text editor → drop into src/data/idioms/week_XX/
                    </p>
                </div>
            )}
        </div>
    )
}