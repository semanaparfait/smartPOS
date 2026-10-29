import useCart from "@/store/Cart/useCart";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { thumbUrl, type ImageFile } from "@/utils/imageUrl";

// One line on the customer display, the same shape the server sends in display.cart.
export interface DisplayItem {
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DisplayCart {
  items: DisplayItem[];
  total: number;
}

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// The till's cart as it is on screen now, including taps not saved yet.
export function currentDisplayCart(): DisplayCart {
  const { cartItems, activeCartId } = useCart.getState();
  const lines = cartItems.find((c) => c.id === activeCartId)?.items ?? [];
  const items = lines.map((line) => {
    const unitPrice = toNumber(line.product?.sellingPrice);
    return {
      name: line.product?.name ?? "Item",
      image:
        thumbUrl(line.product?.images?.[0] as ImageFile | undefined) ?? null,
      quantity: line.quantity,
      unitPrice,
      total: toNumber(line.totalPrice) || unitPrice * line.quantity,
    };
  });
  return { items, total: items.reduce((sum, i) => sum + i.total, 0) };
}

// On a till, sends the cart to its customer display as `display.preview` the
// moment it changes on screen, without waiting for the save to reach the server
// (the server's own display.cart follows once it has). Only buying-free details
// are sent: name, picture, quantity and selling price.
export function startDisplayPreview(
  send: (payload: { cart: DisplayCart }) => void,
) {
  if (useDeviceInfo.getState().deviceType !== "POS_TERMINAL")
    return { resend: () => {}, stop: () => {} };

  let last = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  // The server adds the cashier's name itself, from the signed-in account.
  const publish = () => {
    const cart = currentDisplayCart();
    const key = JSON.stringify(cart);
    if (key === last) return;
    last = key;
    send({ cart });
  };
  // Several taps in the same instant go out as one message.
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(publish, 30);
  };

  const unsubscribe = useCart.subscribe(schedule);
  return {
    resend: () => {
      last = "";
      publish();
    },
    stop: () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    },
  };
}
