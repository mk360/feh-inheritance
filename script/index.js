(function initiateApp() {
    // add a web worker that downloads and caches the images
    const LOCALSTORAGE_KEY = "roster"
    const MOVEMENT_TYPES = ["Infantry", "Armored", "Flying", "Cavalry"];
    const WEAPON_TYPES = ["Red Sword", "Blue Lance", "Green Axe", "Colorless Staff"];
    const BARRACKS = document.getElementById("barracks");
    const HERO_SEARCH = document.getElementById("hero-search");
    const SEARCH_RESULTS = document.getElementById("search-results");
    const SKILLS_DIALOG = document.getElementById("inheritable-skills");

    // SKILLS_DIALOG.oncancel = function(e) {
    //     e.preventDefault();
    // }

    const controller = new AbortController();

    function getButton(element) {
        let node = element;
        while (node.nodeName !== "BUTTON" && node.parentNode) {
            node = node.parentNode;
        }
        return node;
    }

    function checkInheritableSkills() {
        SKILLS_DIALOG.showModal();
        const { unitId } = this.dataset;
        const existingIds = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        const urlSearchParams = new URLSearchParams();
        for (let id of existingIds) {
            urlSearchParams.append("intIDs", id);
        }
        fetch(`http://localhost:3333/skills?slot=A&searchedId=${unitId}&mode=roster&${urlSearchParams.toString()}`).then((res) => res.json()).then(console.log)
    }

    SEARCH_RESULTS.onclick = (e) => {
        const btn = getButton(e.target);
        const { unitId } = btn.dataset;
        createBarracksItem(unitId);
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY)).concat(+unitId)));
        while (SEARCH_RESULTS.childNodes.length) SEARCH_RESULTS.removeChild(SEARCH_RESULTS.firstChild);
        SEARCH_RESULTS.classList.add("hide");
    }
    
    HERO_SEARCH.onkeyup = (e) => {
        const value = e.target.value;
        if (value.length < 3) {
            SEARCH_RESULTS.classList.add("hide");
            return;
        }
        const existingIds = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        const urlSearchParams = new URLSearchParams();
        urlSearchParams.set("query", encodeURIComponent(value));
        for (let id of existingIds) {
            urlSearchParams.append("ids", id);
        }
        fetch(`http://localhost:3333/heroes?${urlSearchParams.toString()}`, {
            signal: controller.signal
        }).then((response) => response.json()).then((entries) => {
            while (SEARCH_RESULTS.childNodes.length) SEARCH_RESULTS.removeChild(SEARCH_RESULTS.firstChild);
            SEARCH_RESULTS.classList.remove("hide");
            for (let entry of entries) {
                createSearchItem(entry);
            }
        }).catch(() => {});
    }

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
                if (element) createBarracksItem(element);
            }
        }
    }

    function createSearchItem(searchEntry) {
        const button = document.createElement("button");
        button.classList.add("search-entry");
        const img = document.createElement("img");
        img.src = `http://localhost:3333/img?id=${searchEntry.id}&imgType=portrait`;
        img.loading = "lazy";
        const span = document.createElement("span");
        span.innerHTML = searchEntry.name;
        button.appendChild(img);
        button.appendChild(span);
        button.dataset.unitId = searchEntry.id;
        SEARCH_RESULTS.appendChild(button);
    }

    function createBarracksItem(heroId) {
        // const div = document.createElement("div");
        const heroButton = document.createElement("button");
        heroButton.classList.add("hero-container");
        const frame = document.createElement("img");
        frame.src = "./static/frame.webp";
        frame.classList.add("hero-frame");

        const img = document.createElement("img");
        img.src = `http://localhost:3333/img?id=${heroId}&imgType=portrait`;
        img.loading = "lazy";
        img.classList.add("portrait");
        heroButton.appendChild(img);
        heroButton.appendChild(frame);
        heroButton.onclick = checkInheritableSkills;
        heroButton.dataset.unitId = heroId;
        BARRACKS.appendChild(heroButton);
    }
})();