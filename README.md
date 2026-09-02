# Spendora — AI-Powered Expense Tracker 💰

Spendora is an AI-driven personal finance assistant that makes expense tracking effortless. Just describe your spending in plain language, and Spendora handles the rest — categorization, budgeting, and insights, all in one place.
🔗 **Live Demo:** [spendora-sooty.vercel.app](https://spendora-sooty.vercel.app)
## ✨ Features

- **Natural-Language Expense Entry** — Add expenses by typing (or speaking) naturally, e.g. *"Spent 250 on lunch with friends"* — no rigid forms required.
- **Automatic Categorization** — AI classifies each expense into the right category automatically.
- **Receipt OCR** — Snap or upload a receipt and let OCR extract the expense details for you.
- **Budget Goals & Alerts** — Set monthly budget goals per category and get notified when you're approaching or exceeding limits.
- **Analytics Dashboard** — Visualize spending patterns, trends, and category breakdowns at a glance.
- **Nova — Conversational AI Assistant** — Chat with Nova for personalized insights into your spending habits.
- **Downloadable PDF Reports** — Generate and download monthly spending reports.
- **Multi-Currency Support** — Manage expenses across different currencies from your profile settings.
- **Dark, 3D-Styled UI** — A modern, immersive interface designed for a smooth user experience.

## 🛠️ Tech Stack

- **Frontend:** React.js, TypeScript
- **Backend / Database:** Supabase (PostgreSQL)
- **AI / LLM:** Groq API for natural-language parsing and generative insights
- **Deployment:** Vercel

## 🚀 Getting Started

### Prerequisites
- Node.js and npm installed
- A Supabase project (URL + API key)
- A Groq API key

### Installation

```bash
git clone https://github.com/bhushithashetty79-max/Spendora.git
cd Spendora
npm install
```

### Environment Variables

Create a `.env` file in the root directory with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
```

### Run Locally

```bash
npm run dev
```

## 📦 Deployment

Spendora is deployed on **Vercel**. Push changes to the `main` branch to trigger an automatic deployment.

## 🔄 Keeping the Database Awake

This project uses Supabase's free tier, which auto-pauses after 7 days of inactivity. A GitHub Actions workflow (`.github/workflows/keep-supabase-alive.yml`) pings the database every 5 days to prevent this.

## 📄 License

This project is for portfolio/educational purposes.

## 👤 Author

**Bhushitha Shetty**
