# Work review — 29 October 2026

Everything done in today's session on the SmartPOS app (`smartPOS`), with the
backend changes it relied on (`pos-backend`). **Nothing is committed yet.**

---

## 1. Sign-in on one device at a time

- **Allow sign-in on multiple devices:** a switch on each worker's page
  (`app/(owner)/workers/employees/[id].tsx`). It saves through
  `PATCH /employees/:id/multiple-devices { allow }` (`setEmployeeMultipleDevices`
  in `store/Employee/UseEmploye.ts`).
- **Signed in elsewhere:** when a worker signs in on another device, the old one
  gets a 401 "You signed in on another device", ends the session and returns to
  sign-in (`utils/sessionGuard.ts`).

## 2. Workers with owner-like access

Workers can now be given the owner's powers (products, categories, workers,
devices, finance, settings…) and pass them on, but only the ones they have.

- **Access map:** `config/ownerAccess.ts` says which permission opens each owner
  page. It's used by the owner sidebar, the "Manage" section in the till's
  sidebar, the top menu and a "No access" screen for pages opened by link.
- **Permission picker** (`components/roles/PermissionPicker.tsx`): permissions
  the worker doesn't have are locked ("Not yours to give"). Presets, "Allow all"
  and "Clear all" skip locked ones.
- **Own row:** a worker can't change their own access or remove themselves. Their
  row shows a "You" tag and only the View button.
- **Errors:** 403 messages from the API are shown as the server writes them.
- **Backend (done):** `@RequirePermissions` on owner routes, plus the rule "You
  cannot give access you don't have".

## 3. Logout

- Sign out now calls `POST /api/v1/auth/logout` (best effort, 4-second limit)
  before clearing the session on the device (`store/Authentication/useAuth.ts`).
- When the server has already ended the session, only the device is cleared
  (`utils/endSession.ts`).

## 4. Windows build shipping old code

- **Cause:** `npm run build:windows` packaged the last web export instead of
  building a new one.
- **Fix** (`desktop/package.json`): `build:windows` now runs
  `export:web` first (`expo export --platform web --clear`), then electron-builder.

## 5. Device types

Each device is now a **Till** (`POS_TERMINAL`), **Kitchen display**
(`KITCHEN_DISPLAY`) or **Customer display** (`CUSTOMER_DISPLAY`).

- **Choosing the type:** the owner picks it when approving the device, in the
  approval banner or on the device page. It can be changed later with one tap
  (`DeviceTypeSection` in `app/(owner)/Settings/Devices/[id].tsx`).
- **Pairing:** a customer display is paired with one till under "Shows cart
  from". Tap the same till again to unpair.
- **Live changes:** the device keeps its own connection
  (`store/Realtime/useDeviceSocket.ts`, signed in with its device secret). When
  the owner changes the type, the device moves to the right screens with no
  restart.
- **Labels and icons:** `config/deviceTypes.ts`; type badges in device lists.
- **Backend (done):** device `type` and `displayFor`,
  `PATCH /devices/:id/registration {action, type}`,
  `PATCH /devices/:id/type {type, displayForId}`, and the `device.status` event.

## 6. Kitchen display

`app/(kitchen)/KitchenScreen.tsx` was rebuilt on real orders, in brand colours.

- **Columns:** New → Preparing → Ready → Served today.
- **Cards:** order number, who took it, minutes waiting (red after 15), items and
  note.
- **Buttons:** "Start preparing" and "Mark ready", plus "Back to preparing".
  Orders update live.
- **Clean-up:** the old mock kitchen screens were deleted (NewOrder, Preparing,
  Ready, Served, KitchNavbar, KitchenFooter).
- **Order statuses:** now include `PREPARING` and `READY`
  (`store/Order/OrderType.ts`; `setOrderStatus` in `store/Order/Order.ts`).
- **Kitchen permissions:** the "Kitchen" role preset is `sales.create` +
  `orders.view_all`. `kitchen.manage` was removed because the backend doesn't
  know it.

## 7. Customer display

`app/components/CustomerDisplay.tsx` shows the paired till's sale to the customer.
Nobody signs in on it.

- **Welcome screen:**
  - the shop's logo, or its first letter on lime if there's no logo
  - "Welcome to {shop name}", the location and business type
  - accepted payments, the clock and "Powered by SmartPOS"
- **During a sale** (dark design, chosen after trying a light panel and a
  "spotlight" layout):
  - **Left side:** the logo and shop name, an item count, and each product in its
    own card with its photo, price, a "×2" quantity and the line total. The item
    just added gets a lime outline.
  - **Right side:**
    - **MoMo card:** "Pay with MoMo", "To {shop}", the code in large digits and
      "Dial \*182\*8\*1\*{code}#". With no code it shows "We accept" (Cash,
      MoMo, Card) instead.
    - **"Served by" card:** the real name of the worker signed in at the till.
    - **Total:** in large lime numbers, with subtotal and tax at payment.
- **Thank-you screen:** a check that pops in, the amount and payment method,
  "Your change" for cash, and "See you again soon at {shop}". After 10 seconds it
  goes back to the welcome screen.
- **Notices:** a small notice shows only when it's reconnecting or not paired with
  a till.

**Instant updates:** the till sends what's on its screen as `display.preview`
within about 30 ms of each tap (`store/Realtime/displayPreview.ts`). The display
shows it straight away and ignores the slower server cart updates for 2.5
seconds, so it doesn't jump back.

**Backend (done):**
- **Preview relay:** passes `display.preview` on to the paired displays.
- **Cashier name:** the server adds it from the signed-in account; a name sent by
  the till is ignored.
- **MoMo code per device:** stored per device
  (`PATCH /devices/:deviceId/momo-code { momoCode }`, needs `devices.manage`). A
  display without its own code uses its till's code.
- **Where the display gets the code:** from verify and from `device.status`, which
  updates live.

**Owner's device page:** a new "MoMo code" section on approved tills and customer
displays. It takes digits only (4–12) and has Save and Remove, each with a Toast.

---

## Files changed

| Area | Files |
|---|---|
| Access | `config/ownerAccess.ts` (new), `config/permissions.ts`, `app/(owner)/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/components/ownerComponents/owner-top-navbar.tsx`, `components/roles/PermissionPicker.tsx` |
| Workers | `app/(owner)/workers/workers.tsx`, `workers/employees/[id].tsx`, `workers/employees/ViewUsers.tsx`, `store/Employee/UseEmploye.ts`, `store/Employee/EmployeeType.ts` |
| Session | `store/Authentication/useAuth.ts`, `utils/endSession.ts`, `utils/sessionGuard.ts` |
| Devices | `config/deviceTypes.ts` (new), `store/Device/DeviceType.ts`, `store/Device/useDeviceInfo.ts`, `components/devices/deviceKit.tsx`, `app/(owner)/Settings/Devices/DeviceInformation.tsx`, `app/(owner)/Settings/Devices/[id].tsx` |
| Realtime | `store/Realtime/useDeviceSocket.ts` (new), `store/Realtime/displayPreview.ts` (new), `store/Realtime/useRealtime.ts` |
| Screens | `app/index.tsx`, `app/_layout.tsx`, `app/components/DeviceVerification.tsx`, `app/components/LoginPage.tsx`, `app/components/CustomerDisplay.tsx` (new), `app/(kitchen)/KitchenScreen.tsx` |
| Orders | `store/Order/Order.ts`, `store/Order/OrderType.ts`, `components/orders/orderKit.tsx` |
| Build | `desktop/package.json` |

## Checked so far

- **Done:** TypeScript (`tsc --noEmit`) and ESLint pass on all changed files.
- **Not yet done:** running the app. The screens below still need a check on
  real devices.

## To test

1. **Approving a new device:** approve it as each type. A kitchen display should
   open the kitchen screen after sign-in, and a customer display the welcome
   screen with no sign-in.
2. **Live updates:** pair a customer display with a till and add items. Each
   should appear on the display at once with its photo, and "Served by" should
   show the worker's name.
3. **MoMo code:**
   - Set a code on the till. The display should show it within a second.
   - Remove it. The display should show "We accept".
4. **Paying:** finish a cash sale. The thank-you screen should show the change,
   then return to welcome after 10 seconds.
5. **Kitchen:** move an order through New → Preparing → Ready, then pay it at the
   till. It should land in "Served today".
6. **Worker access:**
   - Give a worker products and workers access. Those pages should appear in
     their sidebar.
   - They should be unable to give permissions they don't have.
7. **One device at a time:** sign in on two devices with a worker who isn't
   allowed multiple devices. The first device should sign out with "You signed in
   on another device".
8. **Windows build:** run `npm run build:windows` in `desktop/` and check the
   installed app has today's screens.

## Open points

- **MoMo dial format:** the display assumes MTN Rwanda MoMo Pay
  (`*182*8*1*{code}#`). Change it if you use another provider.
- **Tables on kitchen cards:** orders have no table field, so kitchen cards show
  no table.
- **Older devices:** devices activated before device secrets existed need
  **Rotate secret** on their device page before they can connect as a display.
- **Commit:** none of today's work is committed.
