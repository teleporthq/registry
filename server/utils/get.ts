import https from "https";

const get = (url: string): Promise<unknown> => {
  return new Promise((fulfil, reject) => {
    https.get(url, (response) => {
      let body = "";

      response.on("data", (chunk) => {
        body += chunk;
      });

      response.on("end", () => {
        fulfil(body);
      });

      response.on("error", reject);
    });
  });
};

export default get;
