<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Stoxy - AI Portfolio Manager

Stoxy is a modern, AI-powered stock portfolio tracking application. It provides real-time insights, news, and strategic analysis for your investments.

## 🚀 Deployment Overview

The application is deployed on a **Google Cloud VM** using a high-performance stack:
*   **Frontend/Backend**: Node.js & Vite
*   **Process Management**: PM2
*   **Domain**: Accessed via `nip.io` with Google OAuth support.

## 💻 Local Development

**Prerequisites:** Node.js (v18+)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   Create a `.env` file or use local environment variables for:
   *   `GEMINI_API_KEY`: Your Google Gemini API key.

3. **Run the app:**
   ```bash
   ./start-local.sh
   ```
   *   **Frontend**: http://localhost:3000
   *   **Backend**: http://localhost:3001

## 📂 Project Structure Cleanup

The project has been streamlined:
*   **Removed Docker/Cloud Run**: Simplified deployment directly to VM.
*   **Logo Management**: Uses high-reliability Google Favicon logic globally.
*   **Authentication**: Integrated with Google OAuth.

## 🛠️ Deploying Changes

To deploy to the VM:
1. Push your changes to `main` branch.
2. Run `./deploy_manual.sh` from your local machine.
