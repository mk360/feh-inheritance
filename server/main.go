package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
)

func corsMiddleware(next http.Handler) http.Handler {
	var corsMiddleware = http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Add("Access-Control-Allow-Origin", "*")
		writer.Header().Add("Access-Control-Allow-Methods", "GET")
		next.ServeHTTP(writer, request)
	})

	return corsMiddleware
}

type SingleUnitResponse struct {
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

	var singleUnitData SingleUnitResponse = SingleUnitResponse{}
	singleUnitBytes, _ := io.ReadAll(resp.Body)
	json.Unmarshal(singleUnitBytes, &singleUnitData)

	var moveType = singleUnitData.CargoQuery[0].Title.MoveType
	var weaponType = singleUnitData.CargoQuery[0].Title.WeaponType

	if len(singleUnitData.CargoQuery) == 0 {

	} else {
		var withoutSelf = filterOut(intIDs, searchedIntID)

		query.Set("tables", "Units, UnitSkills, Skills")
		query.Set("fields", "Skills.Name, Units._pageName=Unit, unlockRarity")
		query.Set("join_on", "UnitSkills._pageName = Units._pageName, UnitSkills.skill = Skills.WikiName")
		query.Set("order_by", "Unit ASC, unlockRarity DESC")
		query.Set("where", "CanUseMove holds \""+moveType+"\" and CanUseWeapon holds \""+weaponType+"\" and IntID in ("+strings.Join(withoutSelf, ",")+") and Exclusive = false and Properties holds not \"enemy\" and Scategory=\""+convertSlotName(slot)+"\"")

		fmt.Println(query.Get("where"))

		resp, e := http.Get("https://feheroes.fandom.com/api.php?" + query.Encode())

		if e != nil {
			log.Fatalln(e)
		}

		defer resp.Body.Close()

		data, _ := io.ReadAll(resp.Body)
		fmt.Println(string(data))
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

func getInheritableSkills(response http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		response.WriteHeader(405)
		return
	}

	req.ParseForm()

	if len(req.Form["searchedId"]) == 0 {
		response.WriteHeader(400)
		response.Write([]byte("You should specify the IntID of the unit you're inheriting for (\"searchedId\")\n"))
		return
	}

	if len(req.Form["mode"]) == 0 ||
		(req.Form["mode"][0] != "roster" && req.Form["mode"][0] != "all") {
		response.WriteHeader(400)
		response.Write([]byte("You should specify a search mode (\"roster\" or \"all\")\n"))
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

	var searchMode = req.Form["mode"][0]

	if searchMode == "roster" {
		inheritableSkillsRequest(req.Form["intIDs"], req.Form["searchedId"][0], req.Form["slot"][0])
	}
}

func searchHeroes(http.ResponseWriter, *http.Request) {

}

func main() {
	mux := http.NewServeMux()
	var inheritableSkills = http.HandlerFunc(getInheritableSkills)
	var heroesSearch = http.HandlerFunc(searchHeroes)
	mux.Handle("/skills", corsMiddleware(inheritableSkills))
	mux.Handle("/heroes", corsMiddleware(heroesSearch))
	http.ListenAndServe("localhost:3333", mux)
}
