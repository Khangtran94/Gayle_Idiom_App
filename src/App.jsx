import { useState } from "react"
import IdiomCard from "./components/IdiomCard"
import Flashcard from "./components/Flashcard"
import week01 from "./data/idioms/week_01/idioms.json"

const allWeeks = [
    { label: "Week 1", data: week01 }
]

export default function App() {
    const [selectedWeek, setSelectedWeek] = useState(0)
    const [lang, setLang] = useState("both")
    const [mode, setMode] = useState("browse") // "browse" or "flashcard"

    const idioms = allWeeks[selectedWeek].data

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
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
                    {["browse", "flashcard"].map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-5 py-2 rounded-xl text-sm font-medium border transition
                ${mode === m
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                                }`}
                        >
                            {m === "browse" ? "📖 Browse" : "🃏 Flashcards"}
                        </button>
                    ))}
                </div>

                {/* Week Selector */}
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

                {/* Content */}
                {mode === "browse" ? (
                    <div className="flex flex-col gap-4">
                        {idioms.map(item => (
                            <IdiomCard key={item.id} item={item} lang={lang} />
                        ))}
                    </div>
                ) : (
                    <Flashcard idioms={idioms} lang={lang} />
                )}

            </div>
        </div>
    )
}