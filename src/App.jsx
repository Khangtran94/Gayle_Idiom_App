import { useState } from "react"
import IdiomCard from "./components/IdiomCard"
import Flashcard from "./components/Flashcard"
import AdminUpload from "./components/AdminUpload"

// Automatically finds ALL idioms.json files across all week folders
const weekModules = import.meta.glob("./data/idioms/week_*/idioms.json", { eager: true })

// Convert to a sorted array
const allWeeks = Object.entries(weekModules)
    .map(([path, module]) => {
        const match = path.match(/week_(\d+)/)
        const weekNum = match ? parseInt(match[1]) : 0
        return {
            label: `Week ${weekNum}`,
            weekNum,
            data: module.default
        }
    })
    .sort((a, b) => a.weekNum - b.weekNum)

export default function App() {
    const [selectedWeek, setSelectedWeek] = useState(0)
    const [lang, setLang] = useState("both")
    const [mode, setMode] = useState("browse")

    const idioms = allWeeks[selectedWeek]?.data ?? []

    function handleIdiomsExtracted(newIdioms, weekNumber) {
        setMode("browse")
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">

                <h1 className="text-3xl font-bold text-center text-indigo-600 mb-2">
                    Gayle's Idiom App
                </h1>
                <p className="text-center text-gray-500 mb-6">Learn and memorize English idioms</p>

                {/* Language Toggle */}
                <div className="flex justify-center gap-2 mb-4">
                    {["en", "vi", "both"].map(option => (
                        <button
                            key={option}
                            onClick={() => setLang(option)}
                            className={`px-4 py-1 rounded-full text-sm font-medium border transition
                ${lang === option
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                                }`}
                        >
                            {option === "en" ? "English" : option === "vi" ? "Tiếng Việt" : "Both"}
                        </button>
                    ))}
                </div>

                {/* Mode Toggle */}
                <div className="flex justify-center gap-2 mb-6">
                    {[
                        { id: "browse", label: "📖 Browse" },
                        { id: "flashcard", label: "🃏 Flashcards" },
                        { id: "admin", label: "⚙️ Admin" }
                    ].map(m => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`px-5 py-2 rounded-xl text-sm font-medium border transition
                ${mode === m.id
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                                }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Week Selector — hide in admin mode */}
                {mode !== "admin" && (
                    <div className="flex gap-2 flex-wrap justify-center mb-8">
                        {allWeeks.map((week, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedWeek(i)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition
                  ${selectedWeek === i
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                                    }`}
                            >
                                {week.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                {mode === "browse" && (
                    <div className="flex flex-col gap-4">
                        {idioms.map(item => (
                            <IdiomCard key={item.id} item={item} lang={lang} />
                        ))}
                    </div>
                )}
                {mode === "flashcard" && <Flashcard idioms={idioms} lang={lang} />}
                {mode === "admin" && <AdminUpload onIdiomsExtracted={handleIdiomsExtracted} />}

            </div>
        </div>
    )
}