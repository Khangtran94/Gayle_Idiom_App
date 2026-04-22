import { useState } from "react"

export default function Flashcard({ idioms, lang }) {
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [known, setKnown] = useState([])
    const [learning, setLearning] = useState([])
    const [finished, setFinished] = useState(false)

    const current = idioms[index]
    const total = idioms.length
    const progress = Math.round((index / total) * 100)

    function speakText(text) {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = "en-US"
        u.rate = 0.9
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
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

    return (
        <div className="flex flex-col items-center">

            {/* Progress bar */}
            <div className="w-full max-w-md mb-4">
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
                    if (!flipped) speakText(current.idiom)
                }}
                className="w-full max-w-md min-h-56 bg-white rounded-3xl shadow-md border border-gray-100 p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition select-none"
            >
                {!flipped ? (
                    <>
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Tap to reveal</p>
                        <h2 className="text-2xl font-bold text-indigo-700 text-center">"{current.idiom}"</h2>
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

            <p className="text-xs text-gray-400 mt-3">Tap card to flip</p>

            {/* Action buttons — only show after flipping */}
            {flipped && (
                <div className="flex gap-4 mt-6">
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
                        ✅ Got it!
                    </button>
                </div>
            )}
        </div>
    )
}