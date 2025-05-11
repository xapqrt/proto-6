# LifeOS - Productivity and Learning Management System

## Project Overview
LifeOS is a comprehensive productivity and learning management system with features including task management, habit tracking, flash cards, study timers, and more.

## Project Structure
This project follows a standard Next.js App Router structure:

```
/app             # App Router pages and layouts
  /api           # API routes (REST endpoints)
  /dashboard     # Dashboard pages
  /login         # Authentication pages
  /signup        # User registration
  /habits        # Habit tracking
  /tasks         # Task management
  /...           # Other feature pages

/components      # Reusable React components
  /ui            # UI components (buttons, cards, etc.)
  /auth          # Authentication components
  /dashboard     # Dashboard-specific components

/hooks           # Custom React hooks
/lib             # Utility libraries and functions
/models          # Database models
/providers       # Context providers
/public          # Static assets
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with:
   ```
   JWT_SECRET=your_secure_jwt_secret_key
   MONGODB_URL=your_mongodb_connection_string
   DATABASE_NAME=lifeos_db
   NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Access the app at http://localhost:3000

## Authentication
The app uses a custom JWT-based authentication system with session cookies. Authentication is managed through:
- Middleware for route protection
- API routes for login/signup
- Client-side AuthGuard for redirection

## Database
MongoDB is used as the primary database through Mongoose.

## Technologies
- Next.js (App Router)
- React
- TypeScript
- MongoDB with Mongoose
- Tailwind CSS
- Shadcn UI components

## Known Issues and TODOs
- ⚠️ Legacy code: Some duplicate routes exist in the project and are marked as deprecated. They will be removed in a future update.
- Refactoring: Work in progress to move all components to their standard locations.

## Important Notes for MongoDB + LocalStorage Mode

*   **Authentication & Sessions:** User accounts (email, hashed passwords) and sessions are managed via MongoDB and JWT cookies.
*   **Application Data Persistence (LocalStorage):**
    *   User-specific application data (tasks, notes, goals, flashcards, materials, habits, timer sessions) is stored directly in your web browser's localStorage, keyed by the user's ID (obtained after MongoDB authentication).
    *   **Clearing Browser Data:** If you clear your browser's cache, cookies, or site data for `localhost:9002`, your application data (tasks, notes, etc.) will be **permanently lost**. User accounts will remain in MongoDB.
    *   **Different Browsers/Devices:** Application data is not synced across different web browsers or devices. Each browser on each device will have its own separate localStorage.
    *   **Incognito/Private Mode:** Data stored in incognito or private browsing windows is typically deleted when the window is closed.
*   **Security:** User credentials are more secure due to server-side hashing (bcrypt) and MongoDB storage. Session management uses secure JWT cookies.
*   **Data Backup (Application Data):** There is no automatic cloud backup for data stored in localStorage. Consider manually exporting important data if needed (e.g., exporting flashcard decks as JSON).
*   **Admin View:** The admin view (accessible by logging in with the `ADMIN_EMAIL`) reads user counts from MongoDB.

## Building for Production

1.  Ensure all environment variables (`MONGODB_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `GOOGLE_GENAI_API_KEY` if used) are correctly set for your production environment.
2.  Run the build command:
    ```bash
    npm run build
    ```
3.  Start the production server:
    ```bash
    npm run start
    ```
    Keep in mind the localStorage limitations for application data will also apply to the production build.

## Key Technologies

*   **Next.js:** React framework for full-stack web applications.
*   **React:** JavaScript library for building user interfaces.
*   **TypeScript:** Superset of JavaScript adding static typing.
*   **MongoDB & Mongoose:** NoSQL database and ODM for user authentication and data.
*   **JWT (JSON Web Tokens) & `jose` library:** For secure session management.
*   **bcrypt:** For password hashing.
*   **LocalStorage:** Used for application-specific data storage (tasks, notes, etc.).
*   **Tailwind CSS:** Utility-first CSS framework.
*   **ShadCN UI:** Re-usable components built using Radix UI and Tailwind CSS.
*   **Lucide React:** Icon library.
*   **Genkit (Google AI):** For AI-powered features (requires `GOOGLE_GENAI_API_KEY`).
*   **date-fns:** For date formatting and manipulation.
*   **React Hook Form & Zod:** For form handling and validation.
*   **Recharts:** For charting.
*   **Dnd Kit:** For drag-and-drop functionality (dashboard layout).
````