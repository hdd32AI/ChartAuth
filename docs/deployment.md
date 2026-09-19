# Deployment

Use a dedicated ChartAuth project and workspace. Connect only this repository.

## Frontend

Import the repository into Vercel with these settings:

| Setting          | Value       |
| ---------------- | ----------- |
| Project name     | `chartauth` |
| Framework preset | Other       |
| Root directory   | `./`        |
| Output directory | `web`       |
| Build command    | None        |
| Install command  | None        |

The root `vercel.json` provides the routes. Review the assigned domain before sharing it. Configure the final public domain in the page share-image metadata and the API origin allowlist. Custom domains require ownership and DNS configuration.

## API and storage

Apply the SQL migrations in `server/` to a dedicated database deployment. The API requires the platform URL and service-role key as protected environment values. Keep the service-role key out of the browser and repository.

Deploy `server/edge.ts` with `server/pages.mjs`, both modules in `server/views/`, `core/environment.mjs` and `core/fixtures.mjs`. Require platform JWT verification. Store the reviewer access password as its salted hash in the protected configuration table; never commit the password.

Set the public API endpoint and public platform key in `web/config.js`. Match the final frontend origin exactly in `server/edge.ts`. Add a preview origin only for its review period, then remove it. The public key does not replace password validation or database row-level security.

## Release checks

Run `npm test` and `python3 reference/benchmark_audit/reproduce.py`. On the deployed site, verify password access, worklist loading, the guided workflow, reset and replay, notes, linked sources and the financial calculator. Confirm every referenced asset loads, the page fits narrow screens and the final share image resolves. Keep the final public domain on the reviewed deployment.
