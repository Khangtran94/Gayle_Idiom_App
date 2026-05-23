import { useEffect, useState } from "react"
import { getSyncCode } from "../utils/progressStore"

export default function SyncCodeModal({ onClose }) {
    const [code] = useState(getSyncCode)
    const [copied, setCopied] = useState(false)

    function handleCopy() {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)" }}>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(99,102,241,0.2)" }}>
                        🔐
                    </div>
                    <div>
                        <p className="font-bold text-white text-base">Save your sync code</p>
                        <p className="text-sm text-gray-400">Your progress is tied to this code</p>
                    </div>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                    This is the only way to recover your progress on another device.
                    Save it somewhere — a note, a screenshot, a message to yourself.
                </p>

                <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
                    style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
                    <span className="flex-1 font-mono text-lg font-bold tracking-widest text-indigo-300">
                        {code}
                    </span>
                    <button onClick={handleCopy}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                        style={{
                            background: copied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.07)",
                            border: `1px solid ${copied ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
                            color: copied ? "#34d399" : "#9CA3AF",
                        }}>
                        {copied ? "✓ Copied" : "📋 Copy"}
                    </button>
                </div>

                <div className="rounded-xl px-4 py-3 mb-5 flex gap-2 items-start"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    <span className="text-amber-400 text-sm mt-0.5">⚠️</span>
                    <p className="text-sm text-amber-400 leading-relaxed">
                        If you clear your browser without saving this, your progress will be lost.
                    </p>
                </div>

                <button onClick={onClose}
                    className="w-full py-3 rounded-xl text-sm font-bold transition"
                    style={{
                        background: "rgba(99,102,241,0.15)",
                        border: "1.5px solid rgba(99,102,241,0.5)",
                        color: "#818cf8",
                    }}>
                    Got it, I've saved my code ✓
                </button>

                <p className="text-center text-xs text-gray-600 mt-3">
                    You can always find this under 📊 My Progress
                </p>
            </div>
        </div>
    )
}