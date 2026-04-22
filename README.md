# Gayle's Idiom App

Gayle's Idiom App is a React-based web application designed to help learners study, practice, and memorize English idioms efficiently. It offers multiple modes of learning, bilingual support (English/Vietnamese), and an AI-powered admin dashboard for easy idiom extraction from class materials.

## 🎉 V0 — What's Complete

### Core Learning

* Browse idioms by week with auto-detected week folders — never need to touch `App.jsx` to add new weeks
* Idiom cards showing the phrase, English meaning, Vietnamese meaning, and example sentence
* EN / VI / Both language toggle
* Text-to-speech per idiom and per example sentence
* Week title displayed when selecting a week (e.g. "Going Shopping")

### 🃏 Flashcard Mode

* Flip card to reveal meaning
* Mark each idiom as ✅ Got it or 😅 Still learning
* Progress bar through the deck
* Results screen at the end with score
* Auto-reads idiom aloud when flipped

### 🗣️ Conversation Panel (Split Screen)

* Right side shows the full conversation text for the selected week
* Idioms appear **bold and underlined** directly in the conversation
* Audio player with Play / Pause / Resume / Stop controls
* Progress visualizer bar (turns yellow when paused)
* Speed control: 0.5x → 1.5x with tooltip warning ("changes apply on next play")
* Word highlight effect — the current spoken word lights up in real time

### ⚙️ Admin Tool (Hidden)

* Unlocked by clicking the app title 5 times + entering the password
* Upload a photo or PDF of Gayle's paper
* Gemini AI automatically extracts all idioms with EN meaning, VI meaning, example, context, and the full conversation text
* Review extracted idioms on screen before saving
* Export as a JSON file — drop it into the project folder and the app updates automatically

### 🎨 UI & Polish

* Dark mode / Light mode toggle
* Fully responsive — works on mobile and desktop
* Deployed on Vercel — shareable link, works on any device

---

## 🚀 V1 — What's Coming

### 🎮 Games & Memory Testing

* **Fill in the blank** — sentence with idiom removed, type or pick the answer
* **Multiple choice** — "which idiom means X?" with wrong decoys
* **Listening quiz** — hear the idiom, type what you heard

### 🧠 Smart Review System

* **Weak idiom tracker** — logs every idiom you get wrong
* **"Review weak idioms" mode** — pulls your trouble spots across all weeks
* **Spaced repetition** — idioms you got wrong come back more often

### 📈 Progress & Motivation

* Mastery progress bar per week — shows % of idioms you've "learned"
* Overall progress across all weeks
* Streak tracker — how many days in a row you've studied

### 🔊 Audio Upgrade *(requires paid TTS)*

* Real audio file generation from conversation text (ElevenLabs or Google TTS)
* Proper seek bar — click any position to jump there
* Speed change without restarting playback

### 📚 Content Improvements

* AI-generated illustration per idiom to visualize the meaning
* Related idioms suggestions — "if you know this one, try these"

---

## Tech Stack

* **Frontend Framework**: React 19
* **Build Tool**: Vite
* **Styling**: Tailwind CSS 4
* **AI Integration**: Google Generative AI (Gemini Flash)
* **Text-to-Speech**: Web Speech API
* **Deployment**: Vercel

## Getting Started

Follow these steps to run the application locally:

### 1. Clone the repository

```bash
git clone https://github.com/Khangtran94/Gayle_Idiom_App.git
cd Gayle_Idiom_App
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory and add your Google Gemini API key to enable the Admin Upload extraction feature:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port specified by Vite).

## Project Structure

```
src/
├── components/
│   ├── IdiomCard.jsx         # Individual idiom display card
│   ├── Flashcard.jsx         # Flashcard practice mode
│   ├── ConversationPanel.jsx # Conversation reader with TTS audio player
│   └── AdminUpload.jsx       # AI-powered admin tool for extracting idioms
├── data/
│   └── idioms/
│       └── week_XX/          # One folder per week, auto-scanned by the app
│           └── week_XX_idioms.json
└── App.jsx                   # Main app — routing, state, layout
```

## License

This project is created for personal learning and educational purposes.
