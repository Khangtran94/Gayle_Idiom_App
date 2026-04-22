export default function IdiomCard({ item, lang }) {
    function speakText(text, rate = 0.9) {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = "en-US"
        u.rate = rate
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-indigo-700">"{item.idiom}"</h2>
                <button
                    onClick={() => speakText(item.idiom)}
                    className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 transition"
                    title="Listen to pronunciation"
                >
                    🔊
                </button>
            </div>

            {(lang === "en" || lang === "both") && (
                <p className="text-gray-700 mb-1">
                    <span className="font-semibold text-gray-400 text-sm">EN: </span>
                    {item.meaning_en}
                </p>
            )}
            {(lang === "vi" || lang === "both") && (
                <p className="text-gray-700 mb-1">
                    <span className="font-semibold text-gray-400 text-sm">VI: </span>
                    {item.meaning_vi}
                </p>
            )}

            <p className="text-gray-500 text-sm mt-3 italic">"{item.example}"</p>
            <button
                onClick={() => speakText(item.example, 0.85)}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-600 transition"
            >
                🔊 Listen to example
            </button>
        </div>
    )
}