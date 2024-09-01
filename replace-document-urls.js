const fs = require("fs");
const html = fs.readFileSync("./index.min.html", "utf-8");
const replacedJs = html.replace("./script/index.js", "./script/index.min.js");
const replacedCss = replacedJs.replace("./static/index.css", "./static/index.min.css");
fs.writeFileSync("index.min.html", replacedCss);