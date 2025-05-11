// src/lib/prisma.ts
// import { PrismaClient } from '@prisma/client';

// // Declare a global variable to hold the Prisma Client instance
// declare global {
//   // eslint-disable-next-line no-var
//   var prisma: PrismaClient | undefined;
// }

// let prismaInstance: PrismaClient;

// try {
//     // Attempt to instantiate Prisma Client
//     prismaInstance =
//       global.prisma ||
//       new PrismaClient({
//         log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
//       });

//     if (process.env.NODE_ENV !== 'production') {
//       global.prisma = prismaInstance;
//     }

// } catch (e: any) {
//     if (e.message.includes('did not initialize') || e.message.includes('Cannot find module') || e.code === 'MODULE_NOT_FOUND' || e.message.includes('Error validating model')) {
//         console.error("--------------------------------------------------");
//         console.error("PRISMA CLIENT ERROR (POTENTIALLY IGNORED DUE TO LOCALSTORAGE MODE):");
//         console.error("If you intend to use Prisma, ensure DATABASE_URL is set and run 'npx prisma generate'.");
//         console.error("If using localStorage mode, this error can be ignored if Prisma is not actively used.");
//         console.error("Original Error:", e.message);
//         console.error("--------------------------------------------------");
//         // Do not throw if we are in a mode that doesn't strictly require Prisma (e.g. localStorage only)
//         // However, if prisma features are attempted, they will fail.
//         // A more robust solution might involve conditional Prisma initialization based on an env var.
//         // For now, we allow the app to start but log a clear warning.
//         // @ts-ignore - Assign a mock/dummy object if Prisma fails, to prevent hard crashes on import
//         prismaInstance = {
//            $connect: async () => console.warn("Prisma not connected (localStorage mode or error)."),
//            $disconnect: async () => {},
//            // Add mock methods for other Prisma models if needed to prevent import errors elsewhere,
//            // though ideally, code using Prisma should be conditional.
//         } as any;

//     } else {
//          console.error("Unexpected error initializing Prisma Client:", e);
//          throw e;
//     }
// }

// export const prisma = prismaInstance;
// export default prisma;

// --- Fallback for localStorage mode ---
// If Prisma is not being used, export a dummy object to satisfy imports.
// Code using these imports should be conditional based on whether a DB is configured.
export const prisma = {
    $connect: async () => console.warn("Prisma not configured (localStorage mode). DB operations will fail."),
    $disconnect: async () => {},
    // Add other model properties as undefined or mock functions if needed
    // e.g. user: undefined, task: undefined etc.
    // This helps prevent runtime errors if prisma.user.findUnique is called when prisma is not set up.
    user: undefined,
    goal: undefined,
    task: undefined,
    timerSession: undefined,
    studyMaterial: undefined,
    note: undefined,
    habit: undefined,
    habitLog: undefined,
    deck: undefined,
    flashcard: undefined,
} as any; // Use `as any` for the dummy export

export default prisma;
