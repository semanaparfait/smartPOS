import React from "react";
import { Image,  TouchableOpacity, Text } from "react-native";

type BarCounterProps = {
  size?: number;
  onPress?: () => void;
  name?: string;
};

export default function BarCounter({size = 100, onPress, name}: BarCounterProps) {


  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} className="items-center">
      <Image
        source={require("@/assets/images/barcounter/barcounter.png")}
        style={{ width: size, height: size }}
      />
      <Text className="font-semibold text-[12px]">{name}</Text>
    </TouchableOpacity>
  );
}

// const styles = StyleSheet.create({
//   card: {
//     width: 180,
//     height: 140,
//     backgroundColor: "#1F242E",
//     borderRadius: 8,
//     padding: 10,
//     borderWidth: 1,
//     borderColor: "#2A303D",
//     overflow: "hidden",
//   },
//   backWall: {
//     height: 36,
//     width: "100%",
//     backgroundColor: "#252B33",
//     borderRadius: 6,
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 6,
//   },
//   shelf: {
//     width: "78%",
//     height: 12,
//     flexDirection: "row",
//     justifyContent: "space-around",
//     alignItems: "center",
//   },
//   bottle: {
//     width: 8,
//     height: 22,
//     borderRadius: 3,
//     backgroundColor: "#C5A880",
//   },
//   bottleAlt: {
//     backgroundColor: "#BB6B5A",
//     height: 28,
//   },
//   bottleAlt2: {
//     backgroundColor: "#FFD166",
//     height: 20,
//   },
//   counter: {
//     flex: 1,
//     justifyContent: "flex-end",
//     alignItems: "center",
//   },
//   counterTop: {
//     width: "100%",
//     height: 18,
//     backgroundColor: "#8B5E3C",
//     borderTopLeftRadius: 6,
//     borderTopRightRadius: 6,
//   },
//   counterFront: {
//     width: "100%",
//     height: 28,
//     backgroundColor: "#6B482B",
//     borderBottomLeftRadius: 6,
//     borderBottomRightRadius: 6,
//     marginTop: 2,
//     justifyContent: "flex-end",
//     alignItems: "center",
//   },
//   stoolsRow: {
//     position: "absolute",
//     bottom: 6,
//     left: 0,
//     right: 0,
//     flexDirection: "row",
//     justifyContent: "space-around",
//     alignItems: "flex-end",
//     paddingHorizontal: 12,
//   },
//   stool: {
//     width: 36,
//     alignItems: "center",
//   },
//   stoolSeat: {
//     width: 26,
//     height: 12,
//     borderRadius: 6,
//     backgroundColor: "#C5A880",
//     borderWidth: 1,
//     borderColor: "#6B482B",
//     marginBottom: 2,
//   },
//   stoolLeg: {
//     width: 3,
//     height: 18,
//     backgroundColor: "#6B482B",
//   },
// });
