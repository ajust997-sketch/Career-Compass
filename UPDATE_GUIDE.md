> Vercel users: follow VERCEL_SETUP.md and run `npm run build`. The guidance below describes the original Sites deployment.

# Daily Career Compass update

The Site is public for readers. Profiles, preferences, bookmarks and study plans remain in browser storage. Shared feeds are persisted in the BUCKET binding.

Use the connected Career Compass tool `refresh_opportunities`, then `get_opportunity_status` to read back source counts and timestamps. The Site checks the verified authenticated caller email against its secret OWNER_EMAIL setting; public readers cannot invoke writes. Confirm `canRefresh: true` in a read-only status call before attempting the writer. Never expose the email setting, service tokens or other credentials.

Preserve the public audience and the linked schedule. Do not attempt the old owner-private service-token-only writer: service access does not supply the authenticated identity now required for updates. The connected native Site tool provides the intended owner identity. If that connection is unavailable, report the blocker rather than weakening authorisation or changing sharing.

The updater fetches fixed public Codeforces, Devpost, Remotive and Hacker News feeds, stores a timestamped snapshot, and retains source-specific last-good items on failure. A six-hour interval limit can return a cached response. Read back persistence and report partial failures accurately. Routine runs do not republish or modify static exam guides, editorial salary bands, historical cutoff records or lecture mappings. Do not send messages or submit applications.

The portable Worker has its own internal scheduled handler and example daily 02:30 UTC / 08:00 Asia/Kolkata cron in portable/wrangler.jsonc. That independent deployment has not been provisioned by this Sites build. Its OWNER_EMAIL should remain unset because it does not have Sites-verified request headers.
