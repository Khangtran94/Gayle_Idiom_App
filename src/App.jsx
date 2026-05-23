import { useState } from "react"
import IdiomCard from "./components/IdiomCard"
import Flashcard from "./components/Flashcard"
import AdminUpload from "./components/AdminUpload"
import ConversationPanel from "./components/ConversationPanel"
import Games from "./components/Games"
import SyncPanel from "./components/SyncPanel"
import SyncCodeModal from "./components/SyncCodeModal"

const weekModules = import.meta.glob("./data/idioms/week_*/*.json", { eager: true })

const allWeeks = Object.entries(weekModules)
    .map(([path, module]) => {
        const match = path.match(/week_(\d+)/)
        const weekNum = match ? parseInt(match[1]) : 0
        const raw = module.default
        const isNewFormat = !Array.isArray(raw)
        return {
            label: `Week ${weekNum}`,
            weekNum,
            title: isNewFormat ? raw.title : null,
            conversation: isNewFormat ? raw.conversation : null,
            data: isNewFormat ? raw.idioms : raw
        }
    })
    .sort((a, b) => a.weekNum - b.weekNum)

export default function App() {
    const [selectedWeek, setSelectedWeek] = useState(0)
    const [lang, setLang] = useState("both")
    const [mode, setMode] = useState("browse")
    const [darkMode, setDarkMode] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [titleClicks, setTitleClicks] = useState(0)
    const [showSync, setShowSync] = useState(false)
    const [showSyncModal, setShowSyncModal] = useState(() => {
        return !localStorage.getItem("gayle_sync_code_seen")
    })

    function handleSyncModalClose() {
        localStorage.setItem("gayle_sync_code_seen", "1")
        setShowSyncModal(false)
    }

    const dm = darkMode
    const currentWeek = allWeeks[selectedWeek]
    const idioms = currentWeek?.data ?? []

    function handleTitleClick() {
        const next = titleClicks + 1
        setTitleClicks(next)
        if (next >= 5) {
            const pwd = prompt("Enter admin password:")
            if (pwd === "khang") {
                setIsAdmin(true)
                setTitleClicks(0)
            } else {
                alert("Wrong password")
                setTitleClicks(0)
            }
        }
    }

    function handleIdiomsExtracted() {
        setMode("browse")
    }

    return (
        <div className={dm ? "dark" : ""}>
            {showSyncModal && <SyncCodeModal onClose={handleSyncModalClose} />}
            <div className={`min-h-screen p-6 transition-colors ${dm ? "bg-gray-900" : "bg-gray-50"}`}>
                <div className="max-w-5xl mx-auto">

                    {/* Top bar */}
                    <div className="flex justify-end gap-2 mb-2">
                        {/* Progress / Sync button */}
                        <button
                            onClick={() => setShowSync(s => !s)}
                            className={`px-3 py-1 rounded-full text-sm border transition ${dm
                                ? "bg-gray-700 text-indigo-300 border-gray-600 hover:border-indigo-500"
                                : "bg-white text-indigo-500 border-gray-300 hover:border-indigo-400"
                                }`}
                        >
                            📊 My Progress
                        </button>

                        {/* Dark mode toggle */}
                        <button
                            onClick={() => setDarkMode(d => !d)}
                            className={`px-3 py-1 rounded-full text-sm border transition ${dm
                                ? "bg-gray-700 text-yellow-300 border-gray-600"
                                : "bg-white text-gray-500 border-gray-300"
                                }`}
                        >
                            {dm ? "☀️ Light" : "🌙 Dark"}
                        </button>
                    </div>

                    {/* Sync Panel — inline dropdown below top bar */}
                    {showSync && (
                        <div className="flex justify-end mb-4">
                            <SyncPanel darkMode={dm} onClose={() => setShowSync(false)} />
                        </div>
                    )}

                    {/* Header */}
                    <h1
                        onClick={handleTitleClick}
                        className="text-3xl font-bold text-center text-indigo-600 mb-2 cursor-default select-none"
                    >
                        Gayle's Idiom App
                    </h1>
                    <p className={`text-center mb-6 ${dm ? "text-gray-400" : "text-gray-500"}`}>
                        Learn and memorize English idioms
                    </p>

                    {/* Language Toggle */}
                    <div className="flex justify-center gap-2 mb-4">
                        {["en", "vi", "both"].map(option => (
                            <button
                                key={option}
                                onClick={() => setLang(option)}
                                className={`px-4 py-1 rounded-full text-sm font-medium border transition
                  ${lang === option
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : dm
                                            ? "bg-gray-800 text-gray-300 border-gray-600 hover:border-indigo-400"
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
                            { id: "games", label: "🎮 Games" },
                            ...(isAdmin ? [{ id: "admin", label: "⚙️ Admin" }] : [])
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id)}
                                className={`px-5 py-2 rounded-xl text-sm font-medium border transition
                  ${mode === m.id
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : dm
                                            ? "bg-gray-800 text-gray-300 border-gray-600 hover:border-indigo-400"
                                            : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                                    }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Week Selector */}
                    {mode !== "admin" && (
                        <div className="flex gap-2 flex-wrap justify-center mb-6">
                            {allWeeks.map((week, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedWeek(i)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition
                    ${selectedWeek === i
                                            ? "bg-indigo-600 text-white border-indigo-600"
                                            : dm
                                                ? "bg-gray-800 text-gray-300 border-gray-600 hover:border-indigo-400"
                                                : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                                        }`}
                                >
                                    {week.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Week title */}
                    {mode !== "admin" && currentWeek?.title && (
                        <h2 className={`text-xl font-bold text-center mb-6 ${dm ? "text-white" : "text-gray-700"}`}>
                            Week {currentWeek.weekNum} — {currentWeek.title}
                        </h2>
                    )}

                    {/* Content */}
                    {mode === "browse" && (
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex flex-col gap-4 lg:w-1/2">
                                {idioms.map(item => (
                                    <IdiomCard key={item.id} item={item} lang={lang} darkMode={dm} />
                                ))}
                            </div>
                            <div className="lg:w-1/2">
                                <ConversationPanel week={currentWeek} darkMode={dm} />
                            </div>
                        </div>
                    )}

                    {mode === "flashcard" && (
                        <Flashcard idioms={idioms} lang={lang} darkMode={dm} />
                    )}

                    {mode === "games" && (
                        <Games allWeeks={allWeeks} darkMode={dm} />
                    )}

                    {mode === "admin" && (
                        <AdminUpload onIdiomsExtracted={handleIdiomsExtracted} />
                    )}

                </div>

                {/* Footer */}
                <div className={`mt-16 pt-8 pb-4 text-center text-sm border-t ${dm ? "border-gray-800 text-gray-500" : "border-gray-200 text-gray-500"}`}>
                    <p className="mb-2">
                        {lang === "vi" ? "Được tạo bởi" : "Created by"}{" "}
                        <span className="font-semibold text-indigo-500">Khang Tran</span> — by vibecode
                    </p>
                    <p className="mb-3">
                        {lang === "vi" 
                            ? "Nếu bạn muốn đóng góp dự án hoặc có góp ý, phản hồi, vui lòng liên hệ:" 
                            : "If you're in the tech field and want to contribute, or if you have any feedback/suggestions, please contact me:"}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6">
                        <a href="mailto:tranhoangngockhang1994@gmail.com" className={`transition-colors ${dm ? "hover:text-indigo-400" : "hover:text-indigo-600"}`}>
                            📧 tranhoangngockhang1994@gmail.com
                        </a>
                        <span className={`transition-colors cursor-pointer ${dm ? "hover:text-indigo-400" : "hover:text-indigo-600"}`}>
                            📱 0972 286 699 (Zalo / Phone)
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
