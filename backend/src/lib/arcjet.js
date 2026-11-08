import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";
import { ENV } from "./env.js";

// Arcjet is optional: without a key the app still runs (the built-in auth rate limiter stays active).
const aj = ENV.ARCJET_KEY
  ? arcjet({
      key: ENV.ARCJET_KEY,
      rules: [
        // Shield protects against common attacks e.g. SQL injection
        shield({ mode: "LIVE" }),
        detectBot({
          mode: "LIVE",
          allow: ["CATEGORY:SEARCH_ENGINE"],
        }),
        slidingWindow({
          mode: "LIVE",
          max: 100,
          interval: 60,
        }),
      ],
    })
  : null;

export default aj;
