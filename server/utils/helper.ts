export const getBundleName = (
  hash: string,
  packageName: string,
  version: string
): string => {
  return `${hash}-${removeIllegalCharacters(packageName)}-${version}.js`;
};

export const removeIllegalCharacters = (str: string): string => {
  if (typeof str !== "string") {
    return null;
  }

  return (
    str
      .replace(/[^a-zA-Z0-9-_]/g, "") // Remove all non-alphanumeric characters except _ and -
      .replace(/^[0-9-_]*/, "") // Remove leading numbers
      /* eslint-disable */
      .replace(/\-\-+/g, "-") // Replace multiple - with single -
      .replace(/^-+/, "") // Trim - from start of text
      .replace(/-+$/, "")
  ); // Trim - from end of text
};
