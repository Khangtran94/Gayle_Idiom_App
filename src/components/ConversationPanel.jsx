import { useState, useEffect, useRef } from "react"

export default function ConversationPanel({ week, darkMode: dm }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [speed, setSpeed] = useState(1)
    const [progress, setProgress] = useState(0)
    const [currentWordIndex, setCurrentWordIndex] = useState(-1)
    const [showTooltip, setShowTooltip] = useState(false)
    const intervalRef = useRef(null)
    const startTimeRef = useRef(null)
    const estimatedDurationRef = useRef(0)
    const utteranceQueueRef = useRef([])
    const currentUtteranceRef = useRef(0)
    const totalWordsRef = useRef(0)
    const spokenWordsRef = useRef(0)

    const speeds = [0.5, 0.75, 1, 1.25, 1.5]

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel()
            clearInterval(intervalRef.current)
        }
    }, [])

    // Parse conversation into structured lines
    function parseLines() {
        if (!week.conversation) return []
        return week.conversation.split("\n").map(line => {
            const plain = line.replace(/<[^>]*>/g, "").trim()
            const isStageDirection = plain.startsWith("(") && plain.endsWith(")")
            const speakerMatch = plain.match(/^([A-Za-z]+):\s*(.*)/)
            return {
                raw: line,
                plain,
                isStageDirection,
                speaker: speakerMatch ? speakerMatch[1] : null,
                text: speakerMatch ? speakerMatch[2] : plain,
                rawText: speakerMatch
                    ? line.substring(line.indexOf(":") + 1).trim()
                    : line
            }
        }).filter(l => l.plain.length > 0 && !l.isStageDirection)
    }

    function getVoices() {
        const voices = window.speechSynthesis.getVoices()
        const englishVoices = voices.filter(v => v.lang.startsWith("en"))

        // Try to get two distinct voices
        const femaleVoice = englishVoices.find(v =>
            v.name.includes("Female") ||
            v.name.includes("Samantha") ||
            v.name.includes("Karen") ||
            v.name.includes("Victoria") ||
            v.name.includes("Zira")
        ) || englishVoices[0]

        const maleOrAltVoice = englishVoices.find(v =>
            v.name.includes("Male") ||
            v.name.includes("Daniel") ||
            v.name.includes("Alex") ||
            v.name.includes("David") ||
            v.name.includes("Mark")
        ) || englishVoices[1] || englishVoices[0]

        return { voiceA: femaleVoice, voiceB: maleOrAltVoice }
    }

    function buildLines() {
        if (!week.conversation) return []
        return week.conversation.split("\n").map(line => {
            const plain = line.replace(/<[^>]*>/g, "")
            return { raw: line, plain }
        })
    }

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
            }
        }, 200)
    }

    function handlePlay() {
        const lines = parseLines()
        if (!lines.length) return

        window.speechSynthesis.cancel()
        clearInterval(intervalRef.current)
        setCurrentWordIndex(-1)
        setProgress(0)
        spokenWordsRef.current = 0

        const { voiceA, voiceB } = getVoices()

        // Assign speakers — first speaker = voiceA, second distinct speaker = voiceB
        const speakers = []
        lines.forEach(l => {
            if (l.speaker && !speakers.includes(l.speaker)) speakers.push(l.speaker)
        })

        // Count total words for progress
        const allWords = lines.map(l => l.text.split(/\s+/).filter(Boolean).length)
        totalWordsRef.current = allWords.reduce((a, b) => a + b, 0)

        // Estimate total duration
        const totalWords = totalWordsRef.current
        const estimatedSeconds = (totalWords / 150) * 60 / speed
        estimatedDurationRef.current = estimatedSeconds

        // Build word offset map — each line knows its global word start index
        let globalOffset = 0
        const lineOffsets = lines.map(l => {
            const offset = globalOffset
            globalOffset += l.text.split(/\s+/).filter(Boolean).length
            return offset
        })

        // Queue all utterances
        const queue = lines.map((line, i) => {
            const u = new SpeechSynthesisUtterance(line.text)
            u.rate = speed
            u.lang = "en-US"

            // Assign voice based on speaker
            const speakerIdx = speakers.indexOf(line.speaker)
            if (speakerIdx === 0) {
                u.voice = voiceA
                u.pitch = 1.1
            } else {
                u.voice = voiceB
                u.pitch = 0.9
            }

            const myOffset = lineOffsets[i]

            u.onboundary = (e) => {
                if (e.name === "word") {
                    const spokenSoFar = line.text.substring(0, e.charIndex)
                    const localIdx = spokenSoFar.split(/\s+/).filter(Boolean).length
                    setCurrentWordIndex(myOffset + localIdx)
                }
            }

            return u
        })

        utteranceQueueRef.current = queue
        currentUtteranceRef.current = 0

        function speakNext(idx) {
            if (idx >= queue.length) {
                setIsPlaying(false)
                setIsPaused(false)
                setProgress(100)
                setCurrentWordIndex(-1)
                clearInterval(intervalRef.current)
                return
            }
            const u = queue[idx]
            u.onend = () => speakNext(idx + 1)
            window.speechSynthesis.speak(u)
            currentUtteranceRef.current = idx
        }

        // First utterance triggers progress
        queue[0].onstart = () => {
            setIsPlaying(true)
            setIsPaused(false)
            startProgress(estimatedSeconds)
        }

        speakNext(0)
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

    function renderConversation() {
        const lines = buildLines()
        let globalWordIdx = 0

        return lines.map((line, i) => {
            const plain = line.plain.trim()
            if (!plain) return null

            const isStageDirection = plain.startsWith("(") && plain.endsWith(")")
            const isSpeaker = line.plain.match(/^(Lisa|Amy|A|B|Man|Woman|Teacher|Student):/i)
            const colonIdx = line.plain.indexOf(":")
            const speakerName = isSpeaker ? line.plain.substring(0, colonIdx) : null
            const lineText = isSpeaker
                ? line.plain.substring(colonIdx + 1).trim()
                : line.plain
            const wordCount = lineText.split(/\s+/).filter(Boolean).length
            const lineStartIdx = globalWordIdx

            if (!isStageDirection) globalWordIdx += wordCount

            const activeLocalIdx = currentWordIndex - lineStartIdx

            const rawContent = isSpeaker
                ? line.raw.substring(line.raw.indexOf(":") + 1).trim()
                : line.raw

            let localWordIdx = 0
            const highlighted = rawContent.replace(
                /(<[^>]+>)|([^\s<]+)/g,
                (match, tag, word) => {
                    if (tag) return tag
                    const isActive = !isStageDirection && localWordIdx === activeLocalIdx
                    localWordIdx++
                    if (isActive) {
                        return `<span style="background:${dm ? "#6366f1" : "#c7d2fe"};color:${dm ? "white" : "#312e81"};border-radius:3px;padding:0 2px">${word}</span>`
                    }
                    return word
                }
            )

            if (isStageDirection) {
                return (
                    <p key={i} className={`mb-2 italic text-xs ${dm ? "text-gray-600" : "text-gray-400"
                        }`}>
                        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
                    </p>
                )
            }

            if (isSpeaker) {
                // Color-code speaker name
                const speakers = []
                lines.forEach(l => {
                    const m = l.plain.match(/^([A-Za-z]+):/)
                    if (m && !speakers.includes(m[1])) speakers.push(m[1])
                })
                const speakerIdx = speakers.indexOf(speakerName)
                const nameColor = speakerIdx === 0
                    ? "text-indigo-500"
                    : "text-pink-500"

                return (
                    <p key={i} className="mb-2">
                        <span className={`font-bold ${nameColor}`}>{speakerName}: </span>
                        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
                    </p>
                )
            }

            return (
                <p key={i} className={`mb-2 italic ${dm ? "text-gray-500" : "text-gray-400"}`}>
                    <span dangerouslySetInnerHTML={{ __html: highlighted }} />
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

                    {/* Progress visualizer */}
                    <div className={`w-full rounded-full h-2 mb-1 overflow-hidden ${dm ? "bg-gray-600" : "bg-gray-200"
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

                    <p className={`text-xs mb-3 ${dm ? "text-gray-500" : "text-gray-400"}`}>
                        {isPlaying && !isPaused
                            ? "▶ Playing..."
                            : isPaused
                                ? "⏸ Paused"
                                : "Ready to play"}
                    </p>

                    {/* Buttons */}
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

                    {/* Speed + tooltip */}
                    <div className="flex items-center gap-2">
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
                        <div
                            className="relative"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <span className={`text-xs cursor-help ${dm ? "text-gray-500" : "text-gray-400"
                                }`}>ⓘ</span>
                            {showTooltip && (
                                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-44 text-xs text-center px-2 py-1.5 rounded-lg shadow-lg z-10 ${dm ? "bg-gray-900 text-gray-300" : "bg-gray-800 text-white"
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

            {/* Conversation */}
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