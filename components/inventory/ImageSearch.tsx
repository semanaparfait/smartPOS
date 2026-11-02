import { brand } from "@/config/theme";
import type { ImageResult } from "@/store/products/productsType";
import useProduct from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

const webNoOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

const TILE = 104;
const NOT_A_PICTURE = "That link is a web page, not a picture. Copy the image address instead.";
// Search results often give a long "data:" address instead of a real link.
const OPEN_IT_FIRST = "Open the full picture first, then copy its image address.";

// The picture's own address. A Google Images page link carries it inside `imgurl`.
const pictureLink = (value: string) => {
  const link = value.trim();
  const inner = link.match(/[?&]imgurl=([^&]+)/);
  const url = inner ? decodeURIComponent(inner[1]) : link;
  return /^https?:\/\//i.test(url) ? url : null;
};

// Search free pictures by name and pick one, instead of uploading from the device.
export default function ImageSearch({
  name,
  selected,
  onPick,
}: {
  // What the user called the product: the starting search.
  name: string;
  selected: string | null;
  onPick: (url: string | null) => void;
}) {
  const searchImages = useProduct((s) => s.searchImages);
  const [query, setQuery] = useState(name);
  const [results, setResults] = useState<ImageResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const edited = useRef(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const linked = pictureLink(link);

  const pasteLink = (value: string) => {
    setLink(value);
    const url = pictureLink(value);
    setLinkError(
      !value.trim() || url
        ? null
        : value.trim().startsWith("data:")
          ? OPEN_IT_FIRST
          : "That is not a web link.",
    );
    onPick(url);
  };

  // Follows the name until the search box is typed in directly.
  useEffect(() => {
    if (!edited.current) setQuery(name);
  }, [name]);

  const search = async () => {
    const term = query.trim();
    if (term.length < 2) {
      setMessage("Type at least 2 letters.");
      return;
    }
    setSearching(true);
    setMessage(null);
    try {
      const found = await searchImages(term);
      setResults(found);
      if (!found.length) setMessage(`No pictures found for "${term}". Try another word.`);
    } catch (error) {
      setResults([]);
      setMessage((error as Error).message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl pl-3.5 pr-1.5 min-h-[48px]">
        <Ionicons name="search" size={17} color={brand.inkDisabled} />
        <TextInput
          value={query}
          onChangeText={(val) => {
            edited.current = true;
            setQuery(val);
          }}
          onSubmitEditing={search}
          returnKeyType="search"
          placeholder="Search a picture, e.g. tomatoes"
          placeholderTextColor={brand.inkDisabled}
          className="flex-1 py-3 ml-2.5 text-[15px] text-ink"
          style={webNoOutline}
        />
        <Pressable
          onPress={search}
          disabled={searching}
          className="h-9 min-w-[76px] px-3 rounded-lg bg-ink items-center justify-center active:bg-ink-soft"
        >
          {searching ? (
            <ActivityIndicator size="small" color={brand.white} />
          ) : (
            <Text className="text-white text-xs font-bold">Search</Text>
          )}
        </Pressable>
      </View>

      {!!message && <Text className="text-ink/50 text-xs">{message}</Text>}

      <View className="pt-3 border-t border-ink/5">
        <Text className="text-ink/60 text-[11px] font-bold uppercase tracking-wider mb-1.5">
          Or paste a picture link
        </Text>
        <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px]">
          <Ionicons name="link-outline" size={17} color={brand.inkDisabled} />
          <TextInput
            value={link}
            onChangeText={pasteLink}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={2000}
            placeholder="https://..."
            placeholderTextColor={brand.inkDisabled}
            className="flex-1 py-3 ml-2.5 text-[15px] text-ink"
            style={webNoOutline}
          />
          {!!link && (
            <Pressable onPress={() => pasteLink("")} accessibilityLabel="Clear link" hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={brand.inkDisabled} />
            </Pressable>
          )}
        </View>
        {linkError ? (
          <Text className="text-xs mt-1.5" style={{ color: brand.danger }}>
            {linkError}
          </Text>
        ) : (
          <Text className="text-ink/40 text-[11px] mt-1.5">
            Open the picture on any site, right-click or long-press it, and copy the image address.
          </Text>
        )}
        {!!linked && (
          <View className="flex-row items-center mt-3">
            <Image
              source={{ uri: linked }}
              style={{ width: TILE, height: TILE, borderRadius: 12 }}
              resizeMode="cover"
              onError={() => {
                setLinkError(NOT_A_PICTURE);
                if (selected === linked) onPick(null);
              }}
            />
            {!linkError && selected === linked && (
              <Text className="text-ink text-xs font-semibold ml-3">This picture will be used.</Text>
            )}
          </View>
        )}
      </View>

      {results.length > 0 && (
        <>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {results.map((result) => {
              const active = selected === result.url;
              return (
                <Pressable
                  key={result.url}
                  onPress={() => onPick(active ? null : result.url)}
                  accessibilityLabel={`Use picture: ${result.title}`}
                  accessibilityState={{ selected: active }}
                  className={`rounded-xl overflow-hidden border-2 bg-ivory ${
                    active ? "border-ink" : "border-transparent"
                  }`}
                  style={{ width: TILE, height: TILE }}
                >
                  <Image
                    source={{ uri: result.thumbnail }}
                    style={{ width: TILE, height: TILE }}
                    resizeMode="cover"
                  />
                  {active && (
                    <View className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink items-center justify-center">
                      <Ionicons name="checkmark" size={15} color={brand.lime} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text className="text-ink/40 text-[11px]">
            Free pictures from Wikimedia Commons. Each has its own licence.
          </Text>
        </>
      )}
    </View>
  );
}
