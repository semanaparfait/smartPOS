# Sign-in lock: what the server needs

> **Status (17 Nov 2026): built in `pos-backend`** (not committed yet). It is in
> `src/modules/device/sign-in-lock.service.ts`, used by `auth.service.ts` (PIN
> and email sign-in) and `order/kitchen-staff.service.ts` (cook PIN), with the
> migration `1793620000000-DeviceSignInLock.ts`. Differences from the plan below:
> - **The email throttle per account stays**, raised from 5 to 10 wrong tries in
>   15 minutes. It guards an account against guesses from many devices; the device
>   lock (5) comes first, and only the device lock can be lifted by the owner.
> - **The old in-memory PIN limits per device are gone.** The database lock replaces them.
> - **No `Retry-After` header.** `retryAfter` is in the body, which the app reads first.

After too many wrong PINs or passwords, the server **locks the device** for a
while. The app shows a countdown and blocks the PIN pad and email form until
the lock ends, or until the owner or super admin unlocks the device.

The lock must be decided and stored **on the server**, per device. The app only
displays it. A lock kept only on the phone could be cleared by reinstalling the app.

---

## 1. Rules

- Count wrong attempts **per device** (`deviceId`). These all count toward the
  same counter:
  - `POST /auth/pin-login` (wrong PIN)
  - `POST /auth/login` (wrong email or password)
  - `PATCH /orders/:id/status` with a `pin` (wrong cook PIN on a kitchen screen)
- **5 wrong attempts in a row → lock.** The lock gets longer each time it happens again:

  | Lock number (since the last successful sign-in) | Length |
  |---|---|
  | 1st | 5 min |
  | 2nd | 15 min |
  | 3rd | 30 min |
  | 4th and later | 60 min |

- A **successful sign-in** resets both the counter and the lock number.
- **Unlocking** (section 4) also resets both.
- While the device is locked, refuse every attempt **without checking the PIN or
  password**, so nobody can keep guessing during the lock.
- Keep the existing throttler (429) as a general flood guard. The app handles 429 too.

Store this on the device row:

```ts
failedSignIns: number          // wrong attempts since the last success
lockCount: number              // locks since the last success (picks the length)
lockedUntil: Date | null
```

## 2. Responses

**Wrong PIN or password, not locked yet:** `401`

```json
{ "statusCode": 401, "message": "Wrong PIN", "attemptsLeft": 3 }
```

`attemptsLeft` is how many more wrong tries are allowed before the lock. The app
shows "3 tries left before this device locks".

**Locked:** `423 Locked`, on the attempt that triggers the lock and on every attempt during it:

```json
{
  "statusCode": 423,
  "message": "Too many wrong PINs. Try again in 5 minutes.",
  "lockedUntil": "2026-11-17T10:25:00.000Z",
  "retryAfter": 300
}
```

- `retryAfter` is the **seconds left**. The app uses it first, so a device whose
  clock is wrong still shows the right countdown. Also send it as the
  `Retry-After` header.
- `message` is shown to the user as-is, so write it for people.

**Throttler (429):** if possible, send `retryAfter` or the `Retry-After` header.
The app replaces Nest's "ThrottlerException" text with a plain message.

## 3. Lock status (public)

`GET /auth/lock-status/:deviceId` with no auth. The login screen calls it on open,
then every 15 s while locked, so an owner's unlock shows up there.

```json
{ "locked": true, "lockedUntil": "2026-11-17T10:25:00.000Z", "retryAfter": 241, "attemptsLeft": 0 }
```
```json
{ "locked": false, "attemptsLeft": 5 }
```

Return only this information. For an unknown device, return `{ "locked": false }`.

## 4. Unlock (owner and super admin)

`PATCH /devices/:id/unlock`, where `:id` is the device's database id (UUID), as
the other owner device actions use.

- Allowed roles: the company **owner** for their own devices, and the **super admin**
  for any device (from the website).
- Sets `lockedUntil = null`, `failedSignIns = 0`, `lockCount = 0`.
- Returns the device record.
- Write an activity log entry, for example `UNLOCK_SIGN_IN` with who did it.

## 5. Device list and realtime

- `GET /devices` and device records include `lockedUntil` and `failedSignIns`.
  The owner app shows a red "Locked" tag and a "Sign-in locked" card with
  **Unlock now**.
- When a device locks, emit to the company's owners:
  `device.locked` with `{ device }` (including `deviceName` and `lockedUntil`).
  The owner app shows a toast.
- On unlock, emit `device.updated` with `{ device }` to owners, **and**
  `signin.unlocked` on the **device socket** of that device. The locked screen
  then opens at once instead of waiting for its next 15 s check.
- Optionally, emit `signin.locked` with `{ lockedUntil, retryAfter, message }` on
  the device socket, so other screens on that device lock too.

## 6. Checks before release

1. 4 wrong PINs → `401` with `attemptsLeft` 4, 3, 2, 1.
2. 5th wrong PIN → `423`, `retryAfter` about 300.
3. The right PIN during the lock → still `423`.
4. Owner presses Unlock now → the locked tablet opens within a second
   (socket) or 15 s (polling); the counter is back to 5.
5. After the 5-minute lock ends, 5 more wrong tries → 15-minute lock.
6. A successful sign-in → the next lock is 5 minutes again.
