package main

// example query : curl "http://localhost:3333/skills?searchedId=112&intIDs=112&intIDs=213&mode=roster&slot=C"
import (
	"encoding/json"
	"inheritance/array"
	"inheritance/queries"
	"inheritance/structs"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

var MOVEMENT_TYPES map[string]int = map[string]int{}
var WEAPON_TYPES map[string]int = map[string]int{}
var skillsArr = []string{"A", "B", "C", "weapon", "assist", "special"}

var COLORS [4]string = [4]string{"Red", "Blue", "Green", "Colorless"}

var VARIED_COLORS_WEAPONS [5]string = [5]string{"Bow", "Tome", "Breath", "Beast", "Dagger"}

type UnitWithId struct {
	Units  []string `json:"units"`
	IntIDs []int    `json:"ids"`
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

	if len(req.Form["slot"]) == 0 || !array.Includes(skillsArr, req.Form["slot"][0]) {
		response.WriteHeader(400)
		response.Write([]byte("You should send a \"slot\" specifying either A, B, C, weapon, assist or special\n"))
	}

	var skills = queries.GetInheritableSkills(req.Form["intIDs"], req.Form["searchedId"][0], req.Form["slot"][0])

	response.Write(skills)
}

func searchHeroes(response http.ResponseWriter, request *http.Request) {
	request.ParseForm()
	var searchQuery = strings.ToLower(request.Form.Get("query"))
	const PAGE_SIZE int = 100

	if len(request.Form["page"]) > 0 {
		convertedPage, e := strconv.Atoi(request.Form["page"][0])
		if e != nil {
			response.WriteHeader(400)
			response.Write([]byte("Bad page format"))
			return
		}

		var responseIds = queries.GetHeroes(searchQuery, request.Form["ids"], convertedPage, PAGE_SIZE)

		byteResponse, _ := json.Marshal(responseIds)

		response.Write(byteResponse)
	}
}

func convertImageType(imgType string) string {
	switch imgType {
	case "portrait":
		return "_Face_FC"
	case "battle":
		return "_BtlFace_BU"
	}

	return ""
}

func getHeroUrl(response http.ResponseWriter, request *http.Request) {
	request.ParseForm()
	if len(request.Form["id"]) == 0 {
		response.WriteHeader(400)
		return
	}

	var imgType = request.Form.Get("imgType")

	var query = url.Values{}
	query.Add("action", "cargoquery")
	query.Add("format", "json")
	query.Add("tables", "Units")
	query.Add("fields", "Units.WikiName=Page")
	query.Add("where", "Properties holds not \"enemy\" and IntID = "+request.Form.Get("id"))

	resp, e := http.Get("https://feheroes.fandom.com/api.php?" + query.Encode())

	if e != nil {
		response.Write([]byte(""))
		return
	}

	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	var unmarshaled structs.SearchUnitsWikiResponse = structs.SearchUnitsWikiResponse{}
	json.Unmarshal(data, &unmarshaled)
	var url = "https://feheroes.fandom.com/wiki/Special:Filepath/" + url.QueryEscape(strings.Replace(unmarshaled.CargoQuery[0].Title.Page, " ", "_", -1)) + convertImageType(imgType) + ".webp"
	response.Header().Set("Location", url)
	response.Header().Set("Cache-Control", "max-age=604800")
	response.WriteHeader(302)
}

func main() {
	MOVEMENT_TYPES["Infantry"] = 0
	MOVEMENT_TYPES["Armored"] = 1
	MOVEMENT_TYPES["Flying"] = 2
	MOVEMENT_TYPES["Cavalry"] = 3

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
	var heroImgSearch = http.HandlerFunc(getHeroUrl)
	mux.Handle("/skills", corsMiddleware(inheritableSkills))
	mux.Handle("/heroes", corsMiddleware(heroesSearch))
	mux.Handle("/img", corsMiddleware(heroImgSearch))
	http.ListenAndServe("localhost:3333", mux)
}
