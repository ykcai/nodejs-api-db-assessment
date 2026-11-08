# Interviewer follow-ups (private)

Use these after the take-home, during a live screen-share. Ask the candidate to **walk their existing code** and describe (or sketch) the change — prefer reasoning over rewriting everything.

Both prompts are realistic product asks on top of customers / accounts / balances / transfers.

---

## 1. Idempotent transfers (`Idempotency-Key`)

### Prompt to candidate

> Clients sometimes retry `POST /transfers` when the network fails. We need to support an `Idempotency-Key` request header so the **same key + same payload** returns the original success response without moving money twice, and a **same key + different payload** returns `409 Conflict`.
>
> Walk me through where you’d change your code and data model. What happens under two concurrent requests with the same key?

### Why this works

Forces them through: request parsing → transfer path → DynamoDB write strategy → race conditions → HTTP semantics.

### What strong answers touch

- Store keys (e.g. table `IdempotencyKeys` with PK = key, or PK = `customerId` / SK = key)
- Persist response status + body (or transfer result ids) with the key
- Conditional `Put` / unique constraint so only one in-flight transfer wins
- TTL on keys (optional, shows production thinking)
- Header validation; mismatch body hash → `409`
- Mentions that deposits/withdrawals could reuse the same helper

### Red flags

- “Just check in memory / Node cache” (won’t work across Lambda instances)
- No story for concurrent double-submit
- Would debit twice then “figure it out”

---

## 2. Close an account (block further money movement)

### Prompt to candidate

> Product wants `POST /accounts/{accountId}/close`. A closed account should still be readable, but deposits, withdrawals, and transfers that use it must fail with a clear error (e.g. `409`).
>
> Step through your handlers and show what you’d change. How would you prevent a transfer that was already in flight from crediting a newly closed destination account?

### Why this works

Forces them through: account status field → every mutating path (`deposit` / `withdraw` / `transfer`) → OpenAPI/docs → conditional updates vs check-then-act.

### What strong answers touch

- Reuse existing `status` (`OPEN` → `CLOSED`); reject if balance ≠ 0 **or** allow close with balance and discuss trade-off
- Guard in deposit / withdraw / transfer (both from and to)
- Prefer DynamoDB `ConditionExpression` on `status = OPEN` (and balance for debit) so close racing a transfer can’t silently succeed
- OpenAPI: new path + error responses; seed/tests updated
- Optional: who is allowed to close (customer vs bank ops) — nice stretch, not required

### Red flags

- Only updates status; forgets transfer destination side
- Check status in app code only, no conditional write (TOCTOU race)
- Deletes the account row (breaks history / GET contract)

---

## Facilitation tips

| Level | Expectation |
|-------|-------------|
| Junior | Names the right files; adds status/header checks; may miss concurrency |
| Mid | Conditional writes / idempotency record; updates API contract |
| Senior | Races, Lambda concurrency, reuse across endpoints, operational concerns (TTL, audit) |

Timebox each follow-up to **8–12 minutes**. If they get stuck, point at one handler file and ask: “What runs first if this request hits your Lambda?”
