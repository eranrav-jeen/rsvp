# Attendance-Validation Calling-Bot API

Machine-to-machine API for the external AI calling bot that phones **confirmed
participants** to validate their attendance. The bot (1) pulls the list of people
to call, and (2) posts back the outcome of each call.

- **Base URL:** `https://rsvp.jeenai.app`
- **Auth:** every request must send the bearer token
  `Authorization: Bearer <VALIDATION_API_KEY>` (an `X-API-Key: <token>` header is
  also accepted). The key is a shared secret stored in the server `.env`
  (`VALIDATION_API_KEY`). If the server has no key configured, the endpoints
  return `503`.
- **Content type:** `application/json`.

---

## 1. Get the call list

```
GET /api/validation/call-list
```

Returns confirmed participants who have a phone number.

**Query parameters (optional):**

| Param              | Meaning                                                        |
| ------------------ | ------------------------------------------------------------- |
| `pending=1`        | Only people not yet validated (no result recorded yet).        |
| `include_speakers=1` | Also include speakers (default: `confirmed` status only).    |

**Example**

```bash
curl -H "Authorization: Bearer $VALIDATION_API_KEY" \
  "https://rsvp.jeenai.app/api/validation/call-list?pending=1"
```

**Response `200`**

```json
{
  "event": "ככה עושים AI בממשלה",
  "count": 2,
  "participants": [
    {
      "id": 123,
      "full_name": "משה כהן",
      "organization": "משרד האוצר",
      "role": "סמנכ״ל טכנולוגיות",
      "phone": "+972501234567",
      "status": "confirmed",
      "validation_status": null,
      "validated_at": null
    },
    {
      "id": 145,
      "full_name": "דנה לוי",
      "organization": "מערך הדיגיטל",
      "role": "",
      "phone": "0529876543",
      "status": "confirmed",
      "validation_status": "no_answer",
      "validated_at": "2026-10-06T09:12:00.000Z"
    }
  ]
}
```

Use `id` as the stable key when reporting results back.

---

## 2. Report a call result

```
POST /api/validation/result
```

Send one result object, or a batch via `{ "results": [ ... ] }`.

**Fields per result**

| Field       | Required | Notes                                                                    |
| ----------- | -------- | ------------------------------------------------------------------------ |
| `id`        | yes\*    | The participant `id` from the call list. Preferred identifier.            |
| `phone`     | yes\*    | Fallback if `id` is unavailable; matched on the last 9 digits.            |
| `result`    | yes      | One of: `confirmed`, `declined`, `no_answer`, `callback`, `wrong_number`. |
| `notes`     | no       | Free text / short call summary (≤ 2000 chars). Shown to admins.           |
| `called_at` | no       | ISO-8601 timestamp of the call. Defaults to now.                          |

\* Provide `id` **or** `phone` (id wins if both are given).

**`result` values**

| Value          | Meaning                                  |
| -------------- | ---------------------------------------- |
| `confirmed`    | Confirmed they are attending.            |
| `declined`     | Said they will not attend.               |
| `no_answer`    | No answer / voicemail / unreachable.     |
| `callback`     | Asked to be called back later.           |
| `wrong_number` | Wrong or invalid number.                 |

> Note: recording a result sets only the separate `validation_status`. It does
> **not** change the person's registration status — the organizers review and act
> on `declined`/`callback` outcomes themselves.

**Example — single**

```bash
curl -X POST -H "Authorization: Bearer $VALIDATION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":123,"result":"confirmed","notes":"מגיע עם מלווה","called_at":"2026-10-06T10:05:00Z"}' \
  "https://rsvp.jeenai.app/api/validation/result"
```

**Example — batch**

```json
{
  "results": [
    { "id": 123, "result": "confirmed" },
    { "id": 145, "result": "no_answer" },
    { "phone": "+972-52-9876543", "result": "declined", "notes": "נסיעה לחו״ל" }
  ]
}
```

**Response `200`**

```json
{
  "updated": 2,
  "results": [
    { "matched": true,  "id": 123, "result": "confirmed" },
    { "matched": true,  "id": 145, "result": "no_answer" },
    { "matched": false, "error": "no participant with that phone", "phone": "+972-52-9876543" }
  ]
}
```

Each element reports whether that item matched a participant. `updated` is the
count of successful updates.

---

## Errors

| Status | Meaning                                                      |
| ------ | ----------------------------------------------------------- |
| `401`  | Missing or wrong bearer token.                               |
| `400`  | Empty body / no results provided.                           |
| `503`  | `VALIDATION_API_KEY` not configured on the server.          |

Per-item problems (bad `result`, unknown `id`/`phone`) are **not** request-level
errors — the request still returns `200` with `matched: false` and an `error`
string on that item, so a batch never fails wholesale.
