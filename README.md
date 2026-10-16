# Sift

Sift is a personal Steam library tracker. Organise games into Backlog, Playing, Completed, Abandoned, or Problem; record whether you played a game before on another platform; and review playtime, Steam review scores, and HowLongToBeat estimates. Filter your library, save named filter views, switch between cards and a spreadsheet-style table, and view summary metrics.

## Run locally

### Requirements

- .NET 8 SDK
- Node.js 20 or later
- A Steam Web API key
- A Neon Postgres connection string
- A public Steam game library

### Setup

Install the project dependencies from the repository root:

```bash
npm install
npm --prefix frontend install
```

Set the API secrets from `backend/Sift.Api`:

```bash
cd backend/Sift.Api
dotnet user-secrets set "Steam:ApiKey" "YOUR_STEAM_API_KEY"
dotnet user-secrets set "ConnectionStrings:Default" "YOUR_NEON_CONNECTION_STRING"
cd ../..
```

### Start Sift

From the repository root, run:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and choose **Sign in with Steam** (or **Continue as guest**). The API starts alongside the frontend. Press Ctrl+C to stop both.

To access the development app from a phone or another device on the same Wi-Fi, run:

```bash
npm run dev:lan
```

On your phone, open `http://<YOUR-IP>:5173`. 

For sample data without starting the API or connecting to Neon, run:

```bash
npm --prefix frontend run dev:mock
```

Mock mode is the guest demo on its own: changes are kept in memory and reset when the page reloads.

### Tests

```bash
dotnet test backend/Sift.sln
```

The integration tests run the real API pipeline (authentication, authorization, CSRF check) with in-memory fakes in place of the database, so they need no secrets.

## Sign-in and access

Sift has no passwords of its own. **Sign in with Steam** sends you to steamcommunity.com, Steam verifies you (including Steam Guard), and Sift checks Steam's answer server-side (OpenID 2.0) before trusting the SteamID64 it names.

Sessions are stored server-side in `user_sessions`. The browser's encrypted `__Host-sift_session` cookie (HttpOnly, Secure, SameSite=Lax) holds only a random session key, and the table stores a SHA-256 hash of that key, so a copy of the database can't be turned into a working cookie. **Sign out** ends the session on the server, so a copied cookie stops working too; **Sign out on all devices** ends every session for the account. A session lasts 30 days from the last visit (`Auth:SessionDays`), and never more than 90 days from sign-in (`Auth:MaxSessionDays`).

The cookie encryption keys are kept in Postgres (so sign-ins survive restarts), encrypted with AES-256-GCM under `DataProtection:KeyEncryptionKey`. That key exists only in the host's secrets, so the database alone can't forge a session. It's required everywhere except Development. Generate it once with `openssl rand -base64 32`, or in PowerShell with `$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)`, and set it as `DataProtection__KeyEncryptionKey`. Changing or losing it signs everyone out; no other data is affected. Every response carries a strict Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff` and `no-referrer`; HTTPS responses add HSTS; API responses are `no-store`. State-changing API requests must send `X-Sift-Request`, and requests are rate limited per account.

- **Your own library** is fully editable: status, notes, queue, saved views, imports. Notes are public by default; set a game's notes to **Private** and the server leaves them out of every response to anyone else (they aren't told a note exists).
- **Anyone else's library** can be looked up and browsed, read-only. The API enforces this, not just the UI: every write to `/api/profiles/{steamId}/…` requires the signed-in SteamID to equal `{steamId}` and returns 403 otherwise.
- **Guests** (the **Continue as guest** button, or link straight to `/?guest`, e.g. from a portfolio) always start on a seeded demo library that lives in the browser: they can try every feature, and changes reset when they leave. A banner says it's sample data and that any Steam profile can be looked up; profiles they look up come from the API, read-only (private notes stay hidden). Guests can never change anything, and their lookups are rate limited more tightly (10 per 5 minutes per address, 100 per hour across all guests) because each one spends Sift's Steam API quota. Set `Auth:GuestBrowsing` to `false` to require a sign-in for every lookup.
- To restrict who can sign in, set `Auth:AllowedSteamIds` (e.g. `Auth__AllowedSteamIds__0=7656119…`). By default any Steam account can sign in.

Hosted behind a TLS-terminating proxy (as on Render), the container sets `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` so the app sees `https`. `render.yaml` pins `AllowedHosts` to `sift-gfgh.onrender.com`, which Render's health check also uses; add any custom domain to it (semicolon-separated) before pointing the domain at the service.

Saved filter views are stored in Postgres per Steam profile and the most recently selected view is restored when that profile is opened. Status, Played Before, and Finished Hours are stored per game and profile as well. Only a profile's owner can change any of them.

## Built with

- **Frontend:** React, Vite, Tailwind CSS, Radix UI, and Recharts
- **Backend:** ASP.NET Core 8 Web API, Entity Framework Core, and Steam OpenID sign-in (AspNet.Security.OpenId.Steam)
- **Database:** Neon Postgres
- **Game data:** Steam Web API, Steam review data, and HowLongToBeat estimates
