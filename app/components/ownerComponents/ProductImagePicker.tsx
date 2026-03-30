import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';

export default function ProductImagePicker() {
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    // Request permission (Required for some Android versions/iOS)
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to upload a product image.');
      return;
    }

    // Launch the picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Updated for latest expo-image-picker versions
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio is great for POS products
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View>
      <TouchableOpacity 
        onPress={pickImage}
        className="h-44 bg-slate-200 rounded-xl justify-center items-center border border-dashed border-slate-300 mb-5 overflow-hidden"
      >
        {image ? (
          // Show the selected image as a preview
          <Image source={{ uri: image }} className="w-full h-full" />
        ) : (
          // Show the placeholder if no image is selected
          <>
            <Ionicons name="image-outline" size={40} color="#94a3b8" />
            <Text className="text-slate-500 mt-2">+ Pick Product Image</Text>
          </>
        )}
      </TouchableOpacity>
      
      {image && (
        <TouchableOpacity onPress={() => setImage(null)}>
          <Text className="text-red-500 text-center mb-4">Remove Image</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}