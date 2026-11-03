import { File, Paths } from "expo-file-system";
import { Platform, Share } from "react-native";

type Cell = string | number | null | undefined;

// Quotes cells that need it, so commas and quotes in names don't break columns.
const toCsv = (rows: Cell[][]) =>
  rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? "" : String(cell);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\n");

// Downloads the file on the web; on a device, saves it and opens the share sheet.
// The BOM makes Excel read names with accents correctly.
export async function exportCsv(fileName: string, rows: Cell[][]) {
  const csv = "﻿" + toCsv(rows);

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csv);
  // Android shares text only, so the table goes in the message there.
  await Share.share(
    Platform.OS === "ios" ? { url: file.uri, title: fileName } : { message: csv, title: fileName },
  );
}
