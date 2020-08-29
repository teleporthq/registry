const padRight = (str: string, num: number, char = " ") => {
  while (str.length < num) str += char;
  return str;
};

export default padRight;
