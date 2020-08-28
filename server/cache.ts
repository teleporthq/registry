import LRU from "lru-cache";

const cache = new LRU({
  max: 128 * 1024 * 1024,
  length: (src: Buffer) => src.length,
});

export default cache;
