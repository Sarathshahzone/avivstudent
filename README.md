# Student Attendance Board

A mobile-friendly, premium daily attendance board for students. It loads attendance records from a Google Apps Script Web App (JSON API) or a published Google Sheet CSV file and presents them in a clean, glassmorphic layout.

## 🚀 Live Demo Setup (GitHub Pages)

To publish this website and share the link with your students:
1. Create a new repository on GitHub.
2. Upload all files from this directory to the repository.
3. In your repository on GitHub, go to **Settings > Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Set the branch to **`main`** (or `master`) and folder to **`/ (root)`**, then click **Save**.
6. GitHub will generate a public link (e.g., `https://username.github.io/repository-name/`).

---

## 🔗 Connecting Your Google Sheet

By default, the board is configured to load records from your default Apps Script URL. To connect a different spreadsheet in the future:
1. Open your published website or local `index.html`.
2. Click the **3-dot menu** in the top right.
3. Select **Connect Sheet**.
4. Paste your new Google Sheet published CSV URL or Apps Script URL.
5. In the **Admin Password** field, type: **`sarathanjo`**
6. Click **Connect Sheet**. The configuration is saved locally in the browser's storage and will load automatically on refreshes.

*To revert to dummy data or change the link, open the 3-dot menu again and click **Disconnect Sheet**.*

---

## 📊 CSV Column Configuration

If you connect a raw published CSV URL instead of an Apps Script API in the future, the app maps columns using the 0-based indexes configured at the top of `app.js`:
* **Column A (Index 0)**: Date
* **Column C (Index 2)**: Student Name
* **Column D (Index 3)**: Attendance Status

---

## 🎨 Tech Stack & Design
* **Frontend**: HTML5, Vanilla JavaScript (ES6)
* **Styling**: Vanilla CSS3 (Glassmorphism, custom scrollbars, float animations, mobile-first design)
* **Fonts**: Outfit (Google Fonts)
