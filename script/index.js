(function initiateApp() {
    const LOCALSTORAGE_KEY = "roster"
    const MOVEMENT_TYPES = ["Infantry", "Armored", "Flying", "Cavalry"];
    const WEAPON_TYPES = ["Red Sword", "Blue Lance", "Green Axe", "Colorless Staff"];
    const BARRACKS = document.getElementById("barracks");

    for (let color of ["Red", "Blue", "Green", "Colorless"]) {
        for (let weapon of ["Bow", "Tome", "Breath", "Beast", "Dagger"]) {
            WEAPON_TYPES.push(`${color} ${weapon}`);
        }
    }

    if (!localStorage.getItem(LOCALSTORAGE_KEY)) {
        localStorage.setItem(LOCALSTORAGE_KEY, "[]");
    } else {
        loadBarracks();
    }

    function loadBarracks() {
        const items = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        if (items.length) {
            for (let element of items) {
                createBarracksItem(element);
            }
        }
    }

    function createBarracksItem(heroId) {
        const div = document.createElement("div");
        const heroButton = document.createElement("button");
        heroButton.classList.add("hero-container");
        heroButton.style.background = `url("http://localhost:3333/img?id=${heroId}&imgType=portrait")`;
        const frame = document.createElement("img");
        frame.src = "./static/frame.webp";
        frame.classList.add("hero-frame");

        // const img = document.createElement("img");
        // img.src = ;
        // img.classList.add("portrait");
        // heroButton.appendChild(img);
        heroButton.appendChild(frame);
        div.appendChild(heroButton);
        BARRACKS.appendChild(div);
    }
})();