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

const allIdioms = allWeeks.flatMap(w => 
    (w.data || []).map(item => ({
        ...item,
        weekNum: w.weekNum,
        weekTitle: w.title
    }))
)

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
    const [searchQuery, setSearchQuery] = useState("")

    function handleSyncModalClose() {
        localStorage.setItem("gayle_sync_code_seen", "1")
        setShowSyncModal(false)
    }

    const dm = darkMode
    const currentWeek = allWeeks[selectedWeek]
    const idioms = currentWeek?.data ?? []

    const filteredIdioms = searchQuery.trim()
        ? allIdioms.filter(item => {
            const query = searchQuery.toLowerCase()
            return (
                (item.idiom || "").toLowerCase().includes(query) ||
                (item.meaning_en || "").toLowerCase().includes(query) ||
                (item.meaning_vi || "").toLowerCase().includes(query)
            )
        })
        : []

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

                    {/* Search Bar */}
                    <div className="max-w-md mx-auto mb-6 relative animate-fadeIn">
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-gray-400">🔍</span>
                            <input
                                type="text"
                                placeholder={lang === "vi" ? "Tìm idiom, nghĩa tiếng Anh hoặc tiếng Việt..." : "Search idiom, English or Vietnamese meaning..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border transition shadow-sm outline-none text-sm ${
                                    dm
                                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        : "bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                }`}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className={`absolute right-3 p-1 rounded-full text-gray-400 transition ${
                                        dm ? "hover:bg-gray-700 hover:text-gray-200" : "hover:bg-gray-100 hover:text-gray-600"
                                    }`}
                                    title={lang === "vi" ? "Xóa tìm kiếm" : "Clear search"}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchQuery.trim() !== "" ? (
                        <div className={`mb-8 p-6 rounded-2xl border transition animate-fadeIn ${
                            dm ? "bg-gray-800/40 border-gray-700" : "bg-gray-50 border-gray-200"
                        }`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`font-semibold text-lg ${dm ? "text-white" : "text-gray-800"}`}>
                                    {lang === "vi" ? "Kết Quả Tìm Kiếm" : "Search Results"} ({filteredIdioms.length})
                                </h3>
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="text-xs text-indigo-500 hover:text-indigo-400 font-medium px-2 py-1 rounded hover:bg-indigo-500/10 transition"
                                >
                                    {lang === "vi" ? "Xóa bộ lọc" : "Clear Search"}
                                </button>
                            </div>

                            {filteredIdioms.length === 0 ? (
                                <p className={`text-center py-8 text-sm ${dm ? "text-gray-400" : "text-gray-500"}`}>
                                    {lang === "vi" ? "Không tìm thấy idiom nào phù hợp." : "No matching idioms found."}
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredIdioms.slice(0, 6).map(item => (
                                        <IdiomCard key={`${item.weekNum}-${item.id}`} item={item} lang={lang} darkMode={dm} />
                                    ))}
                                </div>
                            )}

                            {filteredIdioms.length > 6 && (
                                <p className={`text-xs text-center mt-4 ${dm ? "text-gray-400" : "text-gray-500"}`}>
                                    {lang === "vi" 
                                        ? `Đang hiển thị 6 trên ${filteredIdioms.length} kết quả. Nhập chi tiết hơn để thu hẹp kết quả.` 
                                        : `Showing 6 of ${filteredIdioms.length} results. Refine your search query to see more.`}
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
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
                                <Flashcard key={selectedWeek} idioms={idioms} lang={lang} darkMode={dm} />
                            )}

                            {mode === "games" && (
                                <Games allWeeks={allWeeks} darkMode={dm} />
                            )}

                            {mode === "admin" && (
                                <AdminUpload onIdiomsExtracted={handleIdiomsExtracted} />
                            )}
                        </>
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
