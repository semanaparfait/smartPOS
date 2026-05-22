import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function RoundTable({size = 100}: {size?: number}) {


  return (
    <TouchableOpacity>
      <Image
        source={require("@/assets/images/table/table1.png")}
        style={{ width: size, height: size }}
       />

    </TouchableOpacity>
  );
}

// const styles = StyleSheet.create({
//   cardContainer: {
//     backgroundColor: "#1F242E",
//     width: 100,
//     height: 140,
//     borderRadius: 8,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 12,
//     borderWidth: 1,
//     borderColor: "#2A303D",
//   },
//   iconContainer: {
//     height: 84,
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 8,
//     position: "relative",
//   },
//   tableCenter: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     borderWidth: 2,
//     borderColor: "#6B482B",
//     backgroundColor: "#8B5E3C",
//     position: "absolute",
//     elevation: 2,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.2,
//     shadowRadius: 1.5,
//   },
//   chairContainer: {
//     width: 18,
//     height: 20,
//     position: "absolute",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   chairSeat: {
//     width: 14,
//     height: 10,
//     borderRadius: 4,
//     backgroundColor: "#C5A880",
//     borderWidth: 1,
//     borderColor: "#6B482B",
//   },
//   chairBackrest: {
//     width: 14,
//     height: 6,
//     backgroundColor: "#6B482B",
//     borderTopLeftRadius: 3,
//     borderTopRightRadius: 3,
//     position: "absolute",
//     top: -6,
//   },
//   cardText: {
//     color: "#C5A880",
//     fontSize: 14,
//     fontWeight: "500",
//     textAlign: "center",
//   },
// });
