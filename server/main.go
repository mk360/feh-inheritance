package main

// example query : curl "http://localhost:3333/skills?searchedId=112&intIDs=112&intIDs=213&mode=roster&slot=C"
import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

var MOVEMENT_TYPES map[string]int = map[string]int{}
var WEAPON_TYPES map[string]int = map[string]int{}

var COLORS [4]string = [4]string{"Red", "Blue", "Green", "Colorless"}

var VARIED_COLORS_WEAPONS [5]string = [5]string{"Bow", "Tome", "Breath", "Beast", "Dagger"}

type SearchUnitsWikiResponse struct {
	CargoQuery []struct {
		Title struct {
			MoveType   string `json:"MoveType"`
			WeaponType string `json:"WeaponType"`
			IntID      string `json:"IntID"`
			Page       string `json:"Page"`
		} `json:"title"`
	} `json:"cargoquery"`
}

type SearchUnitsResponse struct {
	MovementType int    `json:"mvt"`
	WeaponType   int    `json:"wpn"`
	ID           int    `json:"id"`
	Name         string `json:"name"`
}

type SingleUnitWikiResponse struct {
	CargoQuery []struct {
		Title struct {
			MoveType   string `json:"MoveType"`
			WeaponType string `json:"WeaponType"`
		} `json:"title"`
	} `json:"cargoquery"`
}

func convertSlotName(slot string) string {
	switch slot {
	case "A":
		return "passivea"
	case "B":
		return "passiveb"
	case "C":
		return "passivec"
	default:
		return slot
	}
}

func inheritableSkillsRequest(intIDs []string, searchedIntID string, slot string) {
	var query = url.Values{}
	query.Set("action", "cargoquery")
	query.Set("format", "json")
	query.Set("tables", "Units")
	query.Set("where", "IntID = "+searchedIntID)
	query.Set("fields", "MoveType, WeaponType")

	resp, e := http.Get("https://feheroes.fandom.com/api.php?" + query.Encode())

	if e != nil {
		log.Fatalln(e)
	}

	defer resp.Body.Close()

	var singleUnitData SingleUnitWikiResponse = SingleUnitWikiResponse{}
	singleUnitBytes, _ := io.ReadAll(resp.Body)
	json.Unmarshal(singleUnitBytes, &singleUnitData)

	var moveType = singleUnitData.CargoQuery[0].Title.MoveType
	var weaponType = singleUnitData.CargoQuery[0].Title.WeaponType

	var conditions []string = []string{"Next is null", "Properties holds not \"story\"", "CanUseMove holds \"" + moveType + "\"", "CanUseWeapon holds \"" + weaponType + "\"", "Exclusive = false", "Properties holds not \"enemy\"", "Scategory = \"" + convertSlotName(slot) + "\""}

	var withoutSelf = filterOut(intIDs, searchedIntID)
	conditions = append(conditions, "IntID in ("+strings.Join(withoutSelf, ",")+")")

	if len(singleUnitData.CargoQuery) == 0 {

	} else {
		query.Set("tables", "Units, UnitSkills, Skills")
		query.Set("fields", "Skills.Name, Units._pageName=Unit")
		query.Set("join_on", "UnitSkills._pageName = Units._pageName, UnitSkills.skill = Skills.WikiName")
		query.Set("order_by", "Skills.Name ASC, Unit ASC")
		query.Set("limit", "500")
		query.Set("where", strings.Join(conditions, " and "))

		fmt.Println(query.Get("where"))

		resp, e := http.Get("https://feheroes.fandom.com/api.php?" + query.Encode())

		if e != nil {
			log.Fatalln(e)
		}

		defer resp.Body.Close()

		// data, _ := io.ReadAll(resp.Body)
	}
}

func filterOut(arr []string, el string) []string {
	var copy []string = []string{}
	for _, element := range arr {
		if element != el {
			copy = append(copy, element)
		}
	}

	return copy
}

func includes(arr []string, el string) bool {
	for _, element := range arr {
		if element == el {
			return true
		}
	}

	return false
}

func corsMiddleware(next http.Handler) http.Handler {
	var corsMiddleware = http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Add("Access-Control-Allow-Origin", "*")
		writer.Header().Add("Access-Control-Allow-Methods", "GET")
		next.ServeHTTP(writer, request)
	})

	return corsMiddleware
}

func getInheritableSkills(response http.ResponseWriter, req *http.Request) {
	req.ParseForm()

	if len(req.Form["searchedId"]) == 0 {
		response.WriteHeader(400)
		response.Write([]byte("You should specify the IntID of the unit you're inheriting for (\"searchedId\")\n"))
		return
	}

	if len(req.Form["mode"]) == 0 ||
		(req.Form["mode"][0] != "roster") {
		response.WriteHeader(400)
		response.Write([]byte("You should specify a search mode (\"roster\")\n"))
		return
	}

	if req.Form["mode"][0] == "roster" && len(req.Form["intIDs"]) == 0 {
		response.WriteHeader(400)
		response.Write([]byte("You should send an \"intIDs\" array when searching inside the roster\n"))
		return
	}

	var skillsArr = []string{"A", "B", "C", "weapon", "assist", "special"}

	if len(req.Form["slot"]) == 0 || !includes(skillsArr, req.Form["slot"][0]) {
		response.WriteHeader(400)
		response.Write([]byte("You should send a \"slot\" specifying either A, B, C, weapon, assist or special\n"))
	}

	inheritableSkillsRequest(req.Form["intIDs"], req.Form["searchedId"][0], req.Form["slot"][0])
}

func searchHeroes(response http.ResponseWriter, request *http.Request) {
	request.ParseForm()
	var searchQuery = strings.ToLower(request.Form.Get("query"))

	if len(searchQuery) > 2 {
		var query = url.Values{}
		query.Add("action", "cargoquery")
		query.Add("format", "json")
		query.Add("tables", "Units")
		query.Add("fields", "MoveType, WeaponType, IntID, Units._pageName=Page")

		var where []string = []string{"lower(Units._pageName) like \"" + searchQuery + "%\""}
		if len(request.Form["existingIds"]) > 0 {
			where = append(where, "IntID not in ("+strings.Join(request.Form["existingIds"], ",")+")")
		}

		query.Add("where", strings.Join(where, " and "))

		resp, e := http.Get("https://feheroes.fandom.com/api.php?" + query.Encode())

		if e != nil {
			response.Write([]byte(""))
			return
		}

		defer resp.Body.Close()

		data, _ := io.ReadAll(resp.Body)
		var unmarshaled SearchUnitsWikiResponse = SearchUnitsWikiResponse{}
		json.Unmarshal(data, &unmarshaled)

		searchResponse := make([]SearchUnitsResponse, len(unmarshaled.CargoQuery))

		for i, entry := range unmarshaled.CargoQuery {
			integerId, _ := strconv.Atoi(entry.Title.IntID)
			searchResponse[i] = SearchUnitsResponse{
				ID:           integerId,
				Name:         entry.Title.Page,
				WeaponType:   WEAPON_TYPES[entry.Title.WeaponType],
				MovementType: MOVEMENT_TYPES[entry.Title.MoveType],
			}
		}

		byteResponse, _ := json.Marshal(searchResponse)

		response.Write(byteResponse)
	} else {
		response.Write([]byte("[]"))
	}
}

func main() {
	MOVEMENT_TYPES["Infantry"] = 1
	MOVEMENT_TYPES["Armored"] = 2
	MOVEMENT_TYPES["Flying"] = 3
	MOVEMENT_TYPES["Cavalry"] = 4

	WEAPON_TYPES["Red Sword"] = 0
	WEAPON_TYPES["Blue Lance"] = 1
	WEAPON_TYPES["Green Axe"] = 2
	WEAPON_TYPES["Colorless Staff"] = 3

	var weaponIndex int = 4

	for _, color := range COLORS {
		for _, weapon := range VARIED_COLORS_WEAPONS {
			WEAPON_TYPES[color+" "+weapon] = weaponIndex
			weaponIndex++
		}
	}

	mux := http.NewServeMux()
	var inheritableSkills = http.HandlerFunc(getInheritableSkills)
	var heroesSearch = http.HandlerFunc(searchHeroes)
	mux.Handle("/skills", corsMiddleware(inheritableSkills))
	mux.Handle("/heroes", corsMiddleware(heroesSearch))
	http.ListenAndServe("localhost:3333", mux)
}
