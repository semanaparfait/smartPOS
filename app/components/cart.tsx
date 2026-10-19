import { brand } from "@/config/theme";
import useCart from "@/store/Cart/useCart";
import useItem from "@/store/Item/useItem";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  ImageOff,
  Minus,
  PauseIcon,
  Plus,
  Trash2Icon,
  XIcon,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

type CheckoutProps = {
  embedded?: boolean;
};

const THUMB = 52;
const STEP = 34; // quantity button size (px)

export default function Cart({ embedded = false }: CheckoutProps) {
  const { cartItems, getCart, deleteCart, checkoutCart } = useCart();
  const { removeItem, updateItem } = useItem();
  const router = useRouter();

  const [paying, setPaying] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  // Two-tap cancel: first tap arms it for 3s, second tap deletes the sale.
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load any cart already in progress (e.g. after reopening the app).
  useEffect(() => {
    getCart().catch((error) => console.error("Error fetching cart:", error));
  }, [getCart]);

  useEffect(
    () => () => {
      if (cancelTimer.current) clearTimeout(cancelTimer.current);
    },
    [],
  );

  const allItems = cartItems.flatMap((cart) => cart.items || []);
  const totalItemsCount = allItems.length;
  const totalUnits = allItems.reduce((sum, item) => sum + item.quantity, 0);

  const totalAmount = allItems.reduce((sum, item) => {
    return sum + Number(item.totalPrice ?? 0);
  }, 0);

  const handleUpdateItem = async (itemId: string, quantity: number) => {
    if (quantity <= 0) return handleRemoveItem(itemId);
    try {
      setBusyItemId(itemId);
      await updateItem(itemId, quantity);
      await getCart();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to update item",
        text2: error as string,
      });
    } finally {
      setBusyItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setBusyItemId(itemId);
      await removeItem(itemId);
      await getCart();

      Toast.show({
        type: "success",
        text1: "Item removed",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to remove item",
        text2: error as string,
      });
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDeleteCart = async (cartId: string) => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      cancelTimer.current = setTimeout(() => setConfirmCancel(false), 3000);
      return;
    }
    if (cancelTimer.current) clearTimeout(cancelTimer.current);
    setConfirmCancel(false);

    try {
      await deleteCart(cartId);
      await getCart();
      Toast.show({
        type: "success",
        text1: "Sale cancelled",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to cancel sale",
        text2: error as string,
      });
    }
  };

  const handleCheckout = async (cartId: string) => {
    if (paying) return;
    setPaying(true);
    try {
      const responseData = await checkoutCart(cartId);
      await getCart();

      Toast.show({
        type: "success",
        text1: "Checkout successful",
      });
      if (responseData && responseData.orderId) {
        router.push({
          pathname: "/checkout",
          params: {
            orderId: responseData.orderId,
          },
        });
      } else {
        Toast.show({
          type: "error",
          text1: "System Error",
          text2:
            "Checkout confirmed, but Order ID was missing from server response.",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Checkout failed",
        text2: error?.message || "Something went wrong",
      });
    } finally {
      setPaying(false);
    }
  };

  // No items yet: hide the panel entirely so products use the full width.
  // Tapping or scanning a product creates the cart and the panel appears.
  if (totalItemsCount === 0) return null;

  return (
    <View
      className="h-full flex-1 bg-white border-l border-ink/5"
      style={{
        shadowColor: brand.ink,
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: -4, height: 0 },
        elevation: 4,
      }}
    >
      {/* Header */}
      <View className="px-5 pt-5 pb-4 border-b border-ink/5">
        <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2.4px]">
          Current sale
        </Text>
        <View className="flex-row items-center justify-between mt-1.5">
          <View className="flex-row items-center gap-2">
            <Text
              className={`${embedded ? "text-xl" : "text-2xl"} font-extrabold text-ink tracking-tight`}
            >
              Cart
            </Text>
            <View className="min-w-[26px] h-[26px] px-2 rounded-full bg-lime items-center justify-center">
              <Text className="text-ink text-xs font-extrabold">
                {totalItemsCount}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              accessibilityLabel="Hold sale"
              className="h-9 flex-row items-center gap-1.5 rounded-lg border border-ink/10 px-3 active:bg-ivory"
            >
              <PauseIcon size={14} color={brand.ink} />
              <Text className="text-ink text-xs font-bold">Hold</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDeleteCart(cartItems[0].id)}
              accessibilityLabel={
                confirmCancel ? "Tap again to cancel sale" : "Cancel sale"
              }
              className={`h-9 flex-row items-center gap-1.5 rounded-lg px-3 ${
                confirmCancel
                  ? "bg-red-600"
                  : "border border-red-200 active:bg-red-50"
              }`}
            >
              <Trash2Icon
                size={14}
                color={confirmCancel ? brand.white : brand.danger}
              />
              <Text
                className={`text-xs font-bold ${
                  confirmCancel ? "text-white" : "text-red-600"
                }`}
              >
                {confirmCancel ? "Tap to confirm" : "Cancel"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Items */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 py-2"
        showsVerticalScrollIndicator={false}
      >
        {cartItems.map((cart) =>
          (cart.items || []).map((item, index, list) => {
            const unitPrice = Number(item.product?.sellingPrice ?? 0);
            const imageUrl = item.product?.images?.[0]?.url;
            const showImage = !!imageUrl && !failedImages.includes(item.id);
            const busy = busyItemId === item.id;
            const isLast = index === list.length - 1;

            return (
              <View
                key={item.id}
                className={`flex-row items-center gap-3 py-3.5 ${
                  isLast ? "" : "border-b border-ink/5"
                } ${busy ? "opacity-50" : ""}`}
              >
                {/* Thumbnail — explicit size: className sizing isn't applied to Image here */}
                <View
                  className="rounded-xl bg-ivory items-center justify-center overflow-hidden"
                  style={{ width: THUMB, height: THUMB }}
                >
                  {showImage ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: THUMB - 8, height: THUMB - 8 }}
                      resizeMode="contain"
                      onError={() =>
                        setFailedImages((prev) => [...prev, item.id])
                      }
                    />
                  ) : (
                    <ImageOff size={18} color={brand.inkDisabled} />
                  )}
                </View>

                {/* Name, unit price, stepper */}
                <View className="flex-1">
                  <Text
                    numberOfLines={2}
                    className="text-ink text-sm font-semibold leading-[18px]"
                  >
                    {item.product?.name}
                  </Text>
                  <Text className="text-ink/40 text-xs mt-0.5">
                    {unitPrice.toLocaleString()} each
                  </Text>

                  {/* Quantity stepper: [ − ] qty [ + ] in one bordered group */}
                  <View
                    className="flex-row items-center self-start mt-2 rounded-lg border border-ink/10 bg-white overflow-hidden"
                    style={{ height: STEP }}
                  >
                    <Pressable
                      onPress={() =>
                        handleUpdateItem(item.id, item.quantity - 1)
                      }
                      disabled={busy}
                      accessibilityLabel={
                        item.quantity <= 1 ? "Remove item" : "Decrease quantity"
                      }
                      className="items-center justify-center active:bg-ivory"
                      style={{ width: STEP, height: STEP }}
                    >
                      {item.quantity <= 1 ? (
                        <Trash2Icon size={15} color={brand.danger} />
                      ) : (
                        <Minus size={16} color={brand.ink} strokeWidth={2.25} />
                      )}
                    </Pressable>
                    <View
                      className="h-full items-center justify-center bg-ivory border-x border-ink/10"
                      style={{ minWidth: STEP + 4 }}
                    >
                      <Text className="text-ink text-sm font-extrabold px-2">
                        {item.quantity}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        handleUpdateItem(item.id, item.quantity + 1)
                      }
                      disabled={busy}
                      accessibilityLabel="Increase quantity"
                      className="items-center justify-center active:bg-ivory"
                      style={{ width: STEP, height: STEP }}
                    >
                      <Plus size={16} color={brand.ink} strokeWidth={2.25} />
                    </Pressable>
                  </View>
                </View>

                {/* Remove + line total */}
                <View className="items-end justify-between self-stretch">
                  <Pressable
                    onPress={() => handleRemoveItem(item.id)}
                    disabled={busy}
                    hitSlop={8}
                    accessibilityLabel="Remove item"
                    className="w-6 h-6 rounded-full items-center justify-center active:bg-ink/5"
                  >
                    <XIcon size={15} color={brand.inkDisabled} />
                  </Pressable>
                  <Text className="text-ink text-[15px] font-extrabold tracking-tight">
                    {(unitPrice * item.quantity).toLocaleString()}
                    <Text className="text-ink/40 text-[10px] font-semibold">
                      {" "}
                      RWF
                    </Text>
                  </Text>
                </View>
              </View>
            );
          }),
        )}
      </ScrollView>

      {/* Summary + pay */}
      <View className="px-5 pt-4 pb-5 bg-ivory border-t border-ink/5">
        <View className="flex-row justify-between items-center">
          <Text className="text-ink/60 text-sm">
            Items ({totalUnits})
          </Text>
          <Text className="text-ink font-semibold text-sm">
            {totalAmount.toLocaleString()} RWF
          </Text>
        </View>
        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-ink/60 text-sm">Tax (18% VAT)</Text>
          <Text className="text-ink font-semibold text-sm">
            {Math.round(totalAmount * 0.18).toLocaleString()} RWF
          </Text>
        </View>

        <View className="h-px bg-ink/10 my-3.5" />

        <View
          className={`flex-row justify-between items-end ${embedded ? "mb-3" : "mb-4"}`}
        >
          <Text className="text-ink text-base font-bold">Total</Text>
          <Text className="text-ink text-2xl font-extrabold tracking-tight">
            {totalAmount.toLocaleString()}
            <Text className="text-ink/40 text-sm font-bold"> RWF</Text>
          </Text>
        </View>

        <Pressable
          onPress={() => handleCheckout(cartItems[0].id)}
          disabled={paying}
          className="h-14 w-full rounded-xl bg-lime active:bg-lime-dark flex-row justify-center items-center gap-2"
        >
          {paying ? (
            <>
              <ActivityIndicator size="small" color={brand.ink} />
              <Text className="text-ink font-bold text-base">Processing...</Text>
            </>
          ) : (
            <>
              <Text className="text-ink font-extrabold text-base">
                Charge {totalAmount.toLocaleString()} RWF
              </Text>
              <ArrowRight size={18} color={brand.ink} strokeWidth={2.5} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
