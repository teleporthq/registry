export type PackageJSON = Record<string, string | Record<string, string>>;

export type PackageVersions = string;

interface ProcessType {
  type: "info" | "error" | "result";
  message?: string;
  error?: string;
  code?: string;
  stack?: string;
}

export type ChildProcessType = string | ProcessType;
