import { greet } from './greet.js';

// Builds the upper-case greeting for a name.
export function shout(name) {
  return greet(name).toUpperCase();
}
