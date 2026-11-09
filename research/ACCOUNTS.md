# Accounts and sign-in: options and a recommendation

Design only. Nothing is built. Status: for the user to decide.
Sources for the Supabase limits: the Supabase documentation on anonymous sign-ins, identity linking and auth rate limits, read 2026-11-08. Re-check the numbers before building; they are not verified against code in this repository.

## A. What exists now

The game saves to localStorage. Online sync (src/online.js) uses a Supabase anonymous user: the user id lives in the browser, so clearing site data or changing device loses the link to the online copy. The pilot code (src/pilot.js) is the only way back today. The save-safety release (0.31.0) added three safety copies and the held state, so a bad overwrite is recoverable on the same device.

## B. Options

| Option | What the player does | Same user id kept | Needs email | Child issues | Cost to build |
|---|---|---|---|---|---|
| 1. Stay anonymous plus pilot code (today) | Writes the code down | yes | no | none | none |
| 2. Backup file (BACKUP-MY-GAME.md) | Downloads and re-loads a file | n/a | no | none | small |
| 3. Email 6-digit code, optional | Types an email, then the code | yes | yes | yes, see D | medium |
| 4. Email magic link | Clicks a link | yes | yes | yes | medium |
| 5. Social login (Google, Apple) | One tap | yes (linkIdentity) | provider holds it | yes, age gates of the providers | medium to large |
| 6. Password | Chooses a password | yes | yes | yes, plus password handling | large, not advised |

## C. Converting an anonymous player to a permanent one

Supabase keeps the same user id when an anonymous user adds an email (updateUser with an email) or links a provider (linkIdentity). Rows keyed on that id (saves, leaderboard name, any history table) stay attached with no migration. Conditions:

- Manual linking has to be switched on in the project settings (a setting change, so it is the user's to make).
- Built-in email sending is limited to 2 per hour and only to team members. Real players need a custom SMTP sender; custom SMTP is limited to 30 per hour by default and a one-time code can be re-requested only after 60 s.
- Anonymous sign-ins are limited per IP (30 per hour), which a school network with one outbound address can reach.
- Test the conversion on a separate Supabase project first, not the live one.
- Edge case: if the email already belongs to another user, linking fails. The game must say so in plain words and offer the backup file, not silently switch accounts.

## D. Privacy and children

The player base includes children. Open questions for the user, not decided here:

- UK GDPR sets the age of digital consent at 13. The ICO Children's code applies to services likely to be used by children.
- COPPA applies if US players under 13 are reachable.
- Safest default: no email field for players under 13. Ask age or let a parent act. A pilot code and a backup file need no personal data.
- Data held after conversion: email address, user id, save JSON. A deletion path (button plus server delete) is required before any email is collected.
- A privacy notice in child-readable words is needed before the first email is stored.

## E. User experience

- Never interrupt play. The offer appears in the settings sheet and once after a milestone (first landing, first plane).
- Wording: "Keep this game safe." Two buttons: "Save a backup file" and, for ages 13+ or with a parent, "Add an email".
- After the email is confirmed, the pilot-code sheet still shows the code.
- A failed or unconfirmed email changes nothing: the player stays anonymous with the same save.
- Signing in on a second device uses syncDown. The rule in RESTORE-VS-ONLINE.md applies: the online copy wins only if its progress is strictly higher, so a restored older backup can be reverted. The one-shot restored flag from that document is a precondition for accounts.

## F. Build plan

1. Backup file and restore (BACKUP-MY-GAME.md), with the restored flag. No server change, no personal data.
2. Draft E (save history table, supabase/drafts/20261105000000_save_history.sql): the user pastes it; not applied by the release manager.
3. Privacy notice and age handling, decided by the user.
4. Custom SMTP and manual linking in a test project; conversion tests.
5. Email code sign-in behind a flag, off by default. Release through the normal gate (Node tier, branch ci-ok marker on the exact sha).
6. Social login only if there is demand; each provider has its own age rules.

## G. Recommendation

Build 1 first. It gives every player a way back with no email. Add option 3 (6-digit code, optional) after the privacy decision, for 13+ or with a parent. Skip passwords. Social login later, if at all.
