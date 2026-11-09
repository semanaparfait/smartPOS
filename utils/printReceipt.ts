// Prints a bill (before paying) or a receipt (after) on a real printer: the
// phone's print service (Wi-Fi / Bluetooth printer apps) or the browser's print
// window. Laid out for 80 mm receipt paper.
import * as Print from "expo-print";
import { Platform } from "react-native";
import type { OrderType } from "@/store/Order/OrderType";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (v: unknown) => Math.round(Number(v) || 0).toLocaleString("en-US");
const METHOD: Record<string, string> = { CASH: "Cash", MOMO: "Mobile Money", CARD: "Card", CREDIT: "Credit" };

export type PrintOptions = {
  // Shown under the order number, e.g. "Table T04".
  table?: string | null;
  // Who printed it (the worker signed in).
  printedBy?: string | null;
};

export function receiptHtml(order: OrderType, opts: PrintOptions = {}) {
  const company = order.company;
  const paid = order.status === "COMPLETED";
  const number = order.id.split("-")[0].toUpperCase();
  const when = new Date(order.createdAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const fee = Number(order.deliveryFee) || 0;
  // Where it was served: saved on the order, else what the caller knows.
  const place = order.tableName
    ? `${order.tableKind || "Table"} ${order.tableName}${order.tableArea ? ` · ${order.tableArea}` : ""}`
    : opts.table
      ? `Table ${opts.table}`
      : order.type === "DELIVERY"
        ? `Delivery${order.deliveryArea ? ` · ${order.deliveryArea}` : ""}`
        : "In store";

  const rows = order.items
    .map(
      (it) => `<tr><td>${esc(it.product?.name ?? "Item")}${it.note ? `<div class="note">${esc(it.note)}</div>` : ""}</td>
        <td class="r">${it.quantity}</td><td class="r">${money(it.totalPrice)}</td></tr>`,
    )
    .join("");

  const payments = (order.payments ?? [])
    .map((p) => `<tr><td>${esc(METHOD[p.method] ?? p.method)}</td><td class="r">${money(p.amount)}</td></tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${paid ? "Receipt" : "Bill"} #${number}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: "Courier New", ui-monospace, monospace; font-size: 12px; color: #000; width: 72mm; margin: 0 auto; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 2px; }
  .c { text-align: center; } .r { text-align: right; white-space: nowrap; }
  .muted { font-size: 11px; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  th { font-size: 11px; text-align: left; border-bottom: 1px dashed #000; padding-bottom: 3px; }
  th.r { text-align: right; }
  .note { font-size: 10px; }
  .total td { font-size: 15px; font-weight: bold; padding-top: 4px; }
  .tag { display: inline-block; border: 1px solid #000; padding: 1px 6px; font-weight: bold; margin-top: 4px; }
</style></head><body>
  <h1>${esc(company?.name ?? "SmartPOS")}</h1>
  ${company?.location ? `<div class="c muted">${esc(company.location)}</div>` : ""}
  ${company?.phone_number ? `<div class="c muted">Tel ${esc(company.phone_number)}</div>` : ""}
  ${company?.tin ? `<div class="c muted">TIN ${esc(company.tin)}</div>` : ""}
  <div class="c"><span class="tag">${paid ? "RECEIPT" : "BILL"}</span></div>
  ${order.tableName ? `<div class="c" style="font-size:15px;font-weight:bold;margin-top:4px">${esc(order.tableKind || "Table")} ${esc(order.tableName)}</div>` : ""}
  <div class="line"></div>
  <table>
    <tr><td>Order</td><td class="r">#${number}</td></tr>
    <tr><td>Served at</td><td class="r"><b>${esc(place)}</b></td></tr>
    <tr><td>Date</td><td class="r">${esc(when)}</td></tr>
    ${order.user?.name ? `<tr><td>Served by</td><td class="r">${esc(order.user.name)}</td></tr>` : ""}
    ${order.customerName ? `<tr><td>Customer</td><td class="r">${esc(order.customerName)}</td></tr>` : ""}
  </table>
  <div class="line"></div>
  <table>
    <tr><th>Item</th><th class="r">Qty</th><th class="r">RWF</th></tr>
    ${rows}
  </table>
  <div class="line"></div>
  <table>
    <tr><td>Subtotal</td><td class="r">${money(order.subtotal)}</td></tr>
    <tr><td>Tax</td><td class="r">${money(order.tax)}</td></tr>
    ${fee ? `<tr><td>Delivery</td><td class="r">${money(fee)}</td></tr>` : ""}
    <tr class="total"><td>TOTAL</td><td class="r">${money(order.total)} RWF</td></tr>
  </table>
  ${payments ? `<div class="line"></div><table>${payments}</table>` : ""}
  <div class="line"></div>
  <div class="c">${paid ? "Thank you, see you again!" : "Please check your bill before paying."}</div>
  ${opts.printedBy ? `<div class="c muted">Printed by ${esc(opts.printedBy)}</div>` : ""}
  <div class="c muted">${esc(new Date().toLocaleString("en-GB"))} · SmartPOS</div>
</body></html>`;
}

// In a browser, expo-print ignores the html and prints the whole page, so the
// receipt goes into a hidden frame and only that frame is printed.
function printInBrowser(html: string) {
  return new Promise<void>((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", visibility: "hidden" });
    let done = false;
    const cleanUp = () => setTimeout(() => frame.remove(), 1000);
    frame.onload = () => {
      if (done) return;
      done = true;
      const win = frame.contentWindow;
      if (!win) {
        frame.remove();
        return reject(new Error("Could not open the print window"));
      }
      win.onafterprint = cleanUp;
      win.focus();
      win.print(); // waits while the print window is open in most browsers
      cleanUp();
      resolve();
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

export async function printReceipt(order: OrderType, opts: PrintOptions = {}) {
  const html = receiptHtml(order, opts);
  if (Platform.OS === "web") return printInBrowser(html);
  await Print.printAsync({ html, width: 227 }); // 80 mm in points
}
