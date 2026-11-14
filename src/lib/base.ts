/** Laluan asas laman (cth. "/ukkm" di GitHub Pages; kosong apabila dihidang di akar). */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
/** Awalan laluan asas untuk pautan dalaman. */
export const u = (p: string): string => BASE + p;
