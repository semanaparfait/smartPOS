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

export default function AddCategory() {
  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

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
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAddCategory = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert("Missing name", "Please enter a category name.");
      return;
    }

    if (!imageUri) {
      Alert.alert("Missing image", "Please pick a category image.");
      return;
    }

    Alert.alert("Category ready", `${trimmedName} is ready to be saved.`);
    setName("");
    setImageUri(null);
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-6">
        <Text className="text-3xl font-black text-slate-900">Add Category</Text>
        <Text className="text-slate-500 mt-1 mb-6">
          Create a new category with an image and name.
        </Text>

        <View className="bg-white rounded-3xl p-5 border border-slate-100">
          <TouchableOpacity
            onPress={pickImage}
            className="h-44 rounded-2xl border border-dashed border-slate-300 bg-slate-100 items-center justify-center overflow-hidden"
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="w-full h-full" />
            ) : (
              <View className="items-center">
                <Ionicons name="image-outline" size={34} color="#64748b" />
                <Text className="text-slate-500 mt-2 font-medium">
                  Pick category image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {imageUri ? (
            <TouchableOpacity
              onPress={() => setImageUri(null)}
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
