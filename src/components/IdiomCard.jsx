export default function IdiomCard({ item, lang, darkMode: dm }) {
    function speakText(text, rate = 0.9) {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = "en-US"
        u.rate = rate
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
    }

    return (
        <div className={`rounded-2xl shadow-sm border p-5 ${dm ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
            }`}>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-indigo-400">"{item.idiom}"</h2>
                <button
                    onClick={() => speakText(item.idiom)}
                    className={`p-2 rounded-full transition ${dm
                        ? "bg-gray-700 text-gray-300 hover:bg-indigo-900 hover:text-indigo-300"
                        : "bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600"
                        }`}
                >
                    🔊
                </button>
            </div>

            {(lang === "en" || lang === "both") && (
                <p className={`mb-1 ${dm ? "text-gray-300" : "text-gray-700"}`}>
                    <span className="font-semibold text-gray-400 text-sm">EN: </span>
                    {item.meaning_en}
                </p>
            )}
            {(lang === "vi" || lang === "both") && (
                <p className={`mb-1 ${dm ? "text-gray-300" : "text-gray-700"}`}>
                    <span className="font-semibold text-gray-400 text-sm">VI: </span>
                    {item.meaning_vi}
                </p>
            )}

            <p className={`text-sm mt-3 italic ${dm ? "text-gray-400" : "text-gray-500"}`}>
                "{item.example}"
            </p>
            <button
                onClick={() => speakText(item.example, 0.85)}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
                🔊 Listen to example
            </button>
        </div>
    )
}