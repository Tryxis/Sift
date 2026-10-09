# Sift

Sift is a personal Steam library tracker. Organise games into Backlog, Playing, Completed, Abandoned, or Problem; record whether you played a game before on another platform; and review playtime, Steam review scores, and HowLongToBeat estimates. Filter your library and view summary metrics.

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

Open [http://localhost:5173](http://localhost:5173). The API starts alongside the frontend. Press Ctrl+C to stop both.

For sample data without starting the API or connecting to Neon, run:

```bash
npm --prefix frontend run dev:mock
```

## Built with

- **Frontend:** React, Vite, Tailwind CSS, Radix UI, and Recharts
- **Backend:** ASP.NET Core 8 Web API and Entity Framework Core
- **Database:** Neon Postgres
- **Game data:** Steam Web API, Steam review data, and HowLongToBeat estimates
