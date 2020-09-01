import { Response } from "express";

export const sendBadRequest = (res: Response, msg: string): void => {
  res.status(400);
  res.end(msg);
};

export const sendError = (res: Response, msg: string): void => {
  res.status(500);
  res.set("Content-Type", "text/html");
  res.end(msg);
};
