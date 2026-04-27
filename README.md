# Gayle's Idiom App

A React-based web app for learning and memorizing everyday English idioms, organized by weekly lessons. Built for bilingual learners (English / Vietnamese), it combines browsing, flashcards, games, and conversation practice into one place.

**Live demo →** Deployed on Vercel — works on any device.

---

## What You Can Do

### 📖 Browse Idioms

Pick a week from the top bar. The left panel shows idiom cards, each with:

- The idiom phrase (with 🔊 text-to-speech)
- English and/or Vietnamese meaning (switch with the **EN / VI / Both** toggle)
- An example sentence (also with 🔊)

### 🗣️ Read & Listen to Conversations

The right panel shows the full conversation for that week's topic (e.g. "Going Shopping", "Ordering at a Restaurant"). Idioms appear **bold and underlined** inside the dialogue so you can see how they're used in context.

**Audio player features:**

- ▶ Play / ⏸ Pause / ⏹ Stop controls
- Speed selector: 0.5x → 1.5x
- Progress bar (turns yellow when paused)
- Word-by-word highlight — the current spoken word lights up in real time
- Two distinct voices for different speakers

### 🃏 Flashcards

Tap a card to flip it and reveal the meaning. Then mark it:

- ✅ **Got it** — you know this one
- 😅 **Still learning** — needs more practice

At the end you see your score (how many you got vs. how many you're still learning).

### 🎮 Games

Three game types to test your memory:

| Game | How it works |
|---|---|
| ✏️ **Fill in the Blank** | Read a sentence with the idiom removed. Type the missing idiom. A 💡 Hint button shows the English meaning if you're stuck. |
| 🔤 **Multiple Choice** | See a meaning (English, Vietnamese, or random mix), pick the correct idiom from 4 options. |
| 🎧 **Listening Quiz** | Hear the idiom spoken aloud. Type what you heard. |

**Before starting**, you configure the session:

1. **Scope** — All weeks (equal or weighted), pick specific weeks, or review only your weak idioms
2. **Number of questions** — 10, 20, 30, 40, or a custom number
3. **Game type** — Fill in the Blank, Multiple Choice, or Listening Quiz

After each question, you see a **reinforcement card** with the correct answer, English meaning, Vietnamese meaning, and example sentence — so you learn even when you get it wrong.

At the end, you see your score breakdown (correct / wrong / percentage) and any weak idioms flagged for review.

### 📊 My Progress

Click **📊 My Progress** in the top-right corner to see:

- **Practiced** — how many unique idioms you've answered
- **Answers** — total questions answered across all sessions
- **Weak** — idioms where your error rate is above 50%

**Cloud sync** — Your progress is saved to Firebase. You get a unique sync code (e.g. `sunny-apple-42`) that you can use to load your stats on another device or browser.

### 🌙 Dark / Light Mode

Toggle dark mode with the ☀️/🌙 button in the top-right corner. Dark mode is the default.

---

## Weekly Topics (18 weeks)

| Week | Topic |
|---|---|
| 1 | Going Shopping |
| 2 | Returning & Exchanging |
| 3 | Buying a Car |
| 4 | Opening a Bank Account |
| 5 | Ordering at a Restaurant |
| 6 | Restaurant Complaints |
| 7 | Picking Up the Tab |
| 8 | Fast Food Ordering |
| 9 | Making a Doctor's Appointment |
| 10 | Visiting the Doctor |
| 11 | Discussing Symptoms |
| 12 | Visiting the Dentist |
| 13 | House Party |
| 14 | Making Introductions |
| 15 | Complimenting a Meal |
| 16 | Handling a Delay at the Airport |
| 17 | Lost Luggage |
| 18 | Renting a Car |

Each week contains 10–16 idioms with a full conversation dialogue.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 19 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Text-to-Speech | Web Speech API (browser built-in) |
| Progress sync | Firebase Firestore |
| AI (admin only) | Google Generative AI (Gemini) |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Khangtran94/Gayle_Idiom_App.git
cd Gayle_Idiom_App
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Project Structure

```
src/
├── components/
│   ├── IdiomCard.jsx          # Individual idiom display card with TTS
│   ├── Flashcard.jsx          # Flashcard practice mode
│   ├── ConversationPanel.jsx  # Conversation reader with TTS audio player
│   ├── Games.jsx              # Game setup, gameplay, and results screens
│   ├── SyncPanel.jsx          # Progress stats + cloud sync panel
│   └── AdminUpload.jsx        # AI-powered admin tool for extracting idioms
├── data/
│   └── idioms/
│       └── week_XX/           # One folder per week, auto-scanned
│           └── week_XX_idioms.json
├── utils/
│   └── progressStore.js       # Progress tracking + Firebase sync logic
├── App.jsx                    # Main app — routing, state, layout
└── main.jsx                   # Entry point
```

Adding a new week is as simple as dropping a `week_XX_idioms.json` file into a new `week_XX/` folder — the app picks it up automatically.

---

## License

This project is created for personal learning and educational purposes.
