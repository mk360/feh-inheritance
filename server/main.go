package main

// example query : curl "http://localhost:3333/skills?searchedId=112&intIDs=112&intIDs=213&mode=roster&slot=C"
import (
	"encoding/json"
	"fmt"
	"inheritance/array"
	"inheritance/client"
	"inheritance/common"
	"inheritance/queries"
	"inheritance/structs"
	"inheritance/utils"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	dotenv "github.com/joho/godotenv"
)

var skillsArr = []string{"A", "B", "C", "X", "weapon", "assist", "special"}

var COLORS [4]string = [4]string{"Red", "Blue", "Green", "Colorless"}

var VARIED_COLORS_WEAPONS [5]string = [5]string{"Bow", "Tome", "Breath", "Beast", "Dagger"}

func corsMiddleware(next http.Handler) http.Handler {
	dotenv.Load("./.env")
	var corsMiddleware = http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Add("Access-Control-Allow-Origin", os.Getenv("CORS_DOMAIN"))
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

	if len(req.Form["ids"]) == 0 {
		response.WriteHeader(400)
		response.Write([]byte("You should send an \"intIDs\" array when searching inside the roster\n"))
		return
	}

	if len(req.Form["slot"]) == 0 || !array.Includes(skillsArr, req.Form["slot"][0]) {
		response.WriteHeader(400)
		response.Write([]byte("You should send a \"slot\" specifying either A, B, C, X, weapon, assist or special\n"))
	}

	var skills = queries.GetInheritableSkills(req.Form["ids"], req.Form["searchedId"][0], req.Form["slot"][0])

	json.NewEncoder(response).Encode(skills)
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

		json.NewEncoder(response).Encode(responseIds)
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

func findNames(response http.ResponseWriter, request *http.Request) {
	request.ParseForm()
	var responseIds = queries.GetBarracksHeroes(strings.Split(request.Form["ids"][0], ","))
	byteResponse, _ := json.Marshal(responseIds)

	response.Write(byteResponse)
}

func getHeroUrl(response http.ResponseWriter, request *http.Request) {
	request.ParseForm()
	var imgType = request.Form.Get("imgType")
	if len(request.Form["id"]) == 0 || (imgType != "battle" && imgType != "portrait") {
		response.WriteHeader(400)
		return
	}
	var _, e = strconv.Atoi(request.Form.Get("id"))
	if e != nil {
		response.WriteHeader(400)
	}

	_, err := os.Stat("./cache/" + imgType)
	if err != nil {
		os.Mkdir("./cache/"+imgType, 0644)
	}

	var filePath = "./cache/" + imgType + "/" + request.Form.Get("id") + ".webp"

	_, fileErr := os.Stat(filePath)
	if fileErr != nil {
		query := map[string]string{
			"action": "cargoquery",
			"format": "json",
			"tables": "Units",
			"fields": "Units.WikiName=Page",
			"where":  "Properties holds not \"enemy\" and IntID = " + request.Form.Get("id"),
		}

		resp, _ := client.RunBotRequest(query)
		var marshaled, _ = resp.Value.Marshal()
		var unmarshaled structs.SearchUnitsWikiResponse = structs.SearchUnitsWikiResponse{}
		json.Unmarshal(marshaled, &unmarshaled)

		if len(unmarshaled.CargoQuery) == 0 {
			fmt.Println("Searched for a missing id, " + request.Form.Get("id"))
			response.WriteHeader(404)
			return
		}
		var imageURL = utils.GetCharacterAssetPath(url.QueryEscape(strings.ReplaceAll(unmarshaled.CargoQuery[0].Title.Page, " ", "_")) + convertImageType(imgType) + ".webp")
		imageCDNLocation, err := http.Get(imageURL)
		if err != nil {
			log.Println(err)
			response.Write([]byte("{}"))
		}
		defer imageCDNLocation.Body.Close()
		imageByteData, _ := io.ReadAll(imageCDNLocation.Body)
		os.WriteFile(filePath, imageByteData, 0644)
		response.Write(imageByteData)
	} else {
		var openedFile, _ = os.ReadFile(filePath)
		response.Write(openedFile)
	}
}

func healthEndpoint(response http.ResponseWriter, request *http.Request) {
	response.Write([]byte(""))
}

func main() {
	client.SetupBots()
	common.MOVEMENT_TYPES["Infantry"] = 0
	common.MOVEMENT_TYPES["Armored"] = 1
	common.MOVEMENT_TYPES["Flying"] = 2
	common.MOVEMENT_TYPES["Cavalry"] = 3

	common.WEAPON_TYPES["Red Sword"] = 0
	common.WEAPON_TYPES["Blue Lance"] = 1
	common.WEAPON_TYPES["Green Axe"] = 2
	common.WEAPON_TYPES["Colorless Staff"] = 3

	var weaponIndex int = 4

	for _, color := range COLORS {
		for _, weapon := range VARIED_COLORS_WEAPONS {
			common.WEAPON_TYPES[color+" "+weapon] = weaponIndex
			weaponIndex++
		}
	}

	mux := http.NewServeMux()
	var inheritableSkills = http.HandlerFunc(getInheritableSkills)
	var heroesRoute = http.HandlerFunc(searchHeroes)
	var imgRoute = http.HandlerFunc(getHeroUrl)
	var namesRoute = http.HandlerFunc(findNames)
	var healthRoute = http.HandlerFunc(healthEndpoint)
	mux.Handle("/skills", inheritableSkills)
	mux.Handle("/heroes", heroesRoute)
	mux.Handle("/names", namesRoute)
	mux.Handle("/img", imgRoute)
	mux.Handle("/health", healthRoute)
	fmt.Println("Listening to port 3333")
	http.ListenAndServe("localhost:3333", corsMiddleware(mux))
}
