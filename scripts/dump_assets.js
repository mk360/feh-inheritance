const fs = require("fs");
const http = require("http");
const mwn = require("mwn");
const dotenv = require("dotenv");

dotenv.config({
    path: "../.env"
});

(async function fct() {
    const client = new mwn.Mwn({
        apiUrl: "https://feheroes.fandom.com/api.php"
    });
    await client.login({
        username: process.env.FEH_USERNAME,
        password: process.env.FEH_PASSWORD,
    });
    let offset = 0;
    while (true) {
        const { cargoquery: results } = await client.query({
            "action": "cargoquery",
            "format": "json",
            "tables": "Units",
            "fields": "Units.WikiName=Page, IntID",
            "where": "Properties holds not \"enemy\"",
            "order_by": "IntID DESC",
            "offset": offset.toString(),
            "limit": "500"
        });
        if (results.length === 0) break;
        offset += results.length;
        for (let { title: { Page, IntID } } of results) {
            await getFiles(IntID, Page);
            console.log("cached images for " + Page + " ID " + IntID);
        }
    }
})();

async function getFiles(intID, wikiPage) {
    if (!fs.existsSync(`../server/cache/portrait/${intID}.webp`)) {
        const portraitRequest = await fetch(`https://feheroes.fandom.com/Special:Redirect/file/${wikiPage.replace(/ /g, "_")}_Face_FC.webp`);
        const imageContent = await portraitRequest.arrayBuffer();
        fs.writeFileSync(`../server/cache/portrait/${intID}.webp`, Buffer.from(imageContent));
    }


    if (!fs.existsSync(`../server/cache/battle/${intID}.webp`)) {
        const bannerRequest = await fetch(`https://feheroes.fandom.com/Special:Redirect/file/${wikiPage.replace(/ /g, "_")}_BtlFace_BU.webp`);
        const bannerResponse = await bannerRequest.arrayBuffer();
        fs.writeFileSync(`../server/cache/battle/${intID}.webp`, Buffer.from(bannerResponse));
    }
}