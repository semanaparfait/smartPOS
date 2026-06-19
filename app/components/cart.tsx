import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { products } from "@/seed/products";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShoppingCartIcon,
  Trash2Icon,
  XIcon,
  PauseIcon,
} from "lucide-react-native";
import useCart from "@/store/Cart/useCart";
import useItem from "@/store/Item/useItem";
import Toast from "react-native-toast-message";

type CheckoutProps = {
  embedded?: boolean;
};

export default function Cart({ embedded = false }: CheckoutProps) {
  const { cartItems, addToCart, getCart, deleteCart, checkoutCart } = useCart();
  const { removeItem, updateItem } = useItem();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Fetch cart data on component mount
  useEffect(() => {
    const fetchAndValidateCart = async () => {
      try {
        setLoading(true);
        const currentCarts = await getCart();
        console.log("Fetched cart:", currentCarts);
      } catch (error) {
        console.error("Error fetching cart:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAndValidateCart();
  }, [getCart]);

  const totalItemsCount = cartItems.flatMap((cart) => cart.items || []).length;

  const totalAmount = cartItems
    .flatMap((cart) => cart.items || [])
    .reduce((sum, item) => {
      return sum + Number(item.totalPrice ?? 0);
    }, 0);

  const handleCreateCart = async (showToast = true) => {
    try {
      setLoading(true);
      await addToCart();
      await getCart();

      if (showToast) {
        Toast.show({
          type: "success",
          text1: "Cart created successfully",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to create cart",
        text2: error as string,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (itemId: string, quantity: number) => {
    try {
      await updateItem(itemId, quantity);
      await getCart();
      Toast.show({
        type: "success",
        text1: "Item updated successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to update item",
        text2: error as string,
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
      await getCart();

      Toast.show({
        type: "success",
        text1: "Item removed successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to remove item",
        text2: error as string,
      });
    }
  };

  const handleDeleteCart = async (cartId: string) => {
    try {
      await deleteCart(cartId);
      await getCart();
      Toast.show({
        type: "success",
        text1: "Cart deleted successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to delete cart",
        text2: error as string,
      });
    }
  };

const handleCheckout = async (cartId: string) => {
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
        text2: "Checkout confirmed, but Order ID was missing from server response.",
      });
    }

  } catch (error: any) {
    Toast.show({
      type: "error",
      text1: "Checkout failed",
      text2: error?.message || "Something went wrong",
    });
  }
};
  if (loading && cartItems.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#14532d" />
        <Text className="text-gray-500 mt-4 font-medium">
          Loading session layout...
        </Text>
      </View>
    );
  }

  return (
    <View className="shadow h-full flex-1">
      {cartItems.length === 0 || totalItemsCount === 0 ? (
        <View className="flex-1 justify-center items-center px-6 bg-gray-50">
          <View className="mb-4">
            <Image
              source={require("@/assets/images/cart/cart.png")}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
          </View>
          <Text className="font-bold text-xl text-gray-800">
            No Active Cart Session
          </Text>
          <Text className="text-gray-500 text-center mt-2 max-w-[280px] text-sm leading-5">
            Establish a brand new active cart instance to begin adding terminal
            stock items and speed up point-of-sale operations.
          </Text>

          <TouchableOpacity
            onPress={() => handleCreateCart(true)}
            className="mt-6 bg-green-900 px-6 py-3 rounded-xl flex-row items-center active:scale-95 shadow-sm"
          >
            <ShoppingCartIcon size={18} color="white" />
            <Text className="text-white text-sm font-bold ml-2">
              Create New Cart
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-100 flex-row justify-between items-center">
            <Text
              className={`${embedded ? "text-xl" : "text-2xl"} font-bold text-gray-900`}
            >
              Cart ({totalItemsCount})
            </Text>
            <View className="flex-row gap-4">
              <TouchableOpacity className="flex-row items-center active:scale-95">
                <PauseIcon size={16} color="#14532d" />
                <Text className="text-green-900 text-xs font-bold ml-1">
                  Hold Sale
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteCart(cartItems[0].id)}
                className="flex-row items-center active:scale-95"
              >
                <Trash2Icon size={16} color="#dc2626" />
                <Text className="text-red-600 text-xs font-bold ml-1">
                  Cancel Sale
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            className="px-6 pt-4"
            showsVerticalScrollIndicator={false}
          >
            {cartItems.map((cart) =>
              (cart.items || []).map((item) => (
                <View
                  key={item.id}
                  className="flex-row gap-2 justify-between items-center mb-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
                >
                  <View>
                    <Image
                      source={{ uri: item.product?.images[0]?.url }}
                      className="w-16 h-16 rounded-lg"
                    />
                  </View>
                  <View className="flex-row gap-4 items-center">
                    <View className="flex-col gap-2">
                      <Text className="font-semibold text-gray-800 text-base">
                        {item.product?.name}
                      </Text>
                      <View className="flex-row items-center gap-3 mt-1">
                        <TouchableOpacity
                          onPress={() =>
                            handleUpdateItem(item.id, item.quantity - 1)
                          }
                          className="border border-gray-300 p-1.5 rounded-lg active:bg-gray-50"
                        >
                          <Ionicons name="remove" size={14} color="#333" />
                        </TouchableOpacity>
                        <Text className="text-base font-bold text-gray-900">
                          {item.quantity}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            handleUpdateItem(item.id, item.quantity + 1)
                          }
                          className="border border-gray-300 p-1.5 rounded-lg active:bg-gray-50"
                        >
                          <Ionicons name="add" size={14} color="#333" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View className="flex-col items-end justify-between h-full min-h-[60px]">
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item.id)}
                      className="p-1 hit-slop"
                    >
                      <XIcon size={18} color="#dc2626" />
                    </TouchableOpacity>
                    <Text className="text-base font-bold text-gray-900">
                      {(
                        (item.product?.sellingPrice ?? 0) * item.quantity
                      ).toLocaleString()}{" "}
                      RWF
                    </Text>
                  </View>
                </View>
              )),
            )}
          </ScrollView>

          <View className="p-5 border-t border-gray-200 bg-gray-50">
            <View
              className={`flex-row justify-between items-center ${embedded ? "mb-3" : "mb-4"}`}
            >
              <Text className="text-gray-600 text-sm">Total Amount</Text>
              <Text className="font-black text-lg text-gray-900">
                {totalAmount.toLocaleString()} RWF
              </Text>
            </View>
            <View
              className={`flex-row justify-between items-center ${embedded ? "mb-4" : "mb-5"}`}
            >
              <Text className="text-gray-600 text-sm">Tax (18% VAT)</Text>
              <Text className="font-bold text-gray-800">
                {Math.round(totalAmount * 0.18).toLocaleString()} RWF
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleCheckout(cartItems[0].id)}
              className="bg-green-900 w-full rounded-xl shadow p-3.5 active:scale-[0.98] flex-row justify-center items-center"
            >
              <Text className="text-white text-center font-bold text-base mr-2">
                Pay {totalAmount.toLocaleString()} RWF
              </Text>
              <Ionicons name="checkmark-circle" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
