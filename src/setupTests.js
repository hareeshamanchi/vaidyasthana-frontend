// jest-dom adds custom jest matchers for asserting on DOM nodes.
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// jsdom default does not implement window.scrollTo; provide standard mock
if (typeof window !== "undefined") {
  window.scrollTo = jest.fn((options) => {
    if (typeof options === "object" && options !== null) {
      window.scrollX = options.left || 0;
      window.scrollY = options.top || 0;
    } else if (arguments.length >= 2) {
      window.scrollX = arguments[0] || 0;
      window.scrollY = arguments[1] || 0;
    }
  });
}

