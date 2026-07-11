# Loyalty Card System — Progress Log

Resumable checklist. Full plan: `.claude/plans/memoized-mixing-sifakis.md` (see also chat history if plan file unavailable in a new session).

Stack facts a fresh session needs: Django DRF **TokenAuthentication** (not JWT), staff = `is_staff` via `IsAdminUser`. Order model has `total_cents`, paid-flow hooks in `backend/orders/views.py` (`payplug_ipn`, `verify_payment`). Threshold €16 = 1600 cents, max 10 points.

## Phases

- [x] 1. Backend `loyalty` app: models (LoyaltyAccount, QRToken, LoyaltyTransaction, AuditLog), migrations, admin.py, INSTALLED_APPS
- [x] 2. Backend crypto (Fernet EncryptedTextField) + QR HMAC sign/verify + PNG gen (`qrcode[pil]`)
- [x] 3. Backend services.py (business logic: award_point_for_order, admin_add_point, admin_remove_point, redeem_reward, reset_card, regenerate_qr)
- [x] 4. Backend serializers/permissions/throttles/views/views_staff/urls, wired into backend/backend/urls.py, requirements.txt updated
- [x] 5. Hook `award_point_for_order` into `payplug_ipn()` + `verify_payment()` in `backend/orders/views.py`
- [x] 6. loyalty/emails.py notifications (point earned / reward unlocked / redeemed)
- [x] 7. Customer frontend: `components/loyalty/LoyaltyCard.js` + `LoyaltyHistory.js`, wired into `ExtrasTab()` in `frontend/src/app/account/page.js`
- [x] 8. Staff frontend: `html5-qrcode` dep, `/staff/(protected)/loyalty/page.js`, `_components/QrScanner.js`, nav entry in `staffShell.js`
- [x] 9. `makemigrations`/`migrate`/`check` + manual e2e verification (browser-driven, both customer and staff sides)

## Status: DONE

All 9 phases complete and verified end-to-end in a real browser (chrome-devtools MCP): customer login → loyalty card renders (QR, 0/10 dots) → staff login → search customer → add point (in-store) → customer card live-updates to 1/10 with history entry → bumped to 10/10 → reward badge appears, +1 disabled → redeem → card resets to 0/10, history preserves the -10 redeem entry. `next build` and `manage.py check` both clean.

## Notes / decisions log
(append here as work progresses — anything a fresh session needs to know that isn't obvious from the code)

- `qrcode` pkg installed into `venv` + added to both requirements.txt files.
- `loyalty` app created via `python manage.py startapp loyalty`, added to INSTALLED_APPS, migrated cleanly.
- `LOYALTY_ENCRYPTION_KEY`: falls back to a SHA256-derived key from SECRET_KEY if env var unset (dev convenience) — set explicitly in production `.env`.
- Models: `LoyaltyAccount.customer_number` property derives "SR-XXXXXXXX" display code from `public_id`, no separate DB field.
- `QRToken` has a partial unique constraint (`is_active=True`) so only one active token per account at a time — regenerate = revoke old + create new.
- `LoyaltyTransaction.order` is `OneToOneField` (unique) — hard DB guarantee against double-awarding the same order.
- Bug found + fixed during browser verification: `frontend/src/app/staff/(protected)/loyalty/page.js`'s `loadAccount` was originally wrapped in `useCallback(..., [API])`, which froze a stale `authFetch` closure captured before the staff token loaded from localStorage — every click into a search result 401'd and bounced to `/staff/login`. Fixed by making it a plain async function (matches the rest of the codebase's staff-page convention — see `handleSearch`/`runAction` in the same file, or `orders/page.js`).
- `frontend/.env.local` (gitignored, local-only) had a trailing slash on `NEXT_PUBLIC_API_URL`, which broke every staff `fetch`-based call (`${API}/staff/...` → double slash → Django 404) — axios-based customer calls were unaffected because axios normalizes slashes. Fixed locally to `http://localhost:8000/api` (no trailing slash). This is a per-machine dev file, not committed; if a fresh clone hits staff-login 404s, check for this.
- `qrcode==8.2` was pip-installed into `venv` and added to both `requirements.txt` files; `html5-qrcode` was npm-installed into `frontend`.
