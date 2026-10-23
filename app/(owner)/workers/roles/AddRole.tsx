import {
  Input,
  Label,
  PrimaryButton,
  SecondaryButton,
  Section,
  TextArea,
} from "@/app/components/ownerComponents/FormKit";
import { brand } from "@/config/theme";
import useRole from "@/store/Employee/useRole";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Toast from "react-native-toast-message";

type AddRoleProps = {
  onBack?: () => void;
};

const NAME_MAX = 40;
const EXAMPLES = ["Cashier", "Manager", "Waiter", "Stock keeper"];

export default function AddRole({ onBack }: AddRoleProps) {
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addRole } = useRole();
  const { width } = useWindowDimensions();

  const handleAddRole = async () => {
    const name = roleName.trim();
    if (!name) {
      Toast.show({ type: "error", text1: "Missing name", text2: "Role name is required." });
      return;
    }
    setIsSubmitting(true);
    try {
      await addRole({ name, description: description.trim() });
      Toast.show({ type: "success", text1: "Role created", text2: `${name} is ready to assign.` });
      setRoleName("");
      setDescription("");
      onBack?.();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not create role",
        text2: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className={width >= 1000 ? "flex-row items-start" : ""} style={{ gap: 16 }}>
      <View className="flex-1" style={{ gap: 16 }}>
        <Section icon="briefcase-outline" title="Role details">
          <View style={{ gap: 18 }}>
            <View>
              <View className="flex-row justify-between items-end">
                <Label required>Role name</Label>
                <Text className="text-ink/30 text-[11px] mb-1.5">
                  {roleName.length}/{NAME_MAX}
                </Text>
              </View>
              <Input
                icon="pricetag-outline"
                value={roleName}
                maxLength={NAME_MAX}
                placeholder="e.g. Cashier"
                onChangeText={setRoleName}
              />
              <View className="flex-row flex-wrap items-center mt-2" style={{ gap: 6 }}>
                <Text className="text-ink/40 text-[11px]">Try:</Text>
                {EXAMPLES.map((example) => (
                  <Text
                    key={example}
                    onPress={() => setRoleName(example)}
                    className="text-ink/60 text-[11px] font-semibold bg-ivory border border-ink/10 rounded-full px-2.5 py-0.5"
                  >
                    {example}
                  </Text>
                ))}
              </View>
            </View>
            <View>
              <Label>Description</Label>
              <TextArea
                value={description}
                placeholder="What does someone in this role do?"
                onChangeText={setDescription}
              />
            </View>
          </View>
        </Section>

        <View className="flex-row" style={{ gap: 12 }}>
          {onBack && <SecondaryButton label="Cancel" icon="close" onPress={onBack} disabled={isSubmitting} />}
          <PrimaryButton
            label="Create role"
            busyLabel="Creating..."
            icon="checkmark-circle-outline"
            busy={isSubmitting}
            onPress={handleAddRole}
          />
        </View>
      </View>

      {/* Preview */}
      <View style={width >= 1000 ? { width: 300 } : undefined}>
        <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px] mb-2 ml-1">
          Preview
        </Text>
        <View className="bg-white rounded-2xl border border-ink/5 p-4 flex-row items-center">
          <View className="w-9 h-9 rounded-lg bg-ivory items-center justify-center">
            <Ionicons name="briefcase-outline" size={16} color={brand.ink} />
          </View>
          <View className="flex-1 ml-3">
            <View className="flex-row items-baseline justify-between">
              <Text
                numberOfLines={1}
                className={`flex-1 text-[13px] font-bold pr-2 ${roleName.trim() ? "text-ink" : "text-ink/30"}`}
              >
                {roleName.trim() || "Role name"}
              </Text>
              <Text className="text-ink/50 text-[11px] font-semibold">0 people</Text>
            </View>
            <Text numberOfLines={1} className="text-ink/40 text-[11px] mt-0.5">
              {description.trim() || "No description"}
            </Text>
          </View>
        </View>
        <Text className="text-ink/40 text-[11px] mt-3 ml-1 leading-4">
          This is how the role appears in the Roles panel.
        </Text>
      </View>
    </View>
  );
}
