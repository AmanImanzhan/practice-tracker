// Shared links and switches for the About screen and the Sign Up / Create Account
// consent text.

// Published from the markdown source in legal/.
export const TERMS_OF_SERVICE_URL = 'https://crocus-lifter-6e2.notion.site/Terms-of-Service-Practice-Tracker-3ed27869591c80a7ab78f7241c2ff837';
export const PRIVACY_POLICY_URL = 'https://crocus-lifter-6e2.notion.site/Practice-Tracker-Privacy-Policy-3e927869591c80c28baccd3f05a144cd';

// Fallback for "Rate the App" when the native review prompt isn't available (e.g. the
// build came from TestFlight, or the OS doesn't support it) — opens the App Store
// listing's "write a review" flow directly.
export const APP_STORE_REVIEW_URL: string | null = 'https://apps.apple.com/app/id6816482349?action=write-review';

export const FEEDBACK_EMAIL = 'practicetracker.help@gmail.com';

// Reserved for a future release: these rows are hidden in the app while the flags are
// false, so the URLs below are placeholders and are never opened. To enable a row, set
// its flag to true and replace the URL with the real address.
export const SHOW_INSTAGRAM_LINK = false;
export const SHOW_SUPPORT_DEVELOPERS_LINK = false;
export const INSTAGRAM_URL = 'https://instagram.com/practicetracker';
export const SUPPORT_DEVELOPERS_URL = 'https://example.com/practice-tracker/support';
