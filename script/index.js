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
    const EXPORT_BUTTON = document.getElementById("export");
    const IMPORT_BUTTON = document.getElementById("import");

    const API_URL = "https://api.feh-inheritance.tonion-the-onion.com";
    let lastCheckedHero;

    let searchQuery = "";
    let page = 0;
    let currentFilter = "";

    document.getElementById("search").click();

    EXPORT_BUTTON.onclick = exportRoster;
    IMPORT_BUTTON.onchange = importRoster;

    Array.from(document.getElementsByClassName("filter-input")).forEach((input) => {
        input.onclick = function() {
            currentFilter = this.id;
            checkInheritableSkills(currentFilter, lastCheckedHero);
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
                        if (!currentFilter) {
                            currentFilter = "weapon";
                            document.getElementById(currentFilter).checked = true;
                        }
                        checkInheritableSkills(currentFilter, this);
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
                    boundItem.parentNode.insertBefore(boundItem, boundItem.parentNode.querySelector(`[data-unit-id="${id}"]`));
                }
            }
            saveBarracks();
            state = newState;
            lastCheckedHero = boundItem;
            document.getElementById("weapon").click();
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
            if (!currentFilter) {
                currentFilter = "weapon";
                document.getElementById(currentFilter).checked = true;
            }
            checkInheritableSkills(currentFilter, this);
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

        return fetch(`${API_URL}/heroes?${params.toString()}`, {
            signal: abortController.signal
        }).catch(() => {}).then((response) => response.json()).then((elements) => {
            if (!append) {
                SEARCH_RESULTS.innerHTML = "";
            }

            for (let elem of elements) {
                const { wpn, mvt, id, name} = elem;
                const { heroButton, iconsContainer } = createHeroItem(id, true);
                // const weaponTypeImage = document.createElement("img");
                // const stringWeaponType = WEAPON_TYPES[wpn].replace(/ /g, "_");
                // weaponTypeImage.src = `https://feheroes.fandom.com/wiki/Special:Filepath/Icon_Class_${stringWeaponType}.png`;
                // weaponTypeImage.classList.add("top-left");
                // iconsContainer.appendChild(weaponTypeImage);
                SEARCH_RESULTS.appendChild(heroButton);
                heroButton.onclick = addToBarracks;
            }

            let loadMore = document.getElementById("load-more");

            if (!loadMore) {
                const newLoadMore = document.createElement("button");
                newLoadMore.classList.add("cta");
                newLoadMore.id = "load-more";

                newLoadMore.onclick = function() {
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
        img.loading = "lazy";
        img.src = `${API_URL}/img?id=${heroId}&imgType=portrait`;
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
        const withoutFavorites = existingIds.filter(({ favorite }) => !favorite);
        const hexIds = withoutFavorites.map(({ id }) => (+id).toString(16));

        document.getElementById("inheritables").click();
        fetch(`${API_URL}/skills?slot=${slot}&searchedId=${unitId}&mode=roster&ids=${hexIds.join(",")}`).then((res) => {
            return res.json();
        }).then((skillList) => {
            SKILL_DONORS_LIST.innerHTML = "";
            SKILL_FILTERS.classList.remove("hide");
            document.getElementById("upgrade-heading").innerHTML = `Skills that ${skillList.searched} can inherit`
            if (!Object.keys(skillList.Skills).length) {
                const noUnits = document.createElement("div");
                noUnits.classList.add("donor-banner");
                noUnits.innerHTML = `There are no units that could give any ${slot} in the current roster.`;
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
                const skillIcon = document.createElement("img");
                skillIcon.classList.add("skill-icon");
                skillIcon.loading = "lazy";

                if (!["weapon", "assist", "special"].includes(slot)) {
                    skillIcon.src = `https://feheroes.fandom.com/wiki/Special:Filepath/${skillData.icon}`;
                } else {
                    skillIcon.src = `./static/${slot}-icon.png`;
                }

                skillTitleContainer.appendChild(skillIcon);
                SKILL_DONORS_LIST.appendChild(skillSubtitle);

                skillTitleContainer.appendChild(skillSubtitle);

                SKILL_DONORS_LIST.appendChild(skillTitleContainer);

                for (let unitId of skillData.ids) {
                    const characterName = skillList.units[unitId];
                    const donorBanner = document.createElement("div");
                    donorBanner.classList.add("donor-banner");
                    donorBanner.innerText = characterName;
                    const donorImage = document.createElement("img");
                    donorImage.loading = "lazy";
                    donorImage.src = `${API_URL}/img?id=${unitId}&imgType=battle`;
                    donorImage.classList.add("skill-donor");
                    donorBanner.appendChild(donorImage);

                    SKILL_DONORS_LIST.appendChild(donorBanner);
                }
            }
        });
    }

    function importRoster() {
        const [file] = this.files;
        const fileReader = new FileReader();
        fileReader.onerror = function() {
            alert("An error happened, please try again.");
        }
        fileReader.onloadend = ({ target }) => {
            const { result } = target;
            try {
                const loadedData = JSON.parse(result);
                const corruptedObject = loadedData.find((entry) => {
                    return typeof entry !== "object" || !entry.id || !("favorite" in entry);
                });
                if (corruptedObject) {
                    throw new Error();   
                }

                BARRACKS.innerHTML = "";

                for (let data of loadedData) {
                    const entry = createHeroItem(data.id, true);
                    const favoriteIcon = createFavoritesIcon();
                    const deleteIcon = createDeleteIcon();
                    entry.heroButton.dataset.favorite = entry.favorite;
                    favoriteIcon.src = entry.favorite ? "./static/favorite-on.png" : "./static/favorite-off.png";
                    entry.iconsContainer.appendChild(favoriteIcon);
                    entry.iconsContainer.appendChild(deleteIcon);
                    favoriteIcon.onclick = handleFavoriteHeroEvent(entry.heroButton, false);

                    deleteIcon.onclick = handleDeleteHeroEvent(entry.heroButton.dataset.unitId, entry.heroButton);
                    BARRACKS.appendChild(entry.heroButton);
                }

                saveBarracks();

            } catch (e) {
                alert("There was an error parsing your file. Please try with another one.");
            }
        }
        fileReader.readAsText(file);
    }

    function exportRoster() {
        const stringified = JSON.stringify(JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY)));
        const link = document.createElement("a");
        link.style.display = "none";
        document.body.appendChild(link);
        link.download = "feh-roster.json";
        const blob = new Blob([stringified], { type: "text/json"});
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.click();
        document.body.removeChild(link);
    };
})();