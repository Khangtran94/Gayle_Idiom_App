import { useState, useRef, useEffect } from "react"

// ── helpers ────────────────────────────────────────────────────────────────

function buildPool(weeks, scope) {
    if (scope === "weighted") {
        return weeks.flatMap((w, i) =>
            Array(i + 1).fill(null).flatMap(() =>
                w.data.map(id => ({ ...id, weekNum: w.weekNum, label: w.label }))
            )
        )
    }
    return weeks.flatMap(w =>
        w.data.map(id => ({ ...id, weekNum: w.weekNum, label: w.label }))
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
    // multiple choice — decoys prefer same week, fill rest from all
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

function Pill({ active, onClick, children, accent = "#6366f1", dm }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition whitespace-nowrap`}
            style={{
                borderColor: active ? accent : dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)",
                background: active ? `${accent}22` : dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                color: active ? accent : dm ? "#9CA3AF" : "#6B7280",
            }}
        >
            {children}
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
    return (
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">{children}</p>
    )
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

    const toggleWeek = (n) =>
        setSelectedWeeks(prev =>
            prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
        )

    const finalCount = customQ.trim() ? parseInt(customQ) || 10 : qCount

    const canStart = gameType && (scope !== "pick" || selectedWeeks.length > 0)

    function handleStart() {
        const chosenWeeks = scope === "pick"
            ? allWeeks.filter(w => selectedWeeks.includes(w.weekNum))
            : allWeeks
        const pool = buildPool(chosenWeeks, scope)
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

    const card = dm
        ? "bg-gray-800 border-gray-700"
        : "bg-white border-gray-100"

    return (
        <div className="flex flex-col gap-6">

            {/* 01 scope */}
            <div className={`rounded-2xl border p-5 ${card}`}>
                <SectionLabel>01 — Choose scope</SectionLabel>
                <div className="flex flex-wrap gap-2 mb-3">
                    <Pill active={scope === "equal"} onClick={() => setScope("equal")} accent="#6366f1" dm={dm}>🎲 All Weeks — Equal</Pill>
                    <Pill active={scope === "weighted"} onClick={() => setScope("weighted")} accent="#a78bfa" dm={dm}>⚡ All Weeks — Weighted</Pill>
                    <Pill active={scope === "pick"} onClick={() => setScope("pick")} accent="#34d399" dm={dm}>📌 Pick Weeks</Pill>
                </div>

                {scope === "weighted" && (
                    <p className="text-xs text-gray-500 leading-relaxed mt-1 px-1">
                        ⚡ Newer weeks appear more often — great for reviewing recent content while keeping older idioms fresh.
                    </p>
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
                                    background: active
                                        ? "rgba(99,102,241,0.08)"
                                        : dm ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
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

                {/* MC sub-option */}
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

            <BigBtn onClick={handleStart} disabled={!canStart} color="#6366f1">
                {canStart ? `▶ Start — ${finalCount} Questions` : "Complete all steps above to start"}
            </BigBtn>
        </div>
    )
}

// ── GAME SCREEN ───────────────────────────────────────────────────────────

function GameScreen({ questions, darkMode: dm, onEnd }) {
    const [qIndex, setQIndex] = useState(0)
    const [input, setInput] = useState("")
    const [selected, setSelected] = useState(null)
    const [phase, setPhase] = useState("question") // "question" | "reinforcement"
    const [score, setScore] = useState(0)
    const [speaking, setSpeaking] = useState(false)
    const [hintVisible, setHintVisible] = useState(false)
    const inputRef = useRef()

    const q = questions[qIndex]
    const total = questions.length

    function checkAnswer(ans) {
        return normalise(ans) === normalise(q.idiom)
    }

    function speak() {
        setSpeaking(true)
        const u = new SpeechSynthesisUtterance(q.idiom)
        u.lang = "en-US"
        u.rate = 0.85
        u.onend = () => setSpeaking(false)
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
    }

    // auto-speak on listening questions
    useEffect(() => {
        if (q.type === "listening" && phase === "question") {
            speak()
        }
        // reset hint on every new question
        setHintVisible(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qIndex])

    // focus input when question phase starts
    useEffect(() => {
        if (phase === "question" && (q.type === "fill" || q.type === "listening")) {
            setTimeout(() => inputRef.current?.focus(), 80)
        }
    }, [phase, qIndex, q.type])

    function submit(ans) {
        const correct = checkAnswer(ans)
        if (correct) setScore(s => s + 1)
        setSelected(ans)
        setPhase("reinforcement")
        window.speechSynthesis.cancel()
    }

    function next() {
        if (qIndex + 1 >= total) {
            onEnd(score + (checkAnswer(selected) ? 0 : 0))
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
                        <span className="text-red-400">❌ {qIndex - score + (phase === "reinforcement" ? 0 : 0)}</span>
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

                            {/* Sentence */}
                            <div className="rounded-xl p-4 mb-4"
                                style={{ background: dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}>
                                <p className={`text-base leading-relaxed italic ${textMain}`}>
                                    "{q.blank}"
                                </p>
                            </div>

                            {/* Hint toggle */}
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
                                    <p className={`text-sm leading-relaxed ${textMain}`}>
                                        {q.item.meaning_en}
                                    </p>
                                </div>
                            )}

                            {/* Input */}
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
                                <p className={`text-base leading-relaxed ${textMain}`}>
                                    {q.question}
                                </p>
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

                            <button
                                onClick={speak}
                                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border font-semibold text-sm transition mb-5"
                                style={{
                                    borderColor: speaking ? "#6366f1" : dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                                    background: speaking ? "rgba(99,102,241,0.12)" : dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                                    color: speaking ? "#a5b4fc" : dm ? "#9CA3AF" : "#6B7280",
                                }}
                            >
                                <span className="text-xl">{speaking ? "🔊" : "🔇"}</span>
                                {speaking ? "Playing..." : "Tap to hear again"}
                            </button>

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

                    {/* Result banner */}
                    <div className="rounded-2xl border p-4"
                        style={{
                            borderColor: isCorrect ? "#34d399" : "#ef4444",
                            background: isCorrect ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)",
                        }}>
                        <p className="text-base font-bold mb-1"
                            style={{ color: isCorrect ? "#34d399" : "#ef4444" }}>
                            {isCorrect ? "✅ Correct!" : "❌ Not quite"}
                        </p>
                        {!isCorrect && (
                            <p className="text-sm text-gray-400">
                                Answer: <span className="text-indigo-400 font-semibold">"{q.idiom}"</span>
                            </p>
                        )}
                    </div>

                    {/* MC options revealed */}
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
                                            <span className="text-xs font-bold w-5 shrink-0">
                                                {["A", "B", "C", "D"][i]}
                                            </span>
                                            <span>{opt.idiom}</span>
                                            {isRight && <span className="ml-auto">✓</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Idiom reinforcement card */}
                    <div className="rounded-2xl border p-5"
                        style={{
                            borderColor: dm ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)",
                            background: dm ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.04)",
                        }}>
                        <p className="text-lg font-bold text-indigo-400 mb-3">"{q.idiom}"</p>
                        <div className="flex flex-col gap-1 mb-3">
                            <p className={`text-sm ${textMain}`}>
                                <span className="text-xs text-gray-500 mr-2">EN</span>
                                {q.item.meaning_en}
                            </p>
                            <p className={`text-sm ${textMain}`}>
                                <span className="text-xs text-gray-500 mr-2">VI</span>
                                {q.item.meaning_vi}
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

function EndScreen({ score, total, onRestart, darkMode: dm }) {
    const pct = Math.round((score / total) * 100)
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"
    const msg = pct >= 80 ? "Excellent work!" : pct >= 50 ? "Good effort!" : "Keep practicing!"
    const card = dm ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"

    return (
        <div className="flex flex-col items-center gap-6 pt-4">
            <div className="text-6xl">{emoji}</div>
            <div className="text-center">
                <h2 className={`text-2xl font-bold mb-1 ${dm ? "text-white" : "text-gray-800"}`}>{msg}</h2>
                <p className="text-gray-500 text-sm">You scored {score} out of {total}</p>
            </div>

            {/* Score breakdown */}
            <div className={`w-full rounded-2xl border p-6 ${card}`}>
                <div className="flex justify-around">
                    <div className="text-center">
                        <p className="text-3xl font-extrabold text-green-400">{score}</p>
                        <p className="text-xs text-gray-500 mt-1">Correct</p>
                    </div>
                    <div className="w-px" style={{ background: dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
                    <div className="text-center">
                        <p className="text-3xl font-extrabold text-red-400">{total - score}</p>
                        <p className="text-xs text-gray-500 mt-1">Wrong</p>
                    </div>
                    <div className="w-px" style={{ background: dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
                    <div className="text-center">
                        <p className="text-3xl font-extrabold text-indigo-400">{pct}%</p>
                        <p className="text-xs text-gray-500 mt-1">Score</p>
                    </div>
                </div>

                {/* Score bar */}
                <div className="mt-5 rounded-full h-2 overflow-hidden"
                    style={{ background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{
                            width: `${pct}%`,
                            background: pct >= 80 ? "#34d399" : pct >= 50 ? "#f59e0b" : "#ef4444",
                        }}
                    />
                </div>
            </div>

            <BigBtn onClick={onRestart} color="#6366f1">🔄 Play Again</BigBtn>
        </div>
    )
}

// ── ROOT EXPORT ───────────────────────────────────────────────────────────

export default function Games({ allWeeks, darkMode }) {
    const [screen, setScreen] = useState("setup") // "setup" | "game" | "end"
    const [questions, setQuestions] = useState([])
    const [score, setScore] = useState(0)

    function handleStart(qs) {
        setQuestions(qs)
        setScore(0)
        setScreen("game")
    }

    function handleEnd(finalScore) {
        setScore(finalScore)
        setScreen("end")
    }

    function handleRestart() {
        window.speechSynthesis.cancel()
        setScreen("setup")
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back button when in game or end */}
            {screen !== "setup" && (
                <button
                    onClick={handleRestart}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-400 transition mb-4"
                >
                    ← Back to setup
                </button>
            )}

            {screen === "setup" && (
                <SetupScreen
                    allWeeks={allWeeks}
                    onStart={handleStart}
                    darkMode={darkMode}
                />
            )}
            {screen === "game" && (
                <GameScreen
                    questions={questions}
                    darkMode={darkMode}
                    onEnd={handleEnd}
                />
            )}
            {screen === "end" && (
                <EndScreen
                    score={score}
                    total={questions.length}
                    onRestart={handleRestart}
                    darkMode={darkMode}
                />
            )}
        </div>
    )
}
