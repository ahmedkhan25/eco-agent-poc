// Daily query allowance for visitors who are not signed in. Set
// NEXT_PUBLIC_ANONYMOUS_DAILY_LIMIT to change it (inlined at build time).
// Default is high enough to run a live demo without hitting the sign-in wall.
export const ANONYMOUS_DAILY_LIMIT =
  Number.parseInt(process.env.NEXT_PUBLIC_ANONYMOUS_DAILY_LIMIT ?? "", 10) || 10;
