# Clockify REST API — compact reference

**Source of truth:** the official OpenAPI 3 spec at https://docs.clockify.me/openapi.json (about 1.3 MB, 116 paths). This file lists only the endpoints `scripts/clockify.sh` uses; last checked against the spec on 2026-09-29. All paths below are relative to `$CLOCKIFY_BASE`, e.g. `https://api.clockify.me/api/v1`. In the spec they carry a `/v1` prefix.

## Looking up details in the spec

Don't load the whole spec into context. Query only the operation you need:

```bash
SPEC=https://docs.clockify.me/openapi.json
curl -s "$SPEC" | jq '.paths | keys[] | select(test("time-entries"))'                           # find paths
curl -s "$SPEC" | jq '.paths["/v1/workspaces/{workspaceId}/time-entries/{id}"].put'            # one operation
curl -s "$SPEC" | jq '.components.schemas.UpdateTimeEntryRequest'                              # a request schema
```

The spec is public and needs no API key.

## Basics

- **Auth:** header `X-Api-Key: <key>`. The script passes this header to curl on stdin (`-H @-`), so the key never appears in argv or in a URL.
- **Regional servers:** the host gets a regional prefix: EU `euc1`, USA `use2`, UK `euw2`, AU `apse2`. Example: `https://euc1.clockify.me/api/v1`.
- **Times:** ISO 8601 in UTC, in the form `yyyy-MM-ddThh:mm:ssZ`.
- **Pagination:** query parameters `page` (default 1) and `page-size` (default 50). The response carries a `Last-Page: true|false` header. The script keeps paging with `page-size=200` until a page comes back with fewer items than that.
- **Rate limit:** the docs specify 50 req/s per add-on and workspace for `X-Addon-Token`. When the limit is hit the API returns HTTP 429 "Too many requests".
- **Errors:** the JSON body contains `message` and `code`.

## Endpoints used

| Purpose | Method + path | Notes |
|---|---|---|
| Current user | `GET /user` | `id`, `name`, `email`, `settings.timeZone` |
| Workspaces | `GET /workspaces` | |
| Projects | `GET /workspaces/{ws}/projects` | Query: `name`, `archived=false`, `page`, `page-size` |
| Tasks | `GET /workspaces/{ws}/projects/{pid}/tasks` | paginated |
| Tags | `GET /workspaces/{ws}/tags` | Query: `archived`, paginated |
| User entries | `GET /workspaces/{ws}/user/{uid}/time-entries` | Query: `start`, `end`, `hydrated=true` (includes `project`/`task` objects), `in-progress=true`, `description`, `project`, `task`, `page`, `page-size` |
| Single entry | `GET /workspaces/{ws}/time-entries/{id}` | Query: `hydrated` |
| Create entry / start timer | `POST /workspaces/{ws}/time-entries` | Body: `start` (required), `end` (omit it to start a timer), `projectId`, `taskId`, `description`, `billable`, `tagIds`, `customFields`, `type` |
| Update entry | `PUT /workspaces/{ws}/time-entries/{id}` | **Full replacement.** `start` is required. Fields that are left out get reset, so the script merges with the existing entry before sending |
| Stop timer | `PATCH /workspaces/{ws}/user/{uid}/time-entries` | Body: `{"end": "…Z"}` (required) |
| Delete entry | `DELETE /workspaces/{ws}/time-entries/{id}` | 204 No Content |

## Differences from the original draft

- Stopping a timer works exactly as the draft described: `PATCH …/user/{uid}/time-entries` with `end`. There is no separate endpoint for starting one; you POST an entry without `end`.
- Starting a new timer automatically stops a timer that is already running. The script warns about this beforehand.
- `in-progress=true` on the user entries endpoint returns the running timer. There is also `GET /workspaces/{ws}/time-entries/status/in-progress`, but it lists running entries for the whole workspace, so the script doesn't use it.

## Examples (curl, key via stdin)

```bash
printf 'X-Api-Key: %s\n' "$CLOCKIFY_API_KEY" | curl -sS -H @- \
  "$CLOCKIFY_BASE/workspaces/$CLOCKIFY_WORKSPACE/user/$CLOCKIFY_USER_ID/time-entries?start=2026-09-21T22:00:00Z&end=2026-09-28T22:00:00Z&hydrated=true&page-size=200"

printf 'X-Api-Key: %s\n' "$CLOCKIFY_API_KEY" | curl -sS -H @- -H 'Content-Type: application/json' \
  -X POST "$CLOCKIFY_BASE/workspaces/$CLOCKIFY_WORKSPACE/time-entries" \
  --data-binary '{"start":"2026-09-29T07:00:00Z","end":"2026-09-29T09:30:00Z","projectId":"<pid>","description":"Weekly Planning","billable":false}'

printf 'X-Api-Key: %s\n' "$CLOCKIFY_API_KEY" | curl -sS -H @- -H 'Content-Type: application/json' \
  -X PATCH "$CLOCKIFY_BASE/workspaces/$CLOCKIFY_WORKSPACE/user/$CLOCKIFY_USER_ID/time-entries" \
  --data-binary '{"end":"2026-09-29T16:00:00Z"}'
```
