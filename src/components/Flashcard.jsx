import { useState } from "react"

// Words that end in "ing" but are NOT gerunds — must not be stripped
const ING_EXCEPTIONS = new Set([
    "swing", "bring", "ring", "sing", "spring",
    "sting", "cling", "king", "thing", "string",
    "fling", "sling", "wing", "ping", "morning",
    "during", "ceiling", "feeling", "evening",
    "meaning", "opening", "warning", "booking"
])

export default function Flashcard({ idioms: allIdioms, lang }) {
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [known, setKnown] = useState([])
    const [learning, setLearning] = useState([])
    const [finished, setFinished] = useState(false)

    const idioms = allIdioms

    const current = idioms[index]
    const total = idioms.length
    const progress = total > 0 ? Math.round((index / total) * 100) : 0
    const bareIdiom = current ? getBareForm(current.idiom) : ""

    // ── getBareForm ────────────────────────────────────────────────────
    function getBareForm(idiom) {
        if (!idiom) return ""
        const words = idiom.trim().split(/\s+/)
        if (words.length === 0) return ""

        let firstWord = words[0].toLowerCase()

        const irregularMap = {
            "checking": "check", "pulling": "pull", "earning": "earn",
            "making": "make", "returning": "return", "exchanging": "exchange",
            "renting": "rent", "ordering": "order", "visiting": "visit",
            "discussing": "discuss", "handling": "handle", "apologizing": "apologize",
            "killing": "kill", "acting": "act", "driving": "drive",
            "breaking": "break", "starving": "starve", "browsing": "browse",
            "buying": "buy", "selling": "sell", "paying": "pay",
            "held": "hold", "made": "make", "got": "get", "came": "come",
            "went": "go", "bought": "buy", "sold": "sell", "took": "take",
            "reeks": "reek", "runs": "run", "kills": "kill",
            "boggles": "boggle", "seems": "seem", "insists": "insist",
            "booked": "book", "packed": "pack", "reeked": "reek",
            "insisted": "insist",
            "is": "be", "was": "be", "are": "be", "were": "be",
            "am": "be", "been": "be"
        }

        if (irregularMap[firstWord]) {
            firstWord = irregularMap[firstWord]
        } else if (firstWord.endsWith("ing") && !ING_EXCEPTIONS.has(firstWord)) {
            // Only strip -ing if the stem is at least 3 chars
            const stem = firstWord.slice(0, -3)
            if (stem.length >= 3) firstWord = stem
        } else if (firstWord.endsWith("s") && !firstWord.endsWith("ss") && firstWord.length > 3) {
            firstWord = firstWord.slice(0, -1)
        } else if (firstWord.endsWith("ed") && firstWord.length > 4) {
            firstWord = firstWord.slice(0, -2)
        }

        // Restore original capitalisation
        const originalFirst = words[0]
        if (originalFirst[0] === originalFirst[0].toUpperCase()) {
            firstWord = firstWord.charAt(0).toUpperCase() + firstWord.slice(1)
        }

        words[0] = firstWord

        let result = words.join(" ")
        result = result
            .replace(/\b(my|your|his|her|its|their|our)\b/gi, (match) =>
                match[0] === match[0].toUpperCase() ? "One's" : "one's"
            )
            .replace(/\b(me|him|her|them|us)\b/gi, (match) =>
                match[0] === match[0].toUpperCase() ? "Someone" : "someone"
            )

        return result
    }

    // ── TTS ────────────────────────────────────────────────────────────
    function speakText(text) {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = "en-US"
        u.rate = 0.9
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
    }

    // ── navigation ─────────────────────────────────────────────────────
    function goBack() {
        if (index === 0) return
        setIndex(i => i - 1)
        setFlipped(false)
    }

    function handleMark(status) {
        if (status === "known") setKnown(prev => [...prev, current.id])
        else setLearning(prev => [...prev, current.id])

        if (index + 1 >= total) {
            setFinished(true)
        } else {
            setIndex(i => i + 1)
            setFlipped(false)
        }
    }

    function restart() {
        setIndex(0)
        setFlipped(false)
        setKnown([])
        setLearning([])
        setFinished(false)
    }

    // ── finished screen ────────────────────────────────────────────────
    if (finished) {
        return (
            <div className="text-center py-10">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-indigo-700 mb-2">Round Complete!</h2>
                <p className="text-gray-500 mb-6">Here's how you did:</p>
                <div className="flex justify-center gap-6 mb-8">
                    <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{known.length}</p>
                        <p className="text-sm text-green-500 mt-1">Got it ✓</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 text-center">
                        <p className="text-3xl font-bold text-orange-500">{learning.length}</p>
                        <p className="text-sm text-orange-400 mt-1">Still learning</p>
                    </div>
                </div>
                <button
                    onClick={restart}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
                >
                    Try Again
                </button>
            </div>
        )
    }

    // ── empty check ───────────────────────────────────────────────────
    if (total === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No idioms available.</p>
            </div>
        )
    }

    // ── main flashcard ─────────────────────────────────────────────────
    return (
        <div className="flex flex-col items-center gap-4">

            {/* Progress bar */}
            <div className="w-full max-w-md">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>{index + 1} / {total}</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Card */}
            <div
                onClick={() => {
                    setFlipped(f => !f)
                    if (!flipped) speakText(bareIdiom)
                }}
                className="w-full max-w-md min-h-56 bg-white rounded-3xl shadow-md border border-gray-100 p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition select-none"
            >
                {!flipped ? (
                    <>
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Tap to reveal</p>
                        <h2 className="text-2xl font-bold text-indigo-700 text-center">"{bareIdiom}"</h2>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Meaning</p>
                        {(lang === "en" || lang === "both") && (
                            <p className="text-gray-700 text-center mb-2">
                                <span className="text-xs text-gray-400 font-semibold">EN: </span>
                                {current.meaning_en}
                            </p>
                        )}
                        {(lang === "vi" || lang === "both") && (
                            <p className="text-gray-700 text-center mb-2">
                                <span className="text-xs text-gray-400 font-semibold">VI: </span>
                                {current.meaning_vi}
                            </p>
                        )}
                        <p className="text-gray-400 text-sm text-center italic mt-3">"{current.example}"</p>
                    </>
                )}
            </div>

            <p className="text-xs text-gray-400 -mt-2">Tap card to flip</p>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">

                {/* ← Back button */}
                <button
                    onClick={goBack}
                    disabled={index === 0}
                    className="px-4 py-3 rounded-xl font-medium text-sm border transition disabled:opacity-30 disabled:cursor-not-allowed bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200"
                    title="Go back"
                >
                    ← Back
                </button>

                {!flipped ? (
                    <button
                        onClick={() => handleMark("known")}
                        className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-medium hover:bg-indigo-200 transition"
                    >
                        ⏭️ I know it
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => handleMark("learning")}
                            className="px-6 py-3 bg-orange-100 text-orange-600 rounded-xl font-medium hover:bg-orange-200 transition"
                        >
                            😅 Still learning
                        </button>
                        <button
                            onClick={() => handleMark("known")}
                            className="px-6 py-3 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition"
                        >
                            ✅ Got it
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
