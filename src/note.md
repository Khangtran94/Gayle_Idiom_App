🧠 1. Biggest Missing Piece: Memory System (IMPORTANT)

Right now:

Every session = fresh random
App forgets what user got wrong

👉 That’s the biggest limitation.

What I’d add

Track performance per idiom:

{
  idiom: "break the ice",
  correct: 3,
  wrong: 2,
  lastSeen: timestamp
}

Then modify selection:

Wrong answers → appear more often
Never-seen → high priority
Mastered → appear less

👉 This gives you “smart repetition” without AI

🔥 2. Streak System (simple but powerful)

You already have score, but streak is what creates addiction.

Add:
const [streak, setStreak] = useState(0)
const [bestStreak, setBestStreak] = useState(0)

Logic:

Correct → streak++
Wrong → streak = 0

Display:

🔥 Streak: 5
Maybe animate when increasing

👉 This alone makes people replay