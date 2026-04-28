import { useState, useRef, useEffect } from "react"
import {
    recordAnswer,
    getWeakIdiomIds,
    getIdiomWeight,
    flushToFirebase,
    isFirebaseConfigured,
} from "../utils/progressStore"

// ── helpers ────────────────────────────────────────────────────────────────

function buildPool(weeks, scope) {
    if (scope === "weak") {
        return weeks.flatMap(w =>
            w.data.map(id => ({ ...id, weekNum: w.weekNum, label: w.label, title: w.title }))
        )
    }

    if (scope === "weighted") {
        return weeks.flatMap((w, i) => {
            const weekWeight = i + 1
            return w.data.flatMap(id => {
                const errWeight = getIdiomWeight(id.id)
                const totalWeight = Math.max(weekWeight, errWeight)
                return Array(totalWeight).fill(null).map(() => ({
                    ...id, weekNum: w.weekNum, label: w.label, title: w.title
                }))
            })
        })
    }

    return weeks.flatMap(w =>
        w.data.map(id => ({ ...id, weekNum: w.weekNum, label: w.label, title: w.title }))
    )
}

function pickUnique(pool, count) {
    const seen = new Set()
    return [...pool]
        .sort(() => Math.random() - 0.5)
        .filter(i => {
            if (seen.has(i.idiom)) return false
            seen.add(i.idiom)
            return true
        })
        .slice(0, count)
}

function normalise(s) {
    return s.toLowerCase().trim().replace(/[^a-z\s]/g, "")
}

function makeQuestion(item, allIdioms, gameType, mcStyle) {
    if (gameType === "fill") {
        const regex = new RegExp(item.idiom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
        const blank = item.example.replace(regex, "_____")
        return { type: "fill", idiom: item.idiom, blank, item }
    }
    if (gameType === "listening") {
        return { type: "listening", idiom: item.idiom, item }
    }
    const sameWeek = allIdioms.filter(i => i.idiom !== item.idiom && i.weekNum === item.weekNum)
    const otherWeeks = allIdioms.filter(i => i.idiom !== item.idiom && i.weekNum !== item.weekNum)
    const decoyPool = [...sameWeek.sort(() => Math.random() - 0.5), ...otherWeeks.sort(() => Math.random() - 0.5)]
    const decoys = decoyPool.slice(0, 3)
    const options = [...decoys, item].sort(() => Math.random() - 0.5)
    const qStyle = mcStyle === "mix" ? (Math.random() > 0.5 ? "en" : "vi") : mcStyle
    const question = qStyle === "vi" ? item.meaning_vi : item.meaning_en
    return { type: "mc", idiom: item.idiom, question, qStyle, options, item }
}

// ── shared ui primitives ───────────────────────────────────────────────────

function Pill({ active, onClick, children, accent = "#6366f1", dm, badge }) {
    return (
        <button
            onClick={onClick}
            className="relative px-4 py-2 rounded-full text-sm font-semibold border transition whitespace-nowrap"
            style={{
                borderColor: active ? accent : dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)",
                background: active ? `${accent}22` : dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                color: active ? accent : dm ? "#9CA3AF" : "#6B7280",
            }}
        >
            {children}
            {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-xs font-bold rounded-full px-1.5 py-0.5 leading-none"
                    style={{ background: "#ef4444", color: "white", fontSize: 10 }}>
                    {badge}
                </span>
            )}
        </button>
    )
}

function BigBtn({ onClick, disabled, children, color = "#6366f1" }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full py-3 rounded-xl text-sm font-bold transition"
            style={{
                borderWidth: 1.5, borderStyle: "solid",
                borderColor: disabled ? "rgba(255,255,255,0.05)" : color,
                background: disabled ? "rgba(255,255,255,0.03)" : `${color}22`,
                color: disabled ? "#4B5563" : color,
                cursor: disabled ? "not-allowed" : "pointer",
            }}
        >
            {children}
        </button>
    )
}

function SectionLabel({ children }) {
    return <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">{children}</p>
}

// ── SETUP SCREEN ──────────────────────────────────────────────────────────

function SetupScreen({ allWeeks, onStart, darkMode: dm }) {
    const [scope, setScope] = useState("equal")
    const [selectedWeeks, setSelectedWeeks] = useState([])
    const [qCount, setQCount] = useState(10)
    const [customQ, setCustomQ] = useState("")
    const [gameType, setGameType] = useState(null)
    const [mcStyle, setMcStyle] = useState("en")
    const customInputRef = useRef()

    const weakIds = getWeakIdiomIds()
    const weakCount = weakIds.length

    const toggleWeek = (n) =>
        setSelectedWeeks(prev =>
            prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
        )

    const finalCount = customQ.trim() ? parseInt(customQ) || 10 : qCount
    const canStart = gameType && (scope !== "pick" || selectedWeeks.length > 0)

    function handleStart() {
        let chosenWeeks
        let effectiveScope = scope

        if (scope === "weak") {
            const weakIdSet = new Set(weakIds)
            chosenWeeks = allWeeks
                .map(w => ({
                    ...w,
                    data: w.data.filter(id => weakIdSet.has(id.id))
                }))
                .filter(w => w.data.length > 0)
        } else if (scope === "pick") {
            chosenWeeks = allWeeks.filter(w => selectedWeeks.includes(w.weekNum))
        } else {
            chosenWeeks = allWeeks
        }

        const pool = buildPool(chosenWeeks, effectiveScope)
        const maxPossible = [...new Set(pool.map(i => i.idiom))].length
        const count = Math.min(finalCount, maxPossible)
        const picked = pickUnique(pool, count)
        const allIdioms = allWeeks.flatMap(w =>
            w.data.map(id => ({ ...id, weekNum: w.weekNum, label: w.label }))
        )
        const questions = picked.map(item =>
            makeQuestion(item, allIdioms, gameType, mcStyle)
        )
        onStart(questions)
    }

    const card = dm ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"

    return (
        <div className="flex flex-col gap-6">

            {/* 01 scope */}
            <div className={`rounded-2xl border p-5 ${card}`}>
                <SectionLabel>01 — Choose scope</SectionLabel>
                <div className="flex flex-wrap gap-2 mb-3">
                    <Pill active={scope === "equal"} onClick={() => setScope("equal")} accent="#6366f1" dm={dm}>
                        🎲 All Weeks — Equal
                    </Pill>
                    <Pill active={scope === "weighted"} onClick={() => setScope("weighted")} accent="#a78bfa" dm={dm}>
                        ⚡ All Weeks — Weighted
                    </Pill>
                    <Pill active={scope === "pick"} onClick={() => setScope("pick")} accent="#34d399" dm={dm}>
                        📌 Pick Weeks
                    </Pill>
                    <Pill
                        active={scope === "weak"}
                        onClick={() => setScope("weak")}
                        accent="#f87171"
                        dm={dm}
                        badge={weakCount}
                    >
                        🔁 Review Weak
                    </Pill>
                </div>

                {scope === "weighted" && (
                    <p className="text-xs text-gray-500 leading-relaxed mt-1 px-1">
                        ⚡ Newer weeks appear more often. Idioms you get wrong come back more frequently too.
                    </p>
                )}

                {scope === "weak" && weakCount === 0 && (
                    <div className="mt-3 rounded-xl px-4 py-3 border border-green-800 text-sm text-green-400"
                        style={{ background: "rgba(52,211,153,0.07)" }}>
                        🎉 No weak idioms yet! Play some games first and your trouble spots will appear here.
                    </div>
                )}

                {scope === "weak" && weakCount > 0 && (
                    <div className="mt-3 rounded-xl px-4 py-3 border border-red-800 text-sm text-red-400"
                        style={{ background: "rgba(248,113,113,0.07)" }}>
                        You have <strong>{weakCount}</strong> weak idiom{weakCount !== 1 ? "s" : ""} (error rate &gt; 50%).
                        This session will drill only those.
                    </div>
                )}

                {scope === "pick" && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {allWeeks.map(w => {
                            const active = selectedWeeks.includes(w.weekNum)
                            return (
                                <button
                                    key={w.weekNum}
                                    onClick={() => toggleWeek(w.weekNum)}
                                    className="flex flex-col items-start px-3 py-2 rounded-xl text-xs font-semibold border transition"
                                    style={{
                                        borderColor: active ? "#34d399" : dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                                        background: active ? "rgba(52,211,153,0.1)" : dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                                        color: active ? "#34d399" : dm ? "#6B7280" : "#9CA3AF",
                                    }}
                                >
                                    <span>{active ? "✓ " : ""}{w.label}</span>
                                    {w.title && (
                                        <span className="text-gray-500 font-normal mt-0.5" style={{ fontSize: 10 }}>{w.title}</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 02 question count */}
            <div className={`rounded-2xl border p-5 ${card}`}>
                <SectionLabel>02 — Number of questions</SectionLabel>
                <div className="flex flex-wrap gap-2 mb-3">
                    {[10, 20, 30, 40].map(n => (
                        <Pill
                            key={n}
                            active={qCount === n && !customQ.trim()}
                            onClick={() => { setQCount(n); setCustomQ("") }}
                            accent="#f59e0b"
                            dm={dm}
                        >
                            {n}
                        </Pill>
                    ))}
                    <Pill
                        active={!!customQ.trim()}
                        onClick={() => { setCustomQ(" "); setTimeout(() => customInputRef.current?.focus(), 50) }}
                        accent="#f59e0b"
                        dm={dm}
                    >
                        ✏️ Custom
                    </Pill>
                </div>
                {customQ !== "" && (
                    <input
                        ref={customInputRef}
                        type="number"
                        min={1}
                        max={500}
                        value={customQ.trim()}
                        onChange={e => setCustomQ(e.target.value)}
                        placeholder="e.g. 15"
                        className="rounded-xl px-4 py-2 text-sm outline-none w-36"
                        style={{
                            background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                            border: "1.5px solid rgba(245,158,11,0.4)",
                            color: dm ? "#F9FAFB" : "#111827",
                        }}
                    />
                )}
            </div>

            {/* 03 game type */}
            <div className={`rounded-2xl border p-5 ${card}`}>
                <SectionLabel>03 — Choose game</SectionLabel>
                <div className="flex flex-col gap-3">
                    {[
                        { id: "fill", emoji: "✏️", name: "Fill in the Blank", desc: "Read the sentence, type the missing idiom" },
                        { id: "mc", emoji: "🔤", name: "Multiple Choice", desc: "See the meaning, pick the correct idiom from 4 options" },
                        { id: "listening", emoji: "🎧", name: "Listening Quiz", desc: "Hear the idiom spoken aloud, type what you heard" },
                    ].map(g => {
                        const active = gameType === g.id
                        return (
                            <button
                                key={g.id}
                                onClick={() => setGameType(g.id)}
                                className="flex items-start gap-3 p-4 rounded-xl border text-left transition"
                                style={{
                                    borderColor: active ? "#6366f1" : dm ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
                                    background: active ? "rgba(99,102,241,0.08)" : dm ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                                }}
                            >
                                <span className="text-2xl">{g.emoji}</span>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold mb-0.5 ${active ? "text-indigo-400" : dm ? "text-gray-200" : "text-gray-700"}`}>
                                        {g.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{g.desc}</p>
                                </div>
                                {active && <span className="text-indigo-400 text-lg">✓</span>}
                            </button>
                        )
                    })}
                </div>

                {gameType === "mc" && (
                    <div className="mt-3 p-3 rounded-xl border border-indigo-900"
                        style={{ background: "rgba(99,102,241,0.06)" }}>
                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Question language</p>
                        <div className="flex flex-wrap gap-2">
                            <Pill active={mcStyle === "en"} onClick={() => setMcStyle("en")} accent="#6366f1" dm={dm}>EN → EN</Pill>
                            <Pill active={mcStyle === "vi"} onClick={() => setMcStyle("vi")} accent="#6366f1" dm={dm}>VI → EN</Pill>
                            <Pill active={mcStyle === "mix"} onClick={() => setMcStyle("mix")} accent="#6366f1" dm={dm}>Mix 🔀</Pill>
                        </div>
                    </div>
                )}
            </div>

            <BigBtn
                onClick={handleStart}
                disabled={!canStart || (scope === "weak" && weakCount === 0)}
                color="#6366f1"
            >
                {canStart && !(scope === "weak" && weakCount === 0)
                    ? `▶ Start — ${Math.min(finalCount, scope === "weak" ? weakCount : 9999)} Questions`
                    : scope === "weak" && weakCount === 0
                        ? "No weak idioms to review yet"
                        : "Complete all steps above to start"
                }
            </BigBtn>
        </div>
    )
}

// ── GAME SCREEN ───────────────────────────────────────────────────────────

function GameScreen({ questions, darkMode: dm, onEnd }) {
    const [qIndex, setQIndex] = useState(0)
    const [input, setInput] = useState("")
    const [selected, setSelected] = useState(null)
    const [phase, setPhase] = useState("question")
    const [score, setScore] = useState(0)
    const [speaking, setSpeaking] = useState(false)
    const [hintVisible, setHintVisible] = useState(false)
    // ── NEW: speed state for listening questions ──
    const [listeningSpeed, setListeningSpeed] = useState(1)
    const resultsRef = useRef([])
    const inputRef = useRef()

    const LISTENING_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5]

    const q = questions[qIndex]
    const total = questions.length

    function checkAnswer(ans) {
        return normalise(ans) === normalise(q.idiom)
    }

    function speak(speedOverride) {
        const rate = speedOverride ?? listeningSpeed
        setSpeaking(true)
        const u = new SpeechSynthesisUtterance(q.idiom)
        u.lang = "en-US"
        u.rate = rate
        u.onend = () => setSpeaking(false)
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
    }

    useEffect(() => {
        if (q.type === "listening" && phase === "question") {
            speak()
        }
        setHintVisible(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qIndex])

    useEffect(() => {
        if (phase === "question" && (q.type === "fill" || q.type === "listening")) {
            setTimeout(() => inputRef.current?.focus(), 80)
        }
    }, [phase, qIndex, q.type])

    function submit(ans) {
        const correct = checkAnswer(ans)
        if (correct) setScore(s => s + 1)

        recordAnswer(q.item.id, correct)
        resultsRef.current.push({ idiomId: q.item.id, correct })

        setSelected(ans)
        setPhase("reinforcement")
        window.speechSynthesis.cancel()
    }

    function next() {
        if (qIndex + 1 >= total) {
            onEnd(score + (checkAnswer(selected) ? 0 : 0), resultsRef.current)
            return
        }
        setQIndex(i => i + 1)
        setInput("")
        setSelected(null)
        setPhase("question")
        setHintVisible(false)
    }

    const isCorrect = selected ? checkAnswer(selected) : false
    const card = dm ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
    const textMain = dm ? "text-gray-200" : "text-gray-800"
    const textSub = dm ? "text-gray-400" : "text-gray-500"

    return (
        <div className="flex flex-col gap-4">

            {/* Progress bar + score */}
            <div className={`rounded-2xl border p-4 ${card}`}>
                <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-semibold ${textSub}`}>
                        Question {qIndex + 1} / {total}
                    </span>
                    <div className="flex gap-3 text-xs font-semibold">
                        <span className="text-green-400">✅ {score}</span>
                        <span className="text-red-400">❌ {qIndex - score}</span>
                    </div>
                </div>
                <div className="w-full rounded-full h-1.5 overflow-hidden"
                    style={{ background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }}>
                    <div
                        className="h-1.5 rounded-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${(qIndex / total) * 100}%` }}
                    />
                </div>
            </div>

            {/* Week badge */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full border border-purple-800 text-purple-400"
                    style={{ background: "rgba(167,139,250,0.1)" }}>
                    {q.item.label}
                </span>
                {q.item.title && (
                    <span className={`text-xs ${textSub}`}>{q.item.title}</span>
                )}
            </div>

            {/* ── QUESTION PHASE ── */}
            {phase === "question" && (
                <div className={`rounded-2xl border p-5 ${card}`}>

                    {/* FILL IN THE BLANK */}
                    {q.type === "fill" && (
                        <div>
                            <p className={`text-xs uppercase tracking-widest mb-3 ${textSub}`}>Fill in the blank</p>
                            <div className="rounded-xl p-4 mb-4"
                                style={{ background: dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}>
                                <p className={`text-base leading-relaxed italic ${textMain}`}>
                                    "{q.blank}"
                                </p>
                            </div>
                            {!hintVisible ? (
                                <button
                                    onClick={() => setHintVisible(true)}
                                    className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-4"
                                >
                                    <span className="text-base">💡</span> Show Hint
                                </button>
                            ) : (
                                <div className="rounded-xl px-4 py-3 mb-4 border border-indigo-800"
                                    style={{ background: "rgba(99,102,241,0.07)" }}>
                                    <p className="text-xs uppercase tracking-widest text-indigo-400 mb-1">Hint</p>
                                    <p className={`text-sm leading-relaxed ${textMain}`}>{q.item.meaning_en}</p>
                                </div>
                            )}
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && input.trim() && submit(input.trim())}
                                placeholder="Type the missing idiom..."
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-3"
                                style={{
                                    background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    border: "1.5px solid rgba(99,102,241,0.4)",
                                    color: dm ? "#F9FAFB" : "#111827",
                                    boxSizing: "border-box",
                                }}
                            />
                            <BigBtn onClick={() => submit(input.trim())} disabled={!input.trim()} color="#6366f1">
                                Submit ↵
                            </BigBtn>
                        </div>
                    )}

                    {/* MULTIPLE CHOICE */}
                    {q.type === "mc" && (
                        <div>
                            <p className={`text-xs uppercase tracking-widest mb-3 ${textSub}`}>
                                Which idiom means{q.qStyle === "vi" ? " (Vietnamese clue)" : ""}:
                            </p>
                            <div className="rounded-xl p-4 mb-5"
                                style={{ background: dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}>
                                <p className={`text-base leading-relaxed ${textMain}`}>{q.question}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {q.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => submit(opt.idiom)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition hover:border-indigo-500"
                                        style={{
                                            borderColor: dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                                            background: dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                                            color: dm ? "#E2E8F0" : "#374151",
                                        }}
                                    >
                                        <span className="text-xs font-bold text-gray-500 w-5 shrink-0">
                                            {["A", "B", "C", "D"][i]}
                                        </span>
                                        <span className="text-sm">{opt.idiom}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LISTENING */}
                    {q.type === "listening" && (
                        <div>
                            <p className={`text-xs uppercase tracking-widest mb-4 ${textSub}`}>Listen and type what you hear</p>

                            {/* Play button */}
                            <button
                                onClick={() => speak()}
                                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border font-semibold text-sm transition mb-4"
                                style={{
                                    borderColor: speaking ? "#6366f1" : dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                                    background: speaking ? "rgba(99,102,241,0.12)" : dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                                    color: speaking ? "#a5b4fc" : dm ? "#9CA3AF" : "#6B7280",
                                }}
                            >
                                <span className="text-xl">{speaking ? "🔊" : "🔇"}</span>
                                {speaking ? "Playing..." : "Tap to hear again"}
                            </button>

                            {/* ── Speed controls ── */}
                            <div className="flex items-center gap-2 mb-5">
                                <span className={`text-xs shrink-0 ${dm ? "text-gray-400" : "text-gray-500"}`}>Speed:</span>
                                <div className="flex gap-1 flex-wrap">
                                    {LISTENING_SPEEDS.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => {
                                                setListeningSpeed(s)
                                                // Play immediately at new speed
                                                speak(s)
                                            }}
                                            className="px-2 py-1 rounded-lg text-xs font-medium transition"
                                            style={{
                                                background: listeningSpeed === s
                                                    ? "rgba(99,102,241,0.9)"
                                                    : dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                                                color: listeningSpeed === s
                                                    ? "white"
                                                    : dm ? "#9CA3AF" : "#6B7280",
                                                border: `1px solid ${listeningSpeed === s ? "#6366f1" : dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                                            }}
                                        >
                                            {s}x
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && input.trim() && submit(input.trim())}
                                placeholder="Type what you heard..."
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-3"
                                style={{
                                    background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    border: "1.5px solid rgba(99,102,241,0.4)",
                                    color: dm ? "#F9FAFB" : "#111827",
                                    boxSizing: "border-box",
                                }}
                            />
                            <BigBtn onClick={() => submit(input.trim())} disabled={!input.trim()} color="#6366f1">
                                Submit ↵
                            </BigBtn>
                        </div>
                    )}
                </div>
            )}

            {/* ── REINFORCEMENT PHASE ── */}
            {phase === "reinforcement" && (
                <div className="flex flex-col gap-3">
                    <div className="rounded-2xl border p-4"
                        style={{
                            borderColor: isCorrect ? "#34d399" : "#ef4444",
                            background: isCorrect ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)",
                        }}>
                        <p className="text-base font-bold mb-2"
                            style={{ color: isCorrect ? "#34d399" : "#ef4444" }}>
                            {isCorrect ? "✅ Correct!" : "❌ Not quite"}
                        </p>

                        {/* ── Show user's typed answer for text-input questions ── */}
                        {!isCorrect && (q.type === "fill" || q.type === "listening") && (
                            <div className="flex flex-col gap-1.5">
                                {/* What you typed */}
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-semibold shrink-0"
                                        style={{ color: "#f87171" }}>
                                        You typed:
                                    </span>
                                    <span className="text-sm font-mono px-2 py-0.5 rounded"
                                        style={{
                                            background: "rgba(239,68,68,0.15)",
                                            color: dm ? "#fca5a5" : "#dc2626",
                                            textDecoration: "line-through",
                                        }}>
                                        {selected}
                                    </span>
                                </div>
                                {/* Correct answer */}
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-semibold shrink-0"
                                        style={{ color: "#34d399" }}>
                                        Correct:
                                    </span>
                                    <span className="text-sm font-mono px-2 py-0.5 rounded font-bold"
                                        style={{
                                            background: "rgba(52,211,153,0.15)",
                                            color: dm ? "#6ee7b7" : "#059669",
                                        }}>
                                        {q.idiom}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* MC wrong answer — just show correct, no typed answer to display */}
                        {!isCorrect && q.type === "mc" && (
                            <p className="text-sm text-gray-400">
                                Answer: <span className="text-indigo-400 font-semibold">"{q.idiom}"</span>
                            </p>
                        )}
                    </div>

                    {q.type === "mc" && (
                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <p className={`text-xs uppercase tracking-widest mb-3 ${textSub}`}>Options</p>
                            <div className="flex flex-col gap-2">
                                {q.options.map((opt, i) => {
                                    const isRight = normalise(opt.idiom) === normalise(q.idiom)
                                    const wasChosen = normalise(selected) === normalise(opt.idiom)
                                    return (
                                        <div key={i}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
                                            style={{
                                                borderColor: isRight ? "#34d399" : wasChosen ? "#ef4444" : dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
                                                background: isRight ? "rgba(52,211,153,0.08)" : wasChosen ? "rgba(239,68,68,0.08)" : "transparent",
                                                color: isRight ? "#34d399" : wasChosen ? "#ef4444" : dm ? "#6B7280" : "#9CA3AF",
                                            }}>
                                            <span className="text-xs font-bold w-5 shrink-0">{["A", "B", "C", "D"][i]}</span>
                                            <span>{opt.idiom}</span>
                                            {isRight && <span className="ml-auto">✓</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl border p-5"
                        style={{
                            borderColor: dm ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)",
                            background: dm ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.04)",
                        }}>
                        <p className="text-lg font-bold text-indigo-400 mb-3">"{q.idiom}"</p>
                        <div className="flex flex-col gap-1 mb-3">
                            <p className={`text-sm ${textMain}`}>
                                <span className="text-xs text-gray-500 mr-2">EN</span>{q.item.meaning_en}
                            </p>
                            <p className={`text-sm ${textMain}`}>
                                <span className="text-xs text-gray-500 mr-2">VI</span>{q.item.meaning_vi}
                            </p>
                        </div>
                        <p className={`text-sm italic ${textSub}`}>"{q.item.example}"</p>
                    </div>

                    <BigBtn onClick={next} color="#6366f1">
                        {qIndex + 1 >= total ? "See Results →" : "Next Question →"}
                    </BigBtn>
                </div>
            )}
        </div>
    )
}

// ── END SCREEN ────────────────────────────────────────────────────────────

function EndScreen({ score, total, results, onRestart, darkMode: dm }) {
    const [syncStatus, setSyncStatus] = useState(null)
    const firebaseReady = isFirebaseConfigured()

    useEffect(() => {
        if (!firebaseReady) return
        setSyncStatus("syncing")
        flushToFirebase().then(result => {
            setSyncStatus(result.ok ? "done" : "error")
        })
    }, [firebaseReady])

    const pct = Math.round((score / total) * 100)
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"
    const msg = pct >= 80 ? "Excellent work!" : pct >= 50 ? "Good effort!" : "Keep practicing!"

    const wrongThisSession = results.filter(r => !r.correct).length
    const newWeakCount = getWeakIdiomIds().length

    const card = dm ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
    const muted = dm ? "text-gray-400" : "text-gray-500"

    return (
        <div className="flex flex-col items-center gap-6 pt-4">
            <div className="text-6xl">{emoji}</div>
            <div className="text-center">
                <h2 className={`text-2xl font-bold mb-1 ${dm ? "text-white" : "text-gray-800"}`}>{msg}</h2>
                <p className={`text-sm ${muted}`}>You scored {score} out of {total}</p>
            </div>

            <div className={`w-full rounded-2xl border p-6 ${card}`}>
                <div className="flex justify-around">
                    {[
                        { label: "Correct", value: score, color: "#34d399" },
                        { label: "Wrong", value: total - score, color: "#f87171" },
                        { label: "Score", value: `${pct}%`, color: "#6366f1" },
                    ].map(s => (
                        <div key={s.label} className="text-center">
                            <p className="text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                            <p className={`text-xs mt-1 ${muted}`}>{s.label}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-5 rounded-full h-2 overflow-hidden"
                    style={{ background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <div className="h-2 rounded-full transition-all duration-700"
                        style={{
                            width: `${pct}%`,
                            background: pct >= 80 ? "#34d399" : pct >= 50 ? "#f59e0b" : "#ef4444",
                        }} />
                </div>
            </div>

            {newWeakCount > 0 && (
                <div className={`w-full rounded-2xl border p-4 ${card}`}
                    style={{ borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.06)" }}>
                    <p className="text-sm font-semibold text-red-400 mb-1">
                        🔁 {newWeakCount} weak idiom{newWeakCount !== 1 ? "s" : ""} to review
                    </p>
                    <p className={`text-xs ${muted}`}>
                        These are idioms where you've gotten more wrong than right.
                        Use "Review Weak" mode to drill them specifically.
                    </p>
                </div>
            )}

            {firebaseReady && (
                <p className={`text-xs ${muted}`}>
                    {syncStatus === "syncing" && "☁️ Saving progress…"}
                    {syncStatus === "done" && "✅ Progress saved to cloud"}
                    {syncStatus === "error" && "⚠️ Could not save to cloud (offline?)"}
                </p>
            )}

            <BigBtn onClick={onRestart} color="#6366f1">🔄 Play Again</BigBtn>
        </div>
    )
}

// ── ROOT EXPORT ───────────────────────────────────────────────────────────

export default function Games({ allWeeks, darkMode }) {
    const [screen, setScreen] = useState("setup")
    const [questions, setQuestions] = useState([])
    const [score, setScore] = useState(0)
    const [results, setResults] = useState([])

    function handleStart(qs) {
        setQuestions(qs)
        setScore(0)
        setResults([])
        setScreen("game")
    }

    function handleEnd(finalScore, sessionResults) {
        setScore(finalScore)
        setResults(sessionResults)
        setScreen("end")
    }

    function handleRestart() {
        window.speechSynthesis.cancel()
        setScreen("setup")
    }

    return (
        <div className="max-w-2xl mx-auto">
            {screen !== "setup" && (
                <button
                    onClick={handleRestart}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-400 transition mb-4"
                >
                    ← Back to setup
                </button>
            )}

            {screen === "setup" && (
                <SetupScreen allWeeks={allWeeks} onStart={handleStart} darkMode={darkMode} />
            )}
            {screen === "game" && (
                <GameScreen questions={questions} darkMode={darkMode} onEnd={handleEnd} />
            )}
            {screen === "end" && (
                <EndScreen
                    score={score}
                    total={questions.length}
                    results={results}
                    onRestart={handleRestart}
                    darkMode={darkMode}
                />
            )}
        </div>
    )
}
