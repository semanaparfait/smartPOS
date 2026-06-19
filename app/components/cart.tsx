import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { products } from "@/seed/products";
import React, {useEffect,useState} from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShoppingCartIcon, Trash2Icon, XIcon, PauseIcon } from "lucide-react-native";
import useCart from "@/store/Cart/useCart"
import useItem from "@/store/Item/useItem";
import Toast from "react-native-toast-message";

type CheckoutProps = {
  embedded?: boolean;
};

export default function Cart({ embedded = false }: CheckoutProps) {
  const { cartItems , addToCart , getCart } = useCart();
  const { getItems } = useItem();
  const router = useRouter();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const items = await getItems();
        console.log("Fetched items:", items);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    fetchItems();
  }, [getItems]);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const cartItem = await getCart();
        console.log("Fetched cart:", cartItem);
      }
      catch (error) {
        console.error("Error fetching cart:", error);
      }
    };
    fetchCart();
  }, [getCart]);

  const totalAmount = cartItems
  .flatMap(cart => cart.items)
  .reduce((sum, item) => {
    return sum + Number(item.totalPrice ?? 0);
  }, 0);

  const handleCreateCart = async (seatId?: string) => {
    try {
      await addToCart();
      // await getCart();
      Toast.show({
        type: "success",
        text1: "cart created successfully",
        // text2: cart?.id ? `Cart ID: ${cart.id}` : "Cart created successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to create cart",
        text2: error as string,
      });
    }
  };

  // const cartItem = [
  //   {
  //     id: 1,
  //     image:
  //       "https://i.pinimg.com/736x/cc/fb/cf/ccfbcf047b8cac8f1ab9ad713f6ab989.jpg",
  //     name: "Inyange Milk 500ml",
  //     price: 800,
  //     qty: 2,
  //   },
  //   {
  //     id: 2,
  //     image:
  //       "https://i.pinimg.com/736x/02/55/cd/0255cd96ba0ce828bf72326a3ff69c47.jpg",
  //     name: "Skol Lager 33cl",
  //     price: 1000,
  //     qty: 6,
  //   },
  //   {
  //     id: 3,
  //     image:
  //       "https://i.pinimg.com/736x/cc/fb/cf/ccfbcf047b8cac8f1ab9ad713f6ab989.jpg",
  //     name: "Inyange Milk 500ml",
  //     price: 800,
  //     qty: 2,
  //   },
  //   {
  //     id: 4,
  //     image:
  //       "https://i.pinimg.com/736x/02/55/cd/0255cd96ba0ce828bf72326a3ff69c47.jpg",
  //     name: "Skol Lager 33cl",
  //     price: 1000,
  //     qty: 6,
  //   },
  //       {
  //     id: 5,
  //     image:
  //       "https://i.pinimg.com/736x/02/55/cd/0255cd96ba0ce828bf72326a3ff69c47.jpg",
  //     name: "Skol Lager 33cl",
  //     price: 1000,
  //     qty: 6,
  //   },
  //       {
  //     id: 6,
  //     image:
  //       "https://i.pinimg.com/736x/02/55/cd/0255cd96ba0ce828bf72326a3ff69c47.jpg",
  //     name: "Skol Lager 33cl",
  //     price: 1000,
  //     qty: 6,
  //   },
  //       {
  //     id: 7,
  //     image:
  //       "https://i.pinimg.com/736x/02/55/cd/0255cd96ba0ce828bf72326a3ff69c47.jpg",
  //     name: "Skol Lager 33cl",
  //     price: 1000,
  //     qty: 6,
  //   },
  //       {
  //     id: 8,
  //     image:
  //       "https://i.pinimg.com/736x/02/55/cd/0255cd96ba0ce828bf72326a3ff69c47.jpg",
  //     name: "Skol Lager 33cl",
  //     price: 1000,
  //     qty: 6,
  //   },
  // ];

  // const subtotal: number = cartItems.reduce(
  //   (acc, item) => acc + item.price * item.qty,
  //   0,
  // );
  // const totalItems = cartItems.reduce((acc, item) => acc + item.qty, 0);

  // const handleCompleteSale = () => {
  //   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  //   const receiptItems = cartItems.map((item) => ({
  //     name: item.name,
  //     qty: item.qty,
  //     price: item.price,
  //   }));

  //   router.push({
  //     pathname: "/(tabs)/checkout",
  //     params: {
  //       total: subtotal.toString(),
  //       items: totalItems.toString(),
  //       lines: JSON.stringify(receiptItems),
  //     },
  //   });
  // };

 

  return (
    <View className="shadow  h-full flex-1">
      {cartItems.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6 ">
          <View>
            <Image
              source={require("@/assets/images/cart/cart.png")}
              style={{ width: 120, height: 120 }}
              resizeMode="cover"
            />
          </View>
          <Text className="font-semibold text-lg">No active Cart</Text>
          <Text className="text-gray-500 text-center mt-2 min-w-[200px]">
            Create a new cart to add items and serve you customers faster.
            
          </Text>
          <TouchableOpacity
            onPress={() => handleCreateCart()}
            className="mt-6 bg-green-900 px-4 py-2 rounded-lg flex-row items-center"
          >
            <ShoppingCartIcon size={16} color="white" />
            <Text className="text-white text-sm font-bold ml-2">Create Cart</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1">
          <View className="px-6 py-4 border-b border-gray-100 flex-row justify-between items-center">
            <Text className={`${embedded ? "text-xl" : "text-2xl"}   font-bold`}>
              Cart ({cartItems.length})
            </Text>
        <TouchableOpacity className=" flex-row items-center cursor-pointer active:scale-95">
          <PauseIcon size={16} color="#14532d" />
          <Text className="text-green-900  text-xs font-bold">Hold Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity className="   flex-row items-center cursor-pointer active:scale-95">
          <Trash2Icon size={16} color="#dc2626" />
          <Text className="text-red-600  text-xs font-bold">Cancel Sale</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className=" px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {cartItems.map((cart ) =>
        cart.items.map((item) => (
          <View
            key={item.id}
            className="flex-row gap-2 justify-between items-center mb-2  p-4 rounded-2xl bg-white shadow-inner"
          >
            <View className="flex-row gap-4 items-center">
              <View>
                {/* <Image
                  source={{ uri: item.product.image }}
                  className="h-12 w-12 rounded-lg bg-navy-900"
                  resizeMode="cover"
                /> */}
              </View>
              <View className="flex-col gap-3">
                {/* <Text className={`${embedded ? "text-base" : "text-lg"} font-semibold`}>
                  {item.name}
                </Text> */}
                <Text className=" font-semibold">{item.product.name}</Text>
                <View className="flex-row items-center gap-2 ">
                  <TouchableOpacity className="border border-gray-300 p-1 rounded-lg">
                    <Ionicons name="remove" size={16} color="#333" />
                  </TouchableOpacity>
                  <Text className="text-base font-bold">{item.quantity}</Text>
                  <TouchableOpacity className="border border-gray-300 p-1 rounded-lg">
                    <Ionicons name="add" size={16} color="#333" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View className="flex-col items-end justify-between gap-2">
              <View>
                <TouchableOpacity >
                  <XIcon size={18} color="red" />
                </TouchableOpacity>
              </View>
              <Text
                className="text-lg font-bold"
              >
                {(item.product.sellingPrice * item.quantity).toLocaleString()} RWF
              </Text>
            </View>

          </View>
        ))
        )}
      </ScrollView>
      <View className= "p-5   shadow border-t border-gray-300 ">
        <View
          className={`flex-row justify-between items-center ${embedded ? "mb-4" : "mb-6"}`}
        >
          <Text>
            Total Amount
          </Text>
          <Text className="  font-black">
            {totalAmount.toLocaleString()} RWF
            
          </Text>
        </View>
                <View
          className={`flex-row justify-between items-center ${embedded ? "mb-4" : "mb-6"}`}
        >
          <Text>
            Tax (18%)
          </Text>
          <Text className="  font-black">

            {totalAmount * 0.18} RWF
          </Text>
        </View>

        <TouchableOpacity
          // onPress={handleCompleteSale}
          className="bg-green-900 w-full rounded-md shadow p-2 cursor-pointer active:scale-95 flex-row justify-center items-center"
        >
          <Text
            className="text-white text-center font-black mr-2"
          >
            Pay {totalAmount.toLocaleString()} RWF
          </Text>
          <Ionicons name="checkmark-circle" size={24} color="white" />
        </TouchableOpacity>
      </View>
      </View>
    )}
  </View>
);}
