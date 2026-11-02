// English text -> sw, for screens using tr(). Missing entries stay in English.
import part1 from "./sw/part1";
import part2 from "./sw/part2";
import part3 from "./sw/part3";

const text: Record<string, string> = { ...part1, ...part2, ...part3 };

export default text;
