# Delivery proof: what the server needs

> **Status (16 Nov 2026): built in `pos-backend`.** It is in
> `src/modules/order/delivery.service.ts`, `delivery-codes.ts`, `delivery-page.ts`,
> `delivery-page.controller.ts`, and the migration `1793590000000-DeliveryCodes.ts`.
> Two differences from the plan below:
> - **The code is stored as plain text** in a column that is never loaded by
>   default (`select: false`), instead of hashed. The till must be able to show
>   it, and the column never reaches a response unless DeliveryService adds it
>   for the till or owner.
> - **The customer page lives under the API prefix:** `<BACKEND_SOURCE>/<PREFIX>/d/<token>`.
>   Set `PUBLIC_API_URL` to override the address. If neither is an `http(s)` address,
>   the message goes out without the link (the code still works).

The app now supports **delivery codes**. The customer gets a code, and a delivery
is only marked delivered when the rider gives that code back, typed or scanned
from a QR. This file lists what the backend must add. The app side is done, and
it keeps working against a server without these changes (the feature simply
stays off).

Everything here sits under `/api/v1/deliveries` unless noted otherwise.

---

## 1. Setting

`PUT /deliveries/settings` gains one field:

```json
{ "enabled": true, "fee": 1000, "areas": [], "riders": true, "codes": true }
```

Save it on the company as `deliveryCodes: boolean`, and return it in the profile
under `company.deliveryCodes`.

> **Always return `company.deliveryCodes`, as `true` or `false`, never leave it out.**
> The app uses the field's presence to know the server supports codes. While it is
> missing, the app hides the "Ask for a delivery code?" question and doesn't send
> `codes`, because a server without this feature rejects the field with
> `400 "property codes should not exist"`.
> Also add `codes` to the settings DTO (for example `@IsOptional() @IsBoolean() codes?: boolean`),
> or the global `forbidNonWhitelisted` validation keeps rejecting it.

## 2. Creating a delivery

The checkout body's `delivery` object gains two optional fields:

| Field | Values | Meaning |
|---|---|---|
| `notifyBy` | `"WHATSAPP"` \| `"SMS"` | How the till will send the code |
| `customerLanguage` | `"rw"` \| `"en"` \| `"fr"` \| `"sw"` | The language for the customer's message |

When `company.deliveryCodes` is on:

- Make a **4-digit code** with a secure random generator (not `Math.random`).
  Store it **hashed** next to the order, and keep the plain code only for display
  to the till and owner (or store it encrypted).
- Make a **public token**, a random 20+ character string, and set
  `deliveryTrackUrl` to `https://<your site>/d/<token>`.
- Set `deliveryCodeRequired: true` on the order.

## 3. Order fields returned

| Field | Who gets it |
|---|---|
| `deliveryCodeRequired`, `notifyBy`, `customerLanguage`, `codeSentAt`, `arrivedAt`, `deliveryProof` | everyone who can see the delivery |
| `deliveryCode`, `deliveryTrackUrl` | **only** users with `deliveries.manage` or `sales.create`, and the owner |

> **Never send `deliveryCode` or `deliveryTrackUrl` to a user whose only delivery
> permission is `deliveries.ride`.** This is the core of the feature: if the rider
> app ever receives the code, the proof means nothing. Strip both fields in the
> list (`GET /deliveries`), in every single-order response, and in socket events.

`deliveryProof` has this shape:

```ts
{
  method: "CODE" | "QR" | "NO_CODE";
  flags?: "NO_CODE"[];
  photoUrl?: string | null;
  note?: string | null;        // the reason given when there was no code
}
```

## 4. New endpoints

### `PATCH /deliveries/:id/code-sent`
Body: `{ "via": "WHATSAPP" | "SMS" }`. Sets `codeSentAt = now`. Till and owner only.
Returns the order.

### `PATCH /deliveries/:id/arrived`
Body: `{}`. Only the rider on the order (or till and owner).
Sets `arrivedAt = now`. Returns the order. The app does not send a location.

### `POST /deliveries/:id/proof-photo`
`multipart/form-data` with a `photo` file (JPEG). Stores it, sets
`deliveryProof.photoUrl`. It is called right after `delivered`, so allow it on
orders that are already `DELIVERED`, for 30 minutes and only by the person who
marked it. Returns the order.

## 5. Changes to `PATCH /deliveries/:id/delivered`

The body may now include `proof`:

```json
{
  "payments": [{ "method": "CASH", "amount": 12000 }],
  "proof": {
    "code": "4827",
    "via": "QR"
  }
}
```

or, when the customer can't give the code:

```json
{ "proof": { "noCodeReason": "Customer lost the message" } }
```

Rules when `deliveryCodeRequired` is true:

1. **No `proof`** → `400 "This delivery needs the customer's code."`
2. **`code` given**: compare it against the stored hash.
   - Wrong → increase `codeTries` and answer
     `400 "Wrong code. 3 tries left."` (use the real number).
   - After **5** wrong tries → lock the code. Answer
     `423 "Too many wrong codes. Ask the shop to check this delivery."`, and send a
     live alert to the till and owner. Once locked, only `noCodeReason` is accepted.
   - Right → `method = via ?? "CODE"`.
3. **`noCodeReason` given** (non-empty) → `method = "NO_CODE"`, add the `NO_CODE`
   flag, and save the reason as `note`.
4. Mark the order `DELIVERED` as before.

The error `message` is shown to the rider as it is, so keep it short and plain.

## 6. No location check

The app does not send the rider's location (removed on 2026-11-16). Do not add
`AWAY` or `NO_GPS` flags and do not store positions. Proof is the customer's code,
or, without it, the reason and a photo.

## 7. Customer page `GET /d/:token` (public, no login)

A small mobile web page that shows:

- the shop name and logo, and the order status (on the way / delivered);
- **while not delivered:** the 4-digit code in large digits, and a QR containing
  exactly `SPD1:<orderId>:<code>`. The app reads this format;
- the line "Give this code only when your order is in your hands. Never by phone."
- **once delivered:** "Delivered at 14:35 by Eric. Didn't get it? Call
  0787 845 162", and **hide the code and QR**;
- text in the order's `customerLanguage`.

Give the token an expiry, for example 48 hours after delivery. Rate-limit the route.

## 8. Later: automatic SMS (paid)

When an SMS provider is added, the server can send the code itself on creation for
`notifyBy: "SMS"`, plus a "Delivered at …, not received? Call …" message after
delivery. Keep each message under 160 plain characters (no accents) so it is
billed as one SMS. Until then, the till sends the code itself with one tap, using
WhatsApp or the phone's own SMS app.

## 9. Tests to write

- A rider-only user never receives `deliveryCode` in any response.
- A wrong code counts tries, and the 6th attempt is refused.
- No code + reason → `DELIVERED`, `method NO_CODE`, flag `NO_CODE`.
- `deliveryCodes` off → the old behaviour, with no proof needed.
