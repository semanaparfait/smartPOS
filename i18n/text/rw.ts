// English text -> rw, for screens using tr(). Missing entries stay in English.
import part1 from "./rw/part1";
import part2 from "./rw/part2";
import part3 from "./rw/part3";
import part4 from "./rw/part4";
import part5 from "./rw/part5";

const text: Record<string, string> = { ...part1, ...part2, ...part3, ...part4, ...part5 };

export default text;
