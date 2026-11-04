import { Redirect } from "expo-router";

// An old or mistyped address (e.g. a bookmark from before the screens moved):
// the start screen sends each person to their own home.
export default function NotFound() {
  return <Redirect href="/" />;
}
