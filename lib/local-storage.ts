// src/lib/local-storage.ts

// --- Prefix and Key Definitions ---
const APP_PREFIX = 'lifeOS_';
// USER_CREDENTIALS_PREFIX and SESSION_KEY are no longer needed here as auth moves to MongoDB/JWT
// They will be managed by the server-side session logic (e.g., cookie names)

// --- User Data Management (for application data like tasks, notes, etc.) ---

/**
 * Saves data specific to the current user to localStorage.
 * Converts Date objects to ISO strings before saving.
 * @param userId The current user's ID.
 * @param keySuffix A suffix to identify the type of data (e.g., 'tasks', 'goals').
 * @param data The data to save.
 */
export function saveUserData<T>(userId: string, keySuffix: string, data: T): void {
    if (typeof window === 'undefined' || !userId) {
        console.warn("Attempted to save user data without userId or outside browser.");
        return;
    }
    try {
        const key = `${APP_PREFIX}${userId}_${keySuffix}`;
        const replacer = (k: string, value: any) => {
            if (value instanceof Date) {
                return value.toISOString();
            }
            return value;
        };
        localStorage.setItem(key, JSON.stringify(data, replacer));
    } catch (error) {
        console.error(`Error saving ${keySuffix} to localStorage for user ${userId}:`, error);
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.message.includes('quota'))) {
             alert(`Error: Browser storage is full. Cannot save ${keySuffix}. Please clear some space or remove old data.`);
        }
    }
}

/**
 * Loads data specific to the current user from localStorage.
 * Parses ISO date strings back into Date objects.
 * @param userId The current user's ID.
 * @param keySuffix A suffix to identify the type of data (e.g., 'tasks', 'goals').
 * @returns The loaded data or null if not found or error occurred.
 */
export function loadUserData<T>(userId: string, keySuffix: string): T | null {
    if (typeof window === 'undefined' || !userId) {
        console.warn("Attempted to load user data without userId or outside browser.");
        return null;
    }
    try {
        const key = `${APP_PREFIX}${userId}_${keySuffix}`;
        const dataJson = localStorage.getItem(key);
        if (!dataJson) return null;

        const reviver = (k: string, value: any) => {
            if (typeof value === 'string') {
                const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/;
                if (isoDateRegex.test(value)) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }
            return value;
        };
        return JSON.parse(dataJson, reviver) as T;
    } catch (error) {
        console.error(`Error loading ${keySuffix} from localStorage for user ${userId}:`, error);
        return null;
    }
}


/**
 * Deletes data specific to the current user from localStorage.
 * @param userId The current user's ID.
 * @param keySuffix A suffix to identify the type of data.
 */
export function deleteUserData(userId: string, keySuffix: string): void {
    if (typeof window === 'undefined' || !userId) {
        console.warn("Attempted to delete user data without userId or outside browser.");
        return;
    }
    try {
        const key = `${APP_PREFIX}${userId}_${keySuffix}`;
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error deleting ${keySuffix} from localStorage for user ${userId}:`, error);
    }
}

// The loadUsers function that read user credentials directly from localStorage is removed.
// Admin user listing will now be handled by an API call to a protected endpoint
// that queries MongoDB.


// --- Generic Data Functions (Not user-specific, if any are needed) ---

/**
 * Saves generic data to localStorage (not tied to a specific user).
 * @param keySuffix The key suffix to store the data under (will be prefixed).
 * @param data The data to save.
 */
export function saveGenericData<T>(keySuffix: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(`${APP_PREFIX}${keySuffix}`, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving generic data for key ${keySuffix}:`, error);
    }
}

/**
 * Loads generic data from localStorage.
 * @param keySuffix The key suffix the data is stored under (will be prefixed).
 * @returns The loaded data or null.
 */
export function loadGenericData<T>(keySuffix: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const dataJson = localStorage.getItem(`${APP_PREFIX}${keySuffix}`);
        return dataJson ? JSON.parse(dataJson) : null;
    } catch (error) {
        console.error(`Error loading generic data for key ${keySuffix}:`, error);
        return null;
    }
}
