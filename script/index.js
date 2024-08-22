(function initiateApp() {
    // add a web worker that downloads and caches the images
    const LOCALSTORAGE_KEY = "roster"
    const MOVEMENT_TYPES = ["Infantry", "Armored", "Flying", "Cavalry"];
    const WEAPON_TYPES = ["Red Sword", "Blue Lance", "Green Axe", "Colorless Staff"];
    const BARRACKS = document.getElementById("barracks");
    const TABS = document.querySelectorAll('input[name="tab"]');
    const SEARCH_RESULTS = document.getElementById("search-content");
    const HERO_SEARCH = document.getElementById("search-query");
    const SKILL_DONORS_LIST = document.getElementById("skill-donors");
    const SKILL_FILTERS = document.getElementById("skill-filters");
    let lastCheckedHero;

    let searchQuery = "";
    let page = 0;

    document.getElementById("search").click();

    Array.from(document.getElementsByClassName("filter-input")).forEach((input) => {
        input.onclick = function() {
            checkInheritableSkills(this.id, lastCheckedHero);
        }
    });

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
            if (id === "inheritables") {
                HERO_SEARCH.parentNode.classList.add("hide");
            } else {
                HERO_SEARCH.parentNode.classList.remove("hide");
            }
        }
    }
    
    HERO_SEARCH.onkeyup = (e) => {
        searchQuery = e.target.value;
        if (searchQuery.length > 2 || !searchQuery.length) {
            page = 0;
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

    loadSearchSuggestions(page);

    function loadBarracks() {
        const items = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        if (items.length) {
            for (let savedItem of items) {
                if (savedItem) {
                    const { heroButton, iconsContainer } = createHeroItem(savedItem.id, true);
                    const deleteButton = createDeleteIcon();
                    const favoriteIcon = createFavoritesIcon();
                    heroButton.dataset.favorite = savedItem.favorite;
                    deleteButton.onclick = handleDeleteHeroEvent(savedItem.id, heroButton);
                    favoriteIcon.onclick = handleFavoriteHeroEvent(heroButton, savedItem.favorite);
                    if (savedItem.favorite === true) {
                        favoriteIcon.src = "./static/favorite-on.png";
                    }
                    iconsContainer.appendChild(deleteButton);
                    iconsContainer.appendChild(favoriteIcon);
                    heroButton.onclick = function(){
                        lastCheckedHero = this;
                        checkInheritableSkills("weapon", this);
                    };
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
            heroButton.onclick = addToBarracks;
            saveBarracks();
        }
    }

    function handleFavoriteHeroEvent(boundItem, startingState) {
        let state = startingState;
        return function toggleFavorite(e) {
            const newState = !state;
            this.src = newState ? "./static/favorite-on.png" : "./static/favorite-off.png";
            boundItem.dataset.favorite = newState.toString();
            e.stopPropagation();
            if (newState) {
                const currentBarracks = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
                const firstUnfavorite = currentBarracks.find((hero) => !hero.favorite);
                if (firstUnfavorite) {
                    const { id } = firstUnfavorite;
                    console.log(boundItem.parentNode);
                    boundItem.parentNode.insertBefore(boundItem, boundItem.parentNode.querySelector(`[data-unit-id="${id}"]`));
                }
            }
            saveBarracks();
            state = newState;
        }
    }

    function saveBarracks() {
        const heroes = BARRACKS.getElementsByClassName("hero-container");
        const mappedIds = Array.prototype.map.call(heroes, (hero) => {
            return {
                id: hero.dataset.unitId,
                favorite: hero.dataset.favorite == "false" ? false : true
            }
        });
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(mappedIds));
    }

    function addToBarracks() {
        const newButtons = createHeroItem(this.dataset.unitId, true);
        const deleteIcon = createDeleteIcon();
        const favoriteIcon = createFavoritesIcon();
        favoriteIcon.onclick = handleFavoriteHeroEvent(newButtons.heroButton, false);
        deleteIcon.onclick = handleDeleteHeroEvent(this.dataset.unitId, newButtons.heroButton);
        newButtons.iconsContainer.appendChild(deleteIcon);
        newButtons.iconsContainer.appendChild(favoriteIcon);
        BARRACKS.appendChild(newButtons.heroButton);
        newButtons.heroButton.dataset.favorite = false;
        newButtons.heroButton.onclick = function() {
            lastCheckedHero = this;
            checkInheritableSkills("weapon", this);
        };
        saveBarracks();
        SEARCH_RESULTS.removeChild(this);
    }

    function loadSearchSuggestions(pageIndex, append) {
        const items = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        const params = new URLSearchParams();
        for (let { id } of items) {
            params.append("ids", id);
        }
        if (searchQuery.trim().length) {
            params.append("query", searchQuery);
        }
        params.append("page", pageIndex);

        const abortController = new AbortController();

        return fetch(`http://localhost:3333/heroes?${params.toString()}`, {
            signal: abortController.signal
        }).catch(() => {}).then((response) => response.json()).then((elements) => {
            if (!append) {
                while (SEARCH_RESULTS.lastChild && SEARCH_RESULTS.lastChild.nodeName !== "DIV") SEARCH_RESULTS.removeChild(SEARCH_RESULTS.lastChild);
            }

            for (let elem of elements) {
                const { heroButton } = createHeroItem(elem);
                SEARCH_RESULTS.appendChild(heroButton);
                heroButton.onclick = addToBarracks;
            }

            let loadMore = document.getElementById("load-more");

            if (!loadMore) {
                const newLoadMore = document.createElement("button");
                newLoadMore.classList.add("cta");
                newLoadMore.id = "load-more";

                newLoadMore.onclick = function() {
                    this.disabled = true;
                    page++;
                    loadSearchSuggestions(page, true);
                };
                newLoadMore.innerHTML = "Load More";
                loadMore = newLoadMore;
            }

            SEARCH_RESULTS.appendChild(loadMore);
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

    function createFavoritesIcon() {
        const img = document.createElement("img");
        img.src = "./static/favorite-off.png";
        img.classList.add("favorite-button");
        return img;
    }

    function checkInheritableSkills(slot, hero) {
        const { unitId } = hero.dataset;
        const existingIds = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        const urlSearchParams = new URLSearchParams();
        for (let { id, favorite } of existingIds) {
            if (!favorite && id !== unitId) {
                urlSearchParams.append("intIDs", id);
            }
        }
        document.getElementById("inheritables").click();
        fetch(`http://localhost:3333/skills?slot=${slot}&searchedId=${unitId}&mode=roster&${urlSearchParams.toString()}`).then((res) => {
            return res.json();
        }).then((skillList) => {
            SKILL_DONORS_LIST.innerHTML = "";
            SKILL_FILTERS.classList.remove("hide");
            if (!Object.keys(skillList.Skills).length) {
                const noUnits = document.createElement("p");
                noUnits.innerHTML = `There are no units that could inherit any ${slot}.`;
                SKILL_DONORS_LIST.appendChild(noUnits);
                return;
            }
            for (let skill in skillList.Skills) {
                const skillData = skillList.Skills[skill];
                const skillSubtitle = document.createElement("h3");
                skillSubtitle.classList.add("skill-subtitle");
                skillSubtitle.innerHTML = skill;
                const skillTitleContainer = document.createElement("div");
                skillTitleContainer.classList.add("skill-title");

                if (!["weapon", "assist", "special"].includes(slot)) {
                    const skillIcon = document.createElement("img");
                    skillIcon.src = `https://feheroes.fandom.com/wiki/Special:Filepath/${skillData.icon}`;
                    skillIcon.classList.add("skill-icon");
                    skillTitleContainer.appendChild(skillIcon);
                }
                SKILL_DONORS_LIST.appendChild(skillSubtitle);

                skillTitleContainer.appendChild(skillSubtitle);

                SKILL_DONORS_LIST.appendChild(skillTitleContainer);

                for (let unitId of skillData.ids) {
                    const characterName = skillList.units[unitId];


                    const donorBanner = document.createElement("div");
                    donorBanner.classList.add("donor-banner");
                    donorBanner.innerText = characterName;
                    const donorImage = document.createElement("img");
                    donorImage.src = `http://localhost:3333/img?id=${unitId}&imgType=battle`;
                    donorImage.classList.add("skill-donor");
                    donorBanner.appendChild(donorImage);

                    SKILL_DONORS_LIST.appendChild(donorBanner);
                }
            }
        });
    }
})();