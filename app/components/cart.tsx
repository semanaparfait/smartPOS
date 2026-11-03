import { brand } from "@/config/theme";
import { useT } from "@/i18n";
import useCart, { isPendingLine, stockLimit } from "@/store/Cart/useCart";
import useOrder from "@/store/Order/Order";
import useProduct from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
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

import { thumbUrl } from "@/utils/imageUrl";
import { tr } from "@/i18n";
import HoldSaleModal from "@/components/hold/HoldSaleModal";
import DeliveryDetailsModal from "@/components/delivery/DeliveryDetailsModal";
import type { DeliveryDetails } from "@/store/Delivery/useDelivery";
import useAuth from "@/store/Authentication/useAuth";
type CheckoutProps = {
  embedded?: boolean;
};

const THUMB = 52;
const STEP = 34; // quantity button size (px)

export default function Cart({ embedded = false }: CheckoutProps) {
  const cartItems = useCart((s) => s.cartItems);
  const getCart = useCart((s) => s.getCart);
  const deleteCart = useCart((s) => s.deleteCart);
  const checkoutCart = useCart((s) => s.checkoutCart);
  const addProduct = useCart((s) => s.addProduct);
  const setItemQuantity = useCart((s) => s.setItemQuantity);
  const removeLine = useCart((s) => s.removeLine);
  const askNote = useCart((s) => s.askNote);
  const t = useT();
  const products = useProduct((s) => s.products);
  const setJustCheckedOut = useOrder((s) => s.setJustCheckedOut);
  const router = useRouter();

  const [paying, setPaying] = useState(false);
  const [holding, setHolding] = useState(false);
  // Delivery shows only once the owner turned it on.
  const deliveryOn = useAuth((s) => !!s.profile?.company?.deliveryEnabled);
  const [forDelivery, setForDelivery] = useState(false);
  const [askDelivery, setAskDelivery] = useState(false);
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

  // Quantity and removal changes show instantly; useCart saves them in the
  // background and reloads the cart with an error message if saving fails.
  const handleUpdateItem = (itemId: string, quantity: number) => setItemQuantity(itemId, quantity);
  const handleRemoveItem = (itemId: string) => removeLine(itemId);

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
        text1: t("cart.saleCancelled"),
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: t("cart.cancelFailed"),
        text2: error as string,
      });
    }
  };

  const handleCheckout = async (cartId: string, delivery?: DeliveryDetails) => {
    if (paying) return;
    setPaying(true);
    try {
      const responseData = await checkoutCart(cartId, delivery);
      setAskDelivery(false);
      setForDelivery(false);

      // Paid at the door: nothing to take now, it waits on the Deliveries screen.
      if (delivery?.payOnDelivery) {
        Toast.show({
          type: "success",
          text1: tr("Delivery created"),
          text2: `${delivery.customerName} · ${tr("pays at the door")}`,
        });
        router.push("/(tabs)/deliveries" as any);
        return;
      }
      // Older backends return the order without its items; the payment screen
      // then loads it itself.
      setJustCheckedOut(Array.isArray(responseData.order?.items) ? responseData.order : null);

      if (responseData && responseData.orderId) {
        router.push({
          pathname: "/(tabs)/checkout/checkout",
          params: {
            orderId: responseData.orderId,
          },
        });
      } else {
        Toast.show({
          type: "error",
          text1: tr("System Error"),
          text2:
            tr("Checkout confirmed, but Order ID was missing from server response."),
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("cart.checkoutFailed"),
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
          {t("cart.currentSale")}
        </Text>
        <View className="flex-row items-center justify-between mt-1.5">
          <View className="flex-row items-center gap-2">
            <Text
              className={`${embedded ? "text-xl" : "text-2xl"} font-extrabold text-ink tracking-tight`}
            >
              {t("cart.title")}
            </Text>
            <View className="min-w-[26px] h-[26px] px-2 rounded-full bg-lime items-center justify-center">
              <Text className="text-ink text-xs font-extrabold">
                {totalItemsCount}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setHolding(true)}
              accessibilityLabel={tr("Hold sale")}
              className="h-9 flex-row items-center gap-1.5 rounded-lg border border-ink/10 px-3 active:bg-ivory"
            >
              <PauseIcon size={14} color={brand.ink} />
              <Text className="text-ink text-xs font-bold">{t("cart.hold")}</Text>
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
                {confirmCancel ? t("cart.tapToConfirm") : t("cart.cancel")}
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
            const imageUrl = thumbUrl(item.product?.images?.[0]);
            const showImage = !!imageUrl && !failedImages.includes(item.id);
            // Just added and not saved yet: it has no server id to change or remove.
            const busy = isPendingLine(item.id);
            const limit = stockLimit(item.product);
            const atLimit = limit !== null && item.quantity >= limit;
            const isLast = index === list.length - 1;

            return (
              <View
                key={item.id}
                className={`flex-row items-center gap-3 py-3.5 ${
                  isLast ? "" : "border-b border-ink/5"
                } ${busy ? "opacity-60" : ""}`}
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
                    {t("cart.each", { price: unitPrice.toLocaleString() })}
                  </Text>
                  {!!item.product?.sendToKitchen && (
                    <Pressable
                      onPress={() => askNote(item.product.id)}
                      hitSlop={6}
                      accessibilityLabel={`Kitchen note for ${item.product.name}`}
                      className="mt-0.5"
                    >
                      <Text
                        numberOfLines={2}
                        className={`text-xs ${item.note ? "text-ink" : "text-ink/50 underline"}`}
                      >
                        {item.note || t("cart.addNote")}
                      </Text>
                    </Pressable>
                  )}
                  {/* A warning only: the sale can still go ahead. */}
                  {(() => {
                    const canMake = products.find((p) => p.id === item.product?.id)?.canMake;
                    return canMake !== null &&
                      canMake !== undefined &&
                      item.quantity > canMake ? (
                      <Text className="text-xs mt-0.5" style={{ color: brand.danger }}>
                        {t("cart.ingredientsLeft", { count: canMake.toLocaleString() })}
                      </Text>
                    ) : null;
                  })()}
                  {!!item.product?.trackStock &&
                    item.quantity > Number(item.product.stockQuantity) && (
                      <Text className="text-xs mt-0.5" style={{ color: brand.danger }}>
                        {t("cart.inStock", {
                          count: Number(item.product.stockQuantity).toLocaleString(),
                          unit: item.product.unit ?? "",
                        })}
                      </Text>
                    )}

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
                        busy
                          ? addProduct(item.product)
                          : handleUpdateItem(item.id, item.quantity + 1)
                      }
                      accessibilityLabel={tr("Increase quantity")}
                      accessibilityState={{ disabled: atLimit }}
                      className="items-center justify-center active:bg-ivory"
                      style={{ width: STEP, height: STEP }}
                    >
                      <Plus
                        size={16}
                        color={atLimit ? brand.inkDisabled : brand.ink}
                        strokeWidth={2.25}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Remove + line total */}
                <View className="items-end justify-between self-stretch">
                  <Pressable
                    onPress={() => handleRemoveItem(item.id)}
                    disabled={busy}
                    hitSlop={8}
                    accessibilityLabel={tr("Remove item")}
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
            {t("cart.items", { count: totalUnits })}
          </Text>
          <Text className="text-ink font-semibold text-sm">
            {totalAmount.toLocaleString()} RWF
          </Text>
        </View>
        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-ink/60 text-sm">{t("cart.tax")}</Text>
          <Text className="text-ink font-semibold text-sm">
            {Math.round(totalAmount * 0.18).toLocaleString()} RWF
          </Text>
        </View>

        <View className="h-px bg-ink/10 my-3.5" />

        <View
          className={`flex-row justify-between items-end ${embedded ? "mb-3" : "mb-4"}`}
        >
          <Text className="text-ink text-base font-bold">{t("cart.total")}</Text>
          <Text className="text-ink text-2xl font-extrabold tracking-tight">
            {totalAmount.toLocaleString()}
            <Text className="text-ink/40 text-sm font-bold"> RWF</Text>
          </Text>
        </View>

        {deliveryOn && (
          <View className="flex-row rounded-xl bg-ivory p-1 mb-3" style={{ gap: 4 }}>
            {[
              { value: false, label: tr("In store"), icon: "storefront-outline" as const },
              { value: true, label: tr("Delivery"), icon: "bicycle-outline" as const },
            ].map((o) => {
              const on = forDelivery === o.value;
              return (
                <Pressable
                  key={o.label}
                  onPress={() => setForDelivery(o.value)}
                  accessibilityState={{ selected: on }}
                  className={`flex-1 h-10 rounded-lg flex-row items-center justify-center ${on ? "bg-white" : ""}`}
                  style={{ gap: 6 }}
                >
                  <Ionicons name={o.icon} size={15} color={on ? brand.ink : brand.inkMuted} />
                  <Text className={`text-[13px] font-semibold ${on ? "text-ink" : "text-ink/50"}`}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => (forDelivery ? setAskDelivery(true) : handleCheckout(cartItems[0].id))}
          disabled={paying}
          className="h-14 w-full rounded-xl bg-lime active:bg-lime-dark flex-row justify-center items-center gap-2"
        >
          {paying ? (
            <>
              <ActivityIndicator size="small" color={brand.ink} />
              <Text className="text-ink font-bold text-base">{t("cart.processing")}</Text>
            </>
          ) : (
            <>
              <Text className="text-ink font-extrabold text-base">
                {forDelivery
                  ? tr("Add delivery details")
                  : t("cart.charge", { amount: totalAmount.toLocaleString() })}
              </Text>
              <ArrowRight size={18} color={brand.ink} strokeWidth={2.5} />
            </>
          )}
        </Pressable>
      </View>
      <HoldSaleModal visible={holding} onClose={() => setHolding(false)} />
      <DeliveryDetailsModal
        visible={askDelivery}
        itemsTotal={totalAmount}
        busy={paying}
        onClose={() => setAskDelivery(false)}
        onSubmit={(details) => handleCheckout(cartItems[0].id, details)}
      />
    </View>
  );
}
