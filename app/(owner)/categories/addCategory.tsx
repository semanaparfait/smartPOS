import useCategory from "@/store/category/useCategory";
import { brand } from "@/config/theme";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { secureUrl } from "@/utils/imageUrl";
const NAME_MAX = 40;

export default function AddCategory({ onSaved }: { onSaved?: () => void }) {
  const [name, setName] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addCategory } = useCategory();
  const { width } = useWindowDimensions();

  const isWide = width >= 1000;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo access to select a category image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImg(result.assets[0].uri);
    }
  };

  const handleAddCategory = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Toast.show({
        type: "error",
        text1: "Missing name",
        text2: "Please enter a category name.",
      });
      return;
    }

    if (!img) {
      Toast.show({
        type: "error",
        text1: "Missing image",
        text2: "Please pick a category image.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      formData.append("name", trimmedName);

      if (Platform.OS === "web") {
        const picture = await fetch(img).then((response) => response.blob());
        formData.append("picture", picture, "category.jpg");
      } else {
        formData.append("picture", {
          uri: img,
          name: "category.jpg",
          type: "image/jpeg",
        } as any);
      }

      await addCategory(formData);

      // The store records failures in `error` instead of throwing.
      const error = useCategory.getState().error;
      if (error) {
        Toast.show({ type: "error", text1: "Could not add category", text2: error });
        return;
      }

      setName("");
      setImg(null);

      Toast.show({
        type: "success",
        text1: "Category added",
        text2: `${trimmedName} has been added successfully.`,
      });
      onSaved?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = name.trim() || "Category name";

  return (
    <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
      {/* FORM */}
      <View className="flex-1 bg-white rounded-2xl border border-ink/5 p-5" style={{ gap: 20 }}>
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-xl bg-ivory items-center justify-center">
            <Ionicons name="folder-open-outline" size={17} color={brand.ink} />
          </View>
          <View className="ml-3">
            <Text className="text-ink text-[15px] font-extrabold tracking-tight">
              Category details
            </Text>
            <Text className="text-ink/40 text-[11px] mt-0.5">Both fields are required</Text>
          </View>
        </View>

        {/* Photo */}
        <View>
          <Text className="text-ink/60 text-[11px] font-bold uppercase tracking-wider mb-1.5">
            Photo<Text style={{ color: brand.danger }}> *</Text>
          </Text>
          <View className="flex-row items-center" style={{ gap: 16 }}>
            <Pressable
              onPress={pickImage}
              accessibilityRole="button"
              accessibilityLabel={img ? "Change photo" : "Upload photo"}
              className={`w-32 h-32 rounded-2xl items-center justify-center overflow-hidden ${
                img ? "bg-ivory" : "bg-ivory border-2 border-dashed border-ink/15 active:bg-ink/5"
              }`}
            >
              {img ? (
                <Image source={{ uri: secureUrl(img) }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={26} color={brand.ink} />
                  <Text className="text-ink text-xs font-bold mt-1.5">Upload</Text>
                </>
              )}
            </Pressable>

            <View className="flex-1" style={{ gap: 8 }}>
              <Text className="text-ink/50 text-xs leading-5">
                Use a clear, square photo that represents the whole group — it is
                what cashiers tap on the POS.
              </Text>
              {img && (
                <View className="flex-row" style={{ gap: 8 }}>
                  <Pressable
                    onPress={pickImage}
                    className="flex-row items-center h-9 px-3 rounded-lg border border-ink/10 active:bg-ivory"
                  >
                    <Ionicons name="swap-horizontal" size={14} color={brand.ink} />
                    <Text className="text-ink text-xs font-bold ml-1.5">Change</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setImg(null)}
                    className="flex-row items-center h-9 px-3 rounded-lg border border-ink/10 active:bg-red-50"
                  >
                    <Ionicons name="trash-outline" size={14} color={brand.danger} />
                    <Text className="text-xs font-bold ml-1.5" style={{ color: brand.danger }}>
                      Remove
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Name */}
        <View>
          <View className="flex-row justify-between items-end mb-1.5">
            <Text className="text-ink/60 text-[11px] font-bold uppercase tracking-wider">
              Name<Text style={{ color: brand.danger }}> *</Text>
            </Text>
            <Text className="text-ink/30 text-[11px]">
              {name.length}/{NAME_MAX}
            </Text>
          </View>
          <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px]">
            <Ionicons name="pricetag-outline" size={17} color={brand.inkDisabled} />
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={NAME_MAX}
              placeholder="e.g. Drinks, Snacks, Bakery"
              placeholderTextColor={brand.inkDisabled}
              className="flex-1 py-3 ml-2.5 text-[15px] text-ink"
              style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
              onSubmitEditing={handleAddCategory}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row" style={{ gap: 12 }}>
          <Pressable
            onPress={() => {
              setName("");
              setImg(null);
            }}
            disabled={isSubmitting}
            className="h-12 px-5 flex-row items-center justify-center rounded-xl bg-white border border-ink/10 active:bg-ivory"
          >
            <Ionicons name="refresh" size={16} color={brand.ink} />
            <Text className="text-ink text-sm font-bold ml-2">Reset</Text>
          </Pressable>
          <Pressable
            onPress={handleAddCategory}
            disabled={isSubmitting}
            className={`h-12 flex-1 flex-row items-center justify-center rounded-xl ${
              isSubmitting ? "bg-lime-dark" : "bg-lime active:bg-lime-dark"
            }`}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color={brand.ink} />
                <Text className="text-ink text-[15px] font-bold ml-2">Saving...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={19} color={brand.ink} />
                <Text className="text-ink text-[15px] font-bold ml-2">Add Category</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* PREVIEW */}
      <View style={isWide ? { width: 300 } : undefined}>
        <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px] mb-2 ml-1">
          Preview
        </Text>
        <View className="rounded-2xl border border-ink/5 bg-white overflow-hidden">
          <View className="h-40 bg-ivory items-center justify-center">
            {img ? (
              <Image source={{ uri: secureUrl(img) }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Ionicons name="image-outline" size={30} color={brand.inkDisabled} />
            )}
            <View className="absolute top-3 left-3 flex-row items-center rounded-full px-2.5 py-1 bg-white">
              <Ionicons name="cube" size={11} color={brand.ink} />
              <Text className="text-ink text-[11px] font-extrabold ml-1">0 products</Text>
            </View>
          </View>
          <View className="px-4 py-3.5">
            <Text
              numberOfLines={1}
              className={`text-[15px] font-extrabold tracking-tight ${name.trim() ? "text-ink" : "text-ink/30"}`}
            >
              {displayName}
            </Text>
            <Text className="text-ink/40 text-[11px] mt-0.5">Added today</Text>
          </View>
        </View>

        <View className="flex-row items-start mt-3 px-1">
          <Ionicons name="information-circle-outline" size={14} color={brand.inkMuted} />
          <Text className="flex-1 text-ink/40 text-[11px] ml-1.5 leading-4">
            This is how the category card will appear in your list.
          </Text>
        </View>
      </View>
    </View>
  );
}
