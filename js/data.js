/*
 * MALARS frontend data layer
 *
 * Stage MVP-02.2
 *
 * Purpose:
 * - centralize frontend dictionaries and constants;
 * - prepare migration from script-core.js;
 * - avoid duplicated data in multiple JS layers.
 *
 * This file is not connected to production yet.
 * Production continues using current script chain until migration testing is complete.
 */

window.MalarsData = {
  version: "20260904-1",

  config: {
    brandName: "МАЛАРС-ГРУПП",
    scriptUrl: "https://script.google.com/macros/s/AKfycbz3ycpkm_msGzEVbpQkdaedUGwaAjzkA4_Xbuj8X4MCaKyuqXFtPY1Yuq4M2zLF9yIb/exec"
  },

  works: [],
  objectTypes: [],
  regions: [],
  documents: []
};

// Migration note:
// Existing dictionaries are temporarily stored in script-core.js.
// They will be moved here in the next migration step without changing
// production behavior.
