const fs = require("fs");
const indexJS = fs.readFileSync("../script/index.js", "utf-8");
const newIndexJS = indexJS.replace(/^const API_URL.+$/, `const API_URL = "https://api.feh-inheritance.tonion-the-onion.com";`);
fs.writeFileSync("../script/index.js", newIndexJS);