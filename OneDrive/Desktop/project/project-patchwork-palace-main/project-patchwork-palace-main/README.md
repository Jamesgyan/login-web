# Budget Buddy

Build a mobile-first web app called Budget Manager using React + TypeScript + Tailwind + Supabase.

Create a clean white/blue UI, large touch-friendly buttons, responsive cards, and bottom navigation on mobile. Desktop can use a sidebar.

Create Supabase authentication with two roles:

Admin

User

Pages:
Admin: Dashboard, Budget, People, Requests, Reports, Settings.
User: Dashboard, My Budget, Requests, Reports.

Create the Supabase database foundation for:
profiles, budgets, categories, contributions, expenses, requests, comments, reallocations, activity_logs, settings.

Implement login, logout, protected routes and role-based access.

Admin can access everything. Users cannot access admin pages.

Add simple demo data so the dashboard is not empty.

Keep the design simple and do not add unnecessary features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e3cb6e06-a64e-4c1c-abf8-1e78af2add54).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
