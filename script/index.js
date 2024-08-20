(function initiateApp() {
    // add a web worker that downloads and caches the images
    const LOCALSTORAGE_KEY = "roster"
    const MOVEMENT_TYPES = ["Infantry", "Armored", "Flying", "Cavalry"];
    const WEAPON_TYPES = ["Red Sword", "Blue Lance", "Green Axe", "Colorless Staff"];
    const BARRACKS = document.getElementById("barracks");
    const TABS = document.querySelectorAll('input[name="tab"]');
    // const HERO_SEARCH = document.getElementById("hero-search");
    const SEARCH_RESULTS = document.getElementById("search-content");
    const SKILLS_DIALOG = document.getElementById("inheritable-skills");
    const HERO_SEARCH = document.getElementById("search-query");
    let searchQuery = "";

    // SKILLS_DIALOG.oncancel = function(e) {
    //     e.preventDefault();
    // }

    for (let tab of TABS) {
        tab.onchange = function() {
            const { id } = this;
            const tabsContainers = document.querySelectorAll(".tab-content");
            for (let container of tabsContainers) {
                if (container.id.includes(id)) {
                    container.classList.remove("hide");
                } else {
                    container.classList.add("hide");
                }
            }
        }
    }

    function checkInheritableSkills() {
        SKILLS_DIALOG.showModal();
        const { unitId } = this.dataset;
        const existingIds = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        const urlSearchParams = new URLSearchParams();
        for (let id of existingIds) {
            urlSearchParams.append("intIDs", id);
        }
        fetch(`http://localhost:3333/skills?slot=A&searchedId=${unitId}&mode=roster&${urlSearchParams.toString()}`).then((res) => {
            return res.json();
        }).then(console.log)
    }
    
    HERO_SEARCH.onkeyup = (e) => {
        searchQuery = e.target.value;
        if (searchQuery.length > 2 || !searchQuery.length) {
            loadSearchSuggestions(0);
        }
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

    loadSearchSuggestions(0);

    function loadBarracks() {
        const items = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        if (items.length) {
            for (let savedId of items) {
                if (savedId) {
                    const { heroButton, iconsContainer } = createHeroItem(savedId, true);
                    const deleteButton = createDeleteIcon();

                    deleteButton.onclick = handleDeleteHeroEvent(savedId, heroButton);

                    iconsContainer.appendChild(deleteButton);
                    BARRACKS.appendChild(heroButton);
                }
            }
        }
    }

    function handleDeleteHeroEvent(unitId, boundItem) {
        return function deleteFromBarracks(e) {
            e.stopPropagation();
            const { heroButton } = createHeroItem(unitId);
            SEARCH_RESULTS.prepend(heroButton);
            BARRACKS.removeChild(boundItem);
            saveBarracks();
            heroButton.onclick = addToBarracks;
        }
    }

    function saveBarracks() {
        const heroes = BARRACKS.getElementsByClassName("hero-container");
        const mappedIds = Array.prototype.map.call(heroes, (hero) => hero.dataset.unitId);
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(mappedIds));
    }

    function addToBarracks() {
        const newButtons = createHeroItem(this.dataset.unitId, true);
        const deleteIcon = createDeleteIcon();
        deleteIcon.onclick = handleDeleteHeroEvent(this.dataset.unitId, newButtons.heroButton);
        newButtons.iconsContainer.appendChild(deleteIcon);
        BARRACKS.appendChild(newButtons.heroButton);
        saveBarracks();
        SEARCH_RESULTS.removeChild(this);
    }

    function loadSearchSuggestions(page) {
        const items = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        const params = new URLSearchParams();
        for (let item of items) {
            params.append("ids", item);
        }
        if (searchQuery.trim().length) {
            params.append("query", searchQuery);
        }
        params.append("page", page);

        return fetch(`http://localhost:3333/heroes?${params.toString()}`).then((response) => response.json()).then((elements) => {
            while (SEARCH_RESULTS.lastChild.nodeName !== "DIV") SEARCH_RESULTS.removeChild(SEARCH_RESULTS.lastChild);

            for (let elem of elements) {
                const { heroButton } = createHeroItem(elem);
                SEARCH_RESULTS.appendChild(heroButton);
                heroButton.onclick = addToBarracks;
            }
        });
    }

    function createHeroItem(heroId, addIcons) {
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
        heroButton.dataset.unitId = heroId;
        let iconsContainer = null;
        iconsContainer = document.createElement("div");
        iconsContainer.classList.add("icons-container");
        iconsContainer.appendChild(frame);

        if (addIcons) {
            heroButton.appendChild(iconsContainer);
        } else {
            heroButton.appendChild(frame);
        }

        return { heroButton, iconsContainer };
    }

    function createDeleteIcon() {
        const deleteButton = document.createElement("div");
        deleteButton.classList.add("delete-button");
        const img = document.createElement("img");
        img.src = "./static/trash.png";
        deleteButton.appendChild(img);

        return deleteButton;
    }
})();