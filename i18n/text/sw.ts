// English text -> sw, for screens using tr(). Missing entries stay in English.
import part1 from "./sw/part1";
import part2 from "./sw/part2";
import part3 from "./sw/part3";
import part4 from "./sw/part4";
import part5 from "./sw/part5";
import part6 from "./sw/part6";

const text: Record<string, string> = { ...part1, ...part2, ...part3, ...part4, ...part5, ...part6 };

export default text;
