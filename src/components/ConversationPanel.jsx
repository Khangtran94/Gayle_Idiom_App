import { useState, useEffect, useRef } from "react"

export default function ConversationPanel({ week, darkMode: dm }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [speed, setSpeed] = useState(1)
    const [progress, setProgress] = useState(0)
    const [currentWordIndex, setCurrentWordIndex] = useState(-1)
    const [showTooltip, setShowTooltip] = useState(false)
    const utteranceRef = useRef(null)
    const intervalRef = useRef(null)
    const startTimeRef = useRef(null)
    const estimatedDurationRef = useRef(0)

    const speeds = [0.5, 0.75, 1, 1.25, 1.5]

    // Build plain text words with position tracking
    function getPlainText() {
        if (!week.conversation) return ""
        return week.conversation.replace(/<[^>]*>/g, "")
    }

    // Split conversation into lines with word metadata
    function buildLines() {
        if (!week.conversation) return []
        return week.conversation.split("\n").map(line => {
            const plain = line.replace(/<[^>]*>/g, "")
            return { raw: line, plain }
        })
    }

    const plainWords = getPlainText().split(/\s+/)

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel()
            clearInterval(intervalRef.current)
        }
    }, [])

    function startProgress(duration) {
        clearInterval(intervalRef.current)
        startTimeRef.current = Date.now()
        estimatedDurationRef.current = duration
        intervalRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000
            const pct = Math.min((elapsed / duration) * 100, 100)
            setProgress(pct)
            if (pct >= 100) {
                clearInterval(intervalRef.current)
                setIsPlaying(false)
                setIsPaused(false)
                setProgress(0)
                setCurrentWordIndex(-1)
            }
        }, 200)
    }

    function handlePlay() {
        const text = getPlainText()
        if (!text) return

        window.speechSynthesis.cancel()
        clearInterval(intervalRef.current)
        setCurrentWordIndex(-1)

        const u = new SpeechSynthesisUtterance(text)
        u.lang = "en-US"
        u.rate = speed
        utteranceRef.current = u

        const wordCount = text.split(" ").length
        const estimatedSeconds = (wordCount / 150) * 60 / speed

        // Word boundary highlight
        u.onboundary = (e) => {
            if (e.name === "word") {
                const spokenText = text.substring(0, e.charIndex)
                const wordIdx = spokenText.split(/\s+/).filter(Boolean).length
                setCurrentWordIndex(wordIdx)
            }
        }

        u.onstart = () => {
            setIsPlaying(true)
            setIsPaused(false)
            setProgress(0)
            startProgress(estimatedSeconds)
        }

        u.onend = () => {
            setIsPlaying(false)
            setIsPaused(false)
            setProgress(0)
            setCurrentWordIndex(-1)
            clearInterval(intervalRef.current)
        }

        u.onerror = () => {
            setIsPlaying(false)
            setIsPaused(false)
            clearInterval(intervalRef.current)
        }

        window.speechSynthesis.speak(u)
    }

    function handlePause() {
        if (isPaused) {
            window.speechSynthesis.resume()
            setIsPaused(false)
            const remaining = estimatedDurationRef.current * (1 - progress / 100)
            startTimeRef.current = Date.now() - (estimatedDurationRef.current - remaining) * 1000
            startProgress(estimatedDurationRef.current)
        } else {
            window.speechSynthesis.pause()
            setIsPaused(true)
            clearInterval(intervalRef.current)
        }
    }

    function handleStop() {
        window.speechSynthesis.cancel()
        clearInterval(intervalRef.current)
        setIsPlaying(false)
        setIsPaused(false)
        setProgress(0)
        setCurrentWordIndex(-1)
    }

    function handleSpeedChange(newSpeed) {
        setSpeed(newSpeed)
    }

    // Render conversation with per-word highlight
    function renderConversation() {
        const lines = buildLines()
        let globalWordIdx = 0

        return lines.map((line, i) => {
            const isSpeaker = line.plain.match(/^(Lisa|Amy|A|B|Man|Woman|Teacher|Student):/i)
            const colonIdx = line.plain.indexOf(":")
            const speakerName = isSpeaker ? line.plain.substring(0, colonIdx) : null

            // Strip HTML just to count/track words for highlight index
            const lineText = isSpeaker
                ? line.plain.substring(colonIdx + 1).trim()
                : line.plain
            const wordCount = lineText.split(/\s+/).filter(Boolean).length

            // Check if any word in this line is currently active
            const lineStartIdx = globalWordIdx
            globalWordIdx += wordCount

            // Which word within this line is active
            const activeLocalIdx = currentWordIndex - lineStartIdx

            // Wrap each word in the HTML with highlight span
            const rawContent = isSpeaker
                ? line.raw.substring(line.raw.indexOf(":") + 1).trim()
                : line.raw

            // Split raw HTML into word tokens, preserving tags
            let localWordIdx = 0
            const highlighted = rawContent.replace(
                /(<[^>]+>)|([^\s<]+)/g,
                (match, tag, word) => {
                    if (tag) return tag // keep HTML tags as-is
                    const isActive = localWordIdx === activeLocalIdx
                    localWordIdx++
                    if (isActive) {
                        return `<span style="background:${dm ? "#6366f1" : "#c7d2fe"};color:${dm ? "white" : "#312e81"};border-radius:3px;padding:0 2px">${word}</span>`
                    }
                    return word
                }
            )

            return (
                <p key={i} className="mb-2">
                    {isSpeaker ? (
                        <>
                            <span className="font-bold text-indigo-500">{speakerName}: </span>
                            <span dangerouslySetInnerHTML={{ __html: highlighted }} />
                        </>
                    ) : (
                        <span
                            className={`italic ${dm ? "text-gray-500" : "text-gray-400"}`}
                            dangerouslySetInnerHTML={{ __html: highlighted }}
                        />
                    )}
                </p>
            )
        })
    }

    return (
        <div className={`rounded-2xl border p-4 h-full ${dm ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
            }`}>

            {/* Title */}
            {week.title && (
                <h2 className={`text-lg font-bold text-center mb-4 ${dm ? "text-indigo-400" : "text-indigo-600"
                    }`}>
                    {week.title}
                </h2>
            )}

            {/* Audio player */}
            {week.conversation && (
                <div className={`rounded-xl p-3 mb-4 ${dm ? "bg-gray-700" : "bg-indigo-50"
                    }`}>
                    <p className={`text-xs font-medium mb-2 ${dm ? "text-gray-400" : "text-gray-500"
                        }`}>🎵 Conversation Audio</p>

                    {/* Progress visualizer — visual only, not clickable */}
                    <div className={`w-full rounded-full h-2 mb-3 overflow-hidden ${dm ? "bg-gray-600" : "bg-gray-200"
                        }`}>
                        <div
                            className={`h-2 rounded-full transition-all duration-200 ${isPlaying && !isPaused
                                ? "bg-indigo-500"
                                : isPaused
                                    ? "bg-yellow-400"
                                    : "bg-indigo-300"
                                }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Status label */}
                    <p className={`text-xs mb-2 ${dm ? "text-gray-400" : "text-gray-400"}`}>
                        {isPlaying && !isPaused
                            ? "▶ Playing..."
                            : isPaused
                                ? "⏸ Paused"
                                : progress === 0 && !isPlaying
                                    ? "Ready to play"
                                    : ""}
                    </p>

                    {/* Play / Pause / Stop buttons */}
                    <div className="flex gap-2 mb-3">
                        {!isPlaying && !isPaused ? (
                            <button
                                onClick={handlePlay}
                                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                            >
                                ▶ Play
                            </button>
                        ) : (
                            <button
                                onClick={handlePause}
                                className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition"
                            >
                                {isPaused ? "▶ Resume" : "⏸ Pause"}
                            </button>
                        )}
                        <button
                            onClick={handleStop}
                            disabled={!isPlaying && !isPaused}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 ${dm
                                ? "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                }`}
                        >
                            ⏹ Stop
                        </button>
                    </div>

                    {/* Speed selector with tooltip */}
                    <div className="flex items-center gap-2 relative">
                        <span className={`text-xs ${dm ? "text-gray-400" : "text-gray-500"}`}>
                            Speed:
                        </span>
                        <div className="flex gap-1">
                            {speeds.map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleSpeedChange(s)}
                                    className={`px-2 py-1 rounded-lg text-xs font-medium transition ${speed === s
                                        ? "bg-indigo-600 text-white"
                                        : dm
                                            ? "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                        }`}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>

                        {/* Tooltip trigger */}
                        <div
                            className="relative"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <span className={`text-xs cursor-help ${dm ? "text-gray-500" : "text-gray-400"
                                }`}>ⓘ</span>
                            {showTooltip && (
                                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-44 text-xs text-center px-2 py-1.5 rounded-lg shadow-lg z-10 ${dm
                                    ? "bg-gray-900 text-gray-300"
                                    : "bg-gray-800 text-white"
                                    }`}>
                                    Changes apply on next play
                                    <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${dm ? "border-t-gray-900" : "border-t-gray-800"
                                        }`} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Conversation text with word highlight */}
            {week.conversation ? (
                <div className={`text-sm leading-relaxed overflow-y-auto max-h-96 ${dm ? "text-gray-300" : "text-gray-700"
                    }`}>
                    {renderConversation()}
                </div>
            ) : (
                <p className={`text-sm italic text-center mt-8 ${dm ? "text-gray-500" : "text-gray-400"
                    }`}>
                    No conversation available for this week yet.
                </p>
            )}
        </div>
    )
}