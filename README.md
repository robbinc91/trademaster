# 📈 TradeMaster

TradeMaster Pro is an offline-capable desktop application designed to streamline business operations, track multi-currency sales, manage inventory, and provide AI-driven analytics. 

Built with React, Vite, TypeScript, and Electron, it provides the smooth, responsive experience of a modern web application wrapped in the security and deep OS integration of a native desktop app.

## ✨ Key Features

* **🛒 Point of Sale & Sales History:** Effortlessly process transactions, track items sold, and manage customer details.
* **📦 Dynamic Inventory Management:** Track product stock levels, low-stock warnings, and historical purchasing costs.
* **💱 Multi-Currency & Exchange Rates:** Native support for handling transactions in multiple currencies (e.g., USD, EUR, CUP) with a centralized exchange rate manager.
* **🤝 Partner & Balance Tracking:** Manage business partners, participants, and track financial adjustments and balances seamlessly.
* **📊 Native PDF Reporting:** Instantly generate and export professional, high-quality PDF reports using Electron's native print engine (Sales Summaries, Inventory Status, P&L, and Adjustments).
* **🤖 AI Business Analyst:** Integrated with the Gemini API to provide smart, conversational insights into your business data, trends, and financial health.
* **🌍 Localization:** Built-in Language Context supporting English and Spanish.
* **🔒 Secure Local Storage:** Data is persisted locally and securely, meaning the app works perfectly offline.

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Tailwind CSS
* **Build Tool:** Vite
* **Desktop Environment:** Electron
* **Icons:** Lucide React
* **AI Integration:** Google Gemini API
* **PDF Generation:** HTML-to-PDF via Electron Native `printToPDF`

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher recommended)
* npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/robbinc91/trademaster.git](https://github.com/robbinc91/trademaster.git)
    cd trademaster
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory and add your Gemini API key for the AI Analyst feature:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

### Running the Application

* **Development Mode:**
    Starts the Vite development server and opens the Electron application.
    ```bash
    npm run dev
    ```

* **Production Build:**
    Compiles the React app and builds the final Electron executable for your operating system.
    ```bash
    npm run dist
    ```

## 📂 Project Structure Overview

\`\`\`text
trademaster/
├── electron/              # Electron main process and preload scripts
│   ├── main.cjs           # Window management & Native PDF engine
│   └── preload.cjs        # Secure IPC bridge
├── src/
│   ├── utils/             # Helper functions (Storage, HTML-to-PDF generator)
├── components/        # React UI components (Dashboard, Sales, Inventory, etc.)
├── contexts/          # React Contexts (e.g., LanguageContext)
├── services/          # External API integrations (Gemini AI)
├── App.tsx            # Main application router/layout
├── types.ts           # TypeScript interfaces
├── .env                   # Environment variables (API keys)
└── vite.config.ts         # Vite bundler configuration
\`\`\`

## 📝 PDF Reporting Architecture
TradeMaster Pro utilizes a custom-built, highly optimized PDF generation pipeline. Instead of relying on heavy third-party PDF libraries that bloat the bundle, the app generates semantic HTML/CSS strings and sends them securely via IPC to Electron's hidden Chromium engine, which natively converts them into perfect, stylable PDF documents.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/robbinc91/trademaster/issues).

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.