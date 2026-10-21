# Budget Manager update

This build adds a shared-room workflow without replacing the existing budget system.

## Added
- Google OAuth sign-in button plus existing email/password login.
- Shareable budget room links: `/join/<share_code>`.
- Join room after authentication.
- Admin room membership management: add existing accounts and remove members.
- Active and archived budget history.
- Edit budget name, amount, description and meeting URL.
- Optional Google Meet / Zoom meeting URL on a budget room.
- Room share/copy/open controls.
- User page for budgets they joined.
- Reports: Excel-compatible CSV download and Print/Save PDF workflow.
- Supabase migration for room codes, membership, archive state and meeting fields.
- Mobile-first UI preserved.

## Important
Actual automatic creation of a Google Meet or Zoom meeting is not included because that requires the provider's OAuth/API configuration. The room can store and share a Meet/Zoom URL now; direct meeting creation can be added later.
