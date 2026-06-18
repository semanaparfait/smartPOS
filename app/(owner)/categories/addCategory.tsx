import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import useCategory from '@/store/category/useCategory'
import Toast from "react-native-toast-message";


export default function AddCategory() {
  const [name, setName] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const { addCategory } = useCategory();

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

  const formData = new FormData();

  formData.append("name", trimmedName);

  formData.append("picture", {
    uri: img,
    name: "category.jpg",
    type: "image/jpeg",
  } as any);

  await addCategory(formData);
  console.log("FORMDATA NAME:", formData.get("name"));
console.log("FORMDATA PICTURE:", formData.get("picture"));

  setName("");
  setImg(null);

  Toast.show({
    type: "success",
    text1: "Category added",
    text2: `${trimmedName} has been added successfully.`,
  });
};

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-6">
        <Text className="text-3xl font-black text-slate-900 hidden">Add Category</Text>
        <Text className="text-slate-500 mt-1 mb-6 hidden">
          Create a new category with an image and name.
        </Text>

        <View className="bg-white rounded-3xl p-5 border border-slate-100">
          <TouchableOpacity
            onPress={pickImage}
            className="h-44 rounded-2xl border border-dashed border-slate-300 bg-slate-100 items-center justify-center overflow-hidden"
          >
            {img ? (
              <Image source={{ uri: img }} className="w-full h-full" />
            ) : (
              <View className="items-center">
                <Ionicons name="image-outline" size={34} color="#64748b" />
                <Text className="text-slate-500 mt-2 font-medium">
                  Pick category image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {img ? (
            <TouchableOpacity
              onPress={() => setImg(null)}
              className="self-center mt-3"
            >
              <Text className="text-red-500 font-medium">Remove image</Text>
            </TouchableOpacity>
          ) : null}

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor="#64748b"
            className="mt-4 bg-slate-100 rounded-xl px-4 py-3 text-slate-900"
          />

          <TouchableOpacity
            onPress={handleAddCategory}
            className="mt-4 bg-emerald-600 rounded-xl py-3 items-center"
          >
            <Text className="text-white font-bold text-base">Add Category</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
