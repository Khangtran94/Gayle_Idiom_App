import { useState, useEffect } from "react"
import {
    getSyncCode,
    loadFromCode,
    flushToFirebase,
    getStats,
    getWeakIdiomIds,
    isFirebaseConfigured,
} from "../utils/progressStore"

export default function SyncPanel({ darkMode: dm, onClose }) {
    const [code, setCode] = useState("")
    const [inputCode, setInputCode] = useState("")
    const [status, setStatus] = useState(null) // { type: "success"|"error"|"loading", msg }
    const [stats, setStats] = useState({})
    const [copied, setCopied] = useState(false)
    const firebaseReady = isFirebaseConfigured()

    useEffect(() => {
        setCode(getSyncCode())
        setStats(getStats())
    }, [])

    const weakCount = getWeakIdiomIds().length
    const totalPracticed = Object.keys(stats).length
    const totalAnswers = Object.values(stats).reduce((s, v) => s + v.correct + v.wrong, 0)

    async function handleLoad() {
        if (!inputCode.trim()) return
        setStatus({ type: "loading", msg: "Loading your progress…" })
        const result = await loadFromCode(inputCode)
        if (result.ok) {
            setCode(getSyncCode())
            setStats(getStats())
            setStatus({ type: "success", msg: "✅ Progress loaded! Your stats have been merged." })
            setInputCode("")
        } else {
            setStatus({ type: "error", msg: result.error })
        }
    }

    async function handleSave() {
        setStatus({ type: "loading", msg: "Saving to cloud…" })
        const result = await flushToFirebase()
        if (result.ok) {
            setStatus({ type: "success", msg: "✅ Progress saved to cloud." })
        } else {
            setStatus({ type: "error", msg: "Save failed. Check your internet connection." })
        }
    }

    function handleCopy() {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    const surface = dm
        ? "bg-gray-900 border-gray-700 text-gray-200"
        : "bg-white border-gray-200 text-gray-800"
    const muted = dm ? "text-gray-500" : "text-gray-400"
    const inputStyle = {
        background: dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        border: `1.5px solid ${dm ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
        color: dm ? "#F9FAFB" : "#111827",
        borderRadius: "0.75rem",
        padding: "0.625rem 1rem",
        fontSize: "0.875rem",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "monospace",
        letterSpacing: "0.05em",
    }

    return (
        <div className={`rounded-2xl border shadow-xl p-5 w-full max-w-sm ${surface}`}
            style={{ boxShadow: dm ? "0 8px 40px rgba(0,0,0,0.6)" : "0 8px 40px rgba(0,0,0,0.12)" }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">📊 My Progress</h3>
                {onClose && (
                    <button onClick={onClose}
                        className={`text-lg leading-none px-1 rounded hover:opacity-60 transition ${muted}`}>
                        ✕
                    </button>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                    { label: "Practiced", value: totalPracticed, color: "#6366f1" },
                    { label: "Answers", value: totalAnswers, color: "#34d399" },
                    { label: "Weak", value: weakCount, color: weakCount > 0 ? "#f87171" : "#34d399" },
                ].map(s => (
                    <div key={s.label}
                        className="rounded-xl p-3 text-center"
                        style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                        <p className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                        <p className={`text-xs mt-0.5 ${muted}`}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Sync code display */}
            <div className="mb-4">
                <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${muted}`}>
                    Your Sync Code
                </p>
                <div className="flex gap-2 items-center">
                    <div className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-center"
                        style={{
                            background: dm ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)",
                            border: "1.5px solid rgba(99,102,241,0.3)",
                            color: "#818cf8",
                            letterSpacing: "0.08em",
                        }}>
                        {code}
                    </div>
                    <button
                        onClick={handleCopy}
                        className="px-3 py-2.5 rounded-xl text-sm font-semibold transition"
                        style={{
                            background: copied ? "rgba(52,211,153,0.15)" : dm ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                            border: `1px solid ${copied ? "rgba(52,211,153,0.4)" : dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                            color: copied ? "#34d399" : dm ? "#9CA3AF" : "#6B7280",
                        }}>
                        {copied ? "✓" : "📋"}
                    </button>
                </div>
                <p className={`text-xs mt-1.5 ${muted}`}>
                    Save this code to sync your progress across devices.
                </p>
            </div>

            {/* Save to cloud */}
            {firebaseReady && (
                <button
                    onClick={handleSave}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition mb-4"
                    style={{
                        background: "rgba(99,102,241,0.12)",
                        border: "1.5px solid rgba(99,102,241,0.35)",
                        color: "#818cf8",
                    }}>
                    ☁️ Save Progress to Cloud
                </button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
                <p className={`text-xs ${muted}`}>Load from another device</p>
                <div className="flex-1 h-px" style={{ background: dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
            </div>

            {/* Load by code */}
            <div className="flex gap-2">
                <input
                    style={inputStyle}
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLoad()}
                    placeholder="e.g. sunny-apple-42"
                />
                <button
                    onClick={handleLoad}
                    disabled={!inputCode.trim() || status?.type === "loading"}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                    style={{
                        background: "rgba(99,102,241,0.15)",
                        border: "1.5px solid rgba(99,102,241,0.4)",
                        color: "#818cf8",
                        whiteSpace: "nowrap",
                    }}>
                    Load
                </button>
            </div>

            {/* Status message */}
            {status && status.type !== "loading" && (
                <p className={`text-xs mt-3 rounded-lg px-3 py-2 ${status.type === "success"
                    ? "text-green-400 bg-green-400/10"
                    : "text-red-400 bg-red-400/10"
                    }`}>
                    {status.msg}
                </p>
            )}
            {status?.type === "loading" && (
                <p className={`text-xs mt-3 ${muted}`}>{status.msg}</p>
            )}

            {/* Firebase not configured warning */}
            {!firebaseReady && (
                <p className={`text-xs mt-3 rounded-lg px-3 py-2 bg-yellow-400/10 text-yellow-400`}>
                    ⚠️ Firebase not configured yet. Cloud sync is disabled. Add your config to progressStore.js.
                </p>
            )}
        </div>
    )
}
