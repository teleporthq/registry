import semver from "semver";

const findVersion = (
  meta: Record<string, Record<string, string>>,
  tag: string
): string => {
  if (semver.valid(tag)) return meta.versions[tag] && tag;

  // dist tag eg: latest, beta, alpha etc
  if (tag in meta["dist-tags"]) return meta["dist-tags"][tag];

  // semver range
  return semver.maxSatisfying(Object.keys(meta.versions), tag);
};

export default findVersion;
