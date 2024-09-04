(function initiateApp() {
    const ROSTER_KEY = "roster";
    const MOVEMENT_TYPES = ["Infantry", "Armored", "Flying", "Cavalry"];
    const WEAPON_TYPES = ["Red Sword", "Blue Lance", "Green Axe", "Colorless Staff"];
    const BARRACKS = document.getElementById("barracks");
    const TABS = document.querySelectorAll('input[name="tab"]');
    const SEARCH_RESULTS = document.getElementById("search-content");
    const HERO_SEARCH = document.getElementById("global-hero-search");
    const BARRACKS_SEARCH = document.getElementById("barracks-search");
    const SKILL_DONORS_LIST = document.getElementById("skill-donors");
    const SKILL_FILTERS = document.getElementById("skill-filters");
    const EXPORT_BUTTON = document.getElementById("export");
    const IMPORT_BUTTON = document.getElementById("import");
    const CLEAR_BUTTON = document.getElementById("clear");
    
    const API_URL = "https://api.feh-inheritance.tonion-the-onion.com";
    let lastCheckedHero;

    let searchQuery = "";
    let page = 0;
    let currentFilter = "";

    document.getElementById("search").click();

    EXPORT_BUTTON.onclick = exportRoster;
    IMPORT_BUTTON.onchange = importRoster;
    CLEAR_BUTTON.onclick = clearRoster;

    BARRACKS_SEARCH.onkeyup = searchInsideBarracks;

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

    if (localStorage.getItem(ROSTER_KEY) === null) {
        localStorage.setItem(ROSTER_KEY, "[]");
    } else {
        loadBarracks();
        updateBarracks();
    }

    loadSearchSuggestions(page);

    function loadBarracks() {
        const items = JSON.parse(localStorage.getItem(ROSTER_KEY) ?? "[]");
        if (items.length) {
            const characterMap = new Map();
            for (let { id, ...rest } of items) {
                if (!id) continue;
                if (!characterMap.get(id)) characterMap.set(id, rest);
            }
            const fixedJSON = [];
            characterMap.forEach((value, key) => {
                if (value.name) {
                    fixedJSON.push({
                        id: key,
                        ...value
                    });
                }
            });
            localStorage.setItem(ROSTER_KEY, JSON.stringify(fixedJSON));

            for (let savedItem of items) {
                const { heroButton } = createBarracksItem(savedItem);
                BARRACKS.appendChild(heroButton);
            }
        } else {
            BARRACKS.innerHTML = "";
        }
    }

    function handleDeleteHeroEvent(unitId, boundItem) {
        return function deleteFromBarracks(e) {
            e.stopPropagation();
            BARRACKS.removeChild(boundItem);
            loadSearchSuggestions(page);
            const newJSON = JSON.parse(localStorage.getItem(ROSTER_KEY)).filter((item) => +item.id !== +unitId);
            localStorage.setItem(ROSTER_KEY, JSON.stringify(newJSON));
        }
    }

    function handleFavoriteHeroEvent(boundItem, startingState) {
        let state = startingState;
        return function toggleFavorite(e) {
            const newState = !state;
            this.src = newState ? "./static/favorite-on.png" : "./static/favorite-off.png";
            boundItem.dataset.favorite = newState.toString();
            e.stopPropagation();
            const savedBarracks = JSON.parse(localStorage.getItem(ROSTER_KEY));
            const currentEntry = savedBarracks.find((i) => +i.id === +boundItem.dataset.unitId);
            const mappedById = savedBarracks.map((i) => +i.id);

            if (newState) {
                const firstUnfavorite = savedBarracks.find((hero) => !hero.favorite);
                if (firstUnfavorite) {
                    const { id } = firstUnfavorite;
                    const currentEntryIndex = mappedById.indexOf(+currentEntry.id);
                    savedBarracks.splice(currentEntryIndex, 1);
                    savedBarracks.unshift(currentEntry);
                    boundItem.parentNode.insertBefore(boundItem, boundItem.parentNode.querySelector(`[data-unit-id="${id}"]`));
                    currentEntry.favorite = true;
                    localStorage.setItem(ROSTER_KEY, JSON.stringify(savedBarracks));
                }
            } else {
                currentEntry.favorite = false;
                const currentEntryIndex = mappedById.indexOf(+currentEntry.id);
                savedBarracks[currentEntryIndex] = currentEntry;
                localStorage.setItem(ROSTER_KEY, JSON.stringify(savedBarracks));
            }
            state = newState;
            lastCheckedHero = boundItem;
            document.getElementById("weapon").click();
        }
    }

    function addToBarracks() {
        const newButtons = createBarracksItem({
            id: this.dataset.unitId,
            name: this.dataset.heroName,
            favorite: false,
        });
        BARRACKS.appendChild(newButtons.heroButton);
        newButtons.heroButton.onclick = function() {
            lastCheckedHero = this;
            if (!currentFilter) {
                currentFilter = "weapon";
                document.getElementById(currentFilter).checked = true;
            }
            checkInheritableSkills(currentFilter, this);
        };
        const savedJSON = JSON.parse(localStorage.getItem(ROSTER_KEY));
        savedJSON.push({
            id: this.dataset.unitId,
            name: this.dataset.heroName,
            favorite: false
        });
        localStorage.setItem(ROSTER_KEY, JSON.stringify(savedJSON));
        SEARCH_RESULTS.removeChild(this);
    }

    function loadSearchSuggestions(pageIndex, append) {
        const items = JSON.parse(localStorage.getItem(ROSTER_KEY) ?? "[]");
        const params = new URLSearchParams();
        const hexIds = items.map(({ id }) => (+id).toString(16)).join(",");
        if (hexIds.length) params.append("ids", hexIds);
        if (searchQuery.trim().length) {
            params.append("query", searchQuery);
        }
        params.append("page", pageIndex);

        return sendRequest(`/heroes?${params.toString()}`).then((elements) => {
            if (!append) {
                SEARCH_RESULTS.innerHTML = "";
            }

            for (let elem of elements) {
                const [id, mvt, wpn, name] = elem.split("-");
                console.log(elem.split("-"));
                const { heroButton, iconsContainer } = createHeroItem(id, true, name);
                const weaponTypeImage = document.createElement("img");
                const stringWeaponType = WEAPON_TYPES[wpn].replace(/ /g, "_");
                weaponTypeImage.loading = "lazy";
                weaponTypeImage.src = `https://feheroes.fandom.com/wiki/Special:Redirect/file/Icon_Class_${stringWeaponType}.png`;
                weaponTypeImage.alt = stringWeaponType;
                weaponTypeImage.classList.add("top-left");

                const movementTypeImage = document.createElement("img");
                movementTypeImage.loading = "lazy";
                const stringMovementType = MOVEMENT_TYPES[mvt];
                movementTypeImage.src = `https://feheroes.fandom.com/wiki/Special:Redirect/file/Icon_Move_${stringMovementType}.png`;
                movementTypeImage.classList.add("bottom-right");
                
                iconsContainer.appendChild(movementTypeImage);
                iconsContainer.appendChild(weaponTypeImage);
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

    function createHeroItem(heroId, addIcons, alt) {
        const heroButton = document.createElement("button");
        heroButton.classList.add("hero-container");
        const frame = document.createElement("img");
        frame.alt = "";
        frame.src = "./static/frame.webp";
        frame.classList.add("hero-frame");

        const img = document.createElement("img");
        img.loading = "lazy";
        img.src = `${API_URL}/img?id=${heroId}&imgType=portrait`;
        img.classList.add("portrait");
        img.alt = alt ?? "";
        heroButton.appendChild(img);
        heroButton.dataset.unitId = heroId;
        if (alt) {
            heroButton.dataset.heroName = alt;
        }
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

    function createFavoritesIcon(initialState) {
        const img = document.createElement("img");
        img.src = initialState ? "./static/favorite-on.png" : "./static/favorite-off.png";
        img.classList.add("top-left");
        return img;
    }

    function checkInheritableSkills(slot, hero) {
        const { unitId } = hero.dataset;
        const existingIds = JSON.parse(localStorage.getItem(ROSTER_KEY));
        const withoutFavorites = existingIds.filter(({ favorite }) => !favorite);
        const hexIds = withoutFavorites.map(({ id }) => (+id).toString(16));

        document.getElementById("inheritables").click();
        sendRequest(`/skills?slot=${slot}&searchedId=${unitId}&ids=${hexIds.join(",")}`).then((skillList) => {
            SKILL_DONORS_LIST.innerHTML = "";
            const UPGRADE_HEADING = document.getElementById("upgrade-heading");
            SKILL_FILTERS.classList.remove("hide");
            UPGRADE_HEADING.innerHTML = `Skills that ${skillList.searched} can inherit`
            UPGRADE_HEADING.classList.add("target-banner");
            let targetPortrait = document.getElementById("target-portrait");

            if (!targetPortrait) {
                targetPortrait = document.createElement("img");
                targetPortrait.id = "target-portrait";
                targetPortrait.loading = "lazy";
                UPGRADE_HEADING.appendChild(targetPortrait);
            }

            targetPortrait.alt = "";
            targetPortrait.src = `${API_URL}/img?id=${unitId}&imgType=battle`;

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
                    skillIcon.src = `https://feheroes.fandom.com/wiki/Special:Redirect/file/${skillData.icon}.png`;
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
                    donorBanner.innerText = characterName.replace(":", ": ");
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
                    const favoriteIcon = createFavoritesIcon(data.favorite);
                    const deleteIcon = createDeleteIcon();
                    entry.heroButton.dataset.favorite = data.favorite;
                    entry.iconsContainer.appendChild(favoriteIcon);
                    entry.iconsContainer.appendChild(deleteIcon);
                    favoriteIcon.onclick = handleFavoriteHeroEvent(entry.heroButton, false);

                    deleteIcon.onclick = handleDeleteHeroEvent(entry.heroButton.dataset.unitId, entry.heroButton);
                    BARRACKS.appendChild(entry.heroButton);
                }

                localStorage.setItem(ROSTER_KEY, JSON.stringify(loadedData));

                updateBarracks();
                loadSearchSuggestions(0);

            } catch (e) {
                alert("There was an error parsing your file. Please try with another one.");
            }
        }
        fileReader.readAsText(file);
    }

    function exportRoster() {
        const parsedJSON = JSON.parse(localStorage.getItem(ROSTER_KEY));
        const stringified = JSON.stringify(parsedJSON);
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

    function adjustHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    window.addEventListener('load', adjustHeight);
    window.addEventListener('resize', adjustHeight);

    function updateBarracks() {
        const toUpdate = JSON.parse(localStorage.getItem(ROSTER_KEY)).filter((item) => !item.name);
        if (toUpdate.length) {
            const barracks = convertToHex(toUpdate, ({ id }) => id);
            sendRequest(`/names?ids=${barracks.join(",")}`).then((heroes) => {
                for (let i = 0; i < heroes.length; i++) {
                    toUpdate[i].name = heroes[i];
                }

                localStorage.setItem(ROSTER_KEY, JSON.stringify(toUpdate));
            });
        }
    }

    async function sendRequest(path) {
        const abortController = new AbortController();
        
        return fetch(`${API_URL}${path}`, {
            signal: abortController.signal
        }).catch(() => {}).then((resp) => resp.json());
    }

    function convertToHex(idsArray, valueExtractor) {
        return idsArray.map(valueExtractor).map((item) => (+item).toString(16));
    }

    function clearRoster() {
        localStorage.clear();
        loadBarracks();
        loadSearchSuggestions(0);
    }

    function searchInsideBarracks(e) {
        const query = e.target.value.toLowerCase();
        if (query === "") {
            Array.from(BARRACKS.children).forEach((child) => child.classList.remove("hide"));
        } else if (query.length >= 2) {
            const heroes = JSON.parse(localStorage.getItem(ROSTER_KEY) ?? "[]");

            for (let i = 0; i < heroes.length; i++) {
                const item = heroes[i];
                const id = item.id;
                const element = item.name.toLowerCase();
                if (element.startsWith(query)) {
                    BARRACKS.querySelector(`[data-unit-id="${id}"]`).classList.remove("hide");
                } else {
                    BARRACKS.querySelector(`[data-unit-id="${id}"]`).classList.add("hide");
                }
            }
        }
    }

    function createBarracksItem(barracksEntry) {
        const item = createHeroItem(barracksEntry.id, true, barracksEntry.name);
        const favoriteIcon = createFavoritesIcon(barracksEntry.favorite);
        const deleteIcon = createDeleteIcon();
        item.heroButton.dataset.favorite = barracksEntry.favorite;
        item.heroButton.dataset.unitId = barracksEntry.id;
        item.heroButton.dataset.heroName = barracksEntry.name;
        item.heroButton.onclick = function(){
            lastCheckedHero = this;
            if (!currentFilter) {
                currentFilter = "weapon";
                document.getElementById(currentFilter).checked = true;
            }
            checkInheritableSkills(currentFilter, this);
        };
        favoriteIcon.onclick = handleFavoriteHeroEvent(item.heroButton, barracksEntry.favorite);
        deleteIcon.onclick = handleDeleteHeroEvent(item.heroButton.dataset.unitId, item.heroButton);

        item.iconsContainer.appendChild(favoriteIcon);
        item.iconsContainer.appendChild(deleteIcon);

        return item;
    }
})();