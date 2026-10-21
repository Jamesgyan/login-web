# Budget Manager – updated shared-room build

## Run
1. Install Bun 1.4+ on Windows.
2. In this folder run `bun install`.
3. Run `bun run dev`.

## Supabase
Apply your existing schema, then apply `supabase/migrations/202610060001_budget_rooms.sql`.

The new migration adds shareable room codes, room membership, archive/history fields, optional Google Meet/Zoom links, and membership RLS.

## Google sign-in
The app now has a “Continue with Google” button. In Supabase Dashboard > Authentication > Providers, enable Google and configure the OAuth credentials/redirect URL for your project. Email/password still works.

## Shared rooms
Admin creates a budget room and gets a link such as `/join/<share_code>`. A person opens the link, signs in if needed, and joins the room. Admin can add/remove people in **People & Rooms**.

## Meetings
A room can store a Google Meet or Zoom URL. Direct automatic creation of a Meet/Zoom call needs the provider's OAuth/API credentials, so this version keeps the meeting URL optional and ready for that future integration.

## History / reports
Admin can edit, archive, restore and share old budget plans. Reports includes an Excel-compatible CSV download and Print/Save PDF workflow.
