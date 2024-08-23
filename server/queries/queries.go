package queries

import (
	"encoding/json"
	"fmt"
	"inheritance/array"
	"inheritance/structs"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

var wikiNameReplacementRegex, _ = regexp.Compile("(?P<stat1>.*(Atk|Spd|Def|Res))(?P<stat2>(Atk|Spd|Def|Res).*)")

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

func GetInheritableSkills(intIDs []string, searchedIntID string, slot string) []byte {
	var query = url.Values{}
	query.Set("action", "cargoquery")
	query.Set("format", "json")
	query.Set("tables", "Units")
	query.Set("where", "IntID = "+searchedIntID)
	query.Set("fields", "MoveType, WeaponType, Units._pageName=Unit")

	resp, e := http.Get("https://feheroes.fandom.com/api.php?" + query.Encode())

	if e != nil {
		log.Fatalln(e)
	}

	defer resp.Body.Close()

	var singleUnitData structs.SingleUnitWikiResponse = structs.SingleUnitWikiResponse{}
	singleUnitBytes, _ := io.ReadAll(resp.Body)
	json.Unmarshal(singleUnitBytes, &singleUnitData)

	var moveType = singleUnitData.CargoQuery[0].Title.MoveType
	var weaponType = singleUnitData.CargoQuery[0].Title.WeaponType

	var conditions []string = []string{"Next is null", "Units.Properties holds not \"story\"", "CanUseMove holds \"" + moveType + "\"", "CanUseWeapon holds \"" + weaponType + "\"", "Exclusive = false", "Units.Properties holds not \"enemy\"", "Scategory = \"" + convertSlotName(slot) + "\""}

	var withoutSelf = array.FilterOut(intIDs, searchedIntID)
	conditions = append(conditions, "IntID in ("+strings.Join(withoutSelf, ",")+")")

	if len(singleUnitData.CargoQuery) > 0 {
		query.Set("tables", "Units, UnitSkills, Skills")
		query.Set("fields", "Skills.Name, Skills.Icon, Units._pageName=Unit, IntID, Required")
		query.Set("join_on", "UnitSkills._pageName = Units._pageName, UnitSkills.skill = Skills.WikiName")
		query.Set("order_by", "Skills.Name ASC, Unit ASC")
		query.Set("limit", "500")
		query.Set("where", strings.Join(conditions, " and "))

		resp, e := http.Get("https://feheroes.fandom.com/api.php?" + query.Encode())

		if e != nil {
			log.Fatalln(e)
		}

		defer resp.Body.Close()

		data, _ := io.ReadAll(resp.Body)

		var skillResponse structs.SearchSkillsWikiResponse = structs.SearchSkillsWikiResponse{}
		json.Unmarshal(data, &skillResponse)
		var parsedResponse structs.SearchSkillsResponse = structs.SearchSkillsResponse{
			Skills:   map[string]structs.SkillInfos{},
			Units:    map[int]string{},
			Searched: singleUnitData.CargoQuery[0].Title.Unit,
		}

		for _, responseTitle := range skillResponse.CargoQuery {
			_, ok := parsedResponse.Skills[responseTitle.Title.Name]
			if !ok {
				parsedResponse.Skills[responseTitle.Title.Name] = structs.SkillInfos{
					Ids:  []int{},
					Icon: responseTitle.Title.Icon,
				}
			}

			conv, _ := strconv.Atoi(responseTitle.Title.IntID)

			skillDictIds := parsedResponse.Skills[responseTitle.Title.Name]
			skillDictIds.Ids = append(skillDictIds.Ids, conv)

			parsedResponse.Skills[responseTitle.Title.Name] = skillDictIds

			matches := wikiNameReplacementRegex.FindStringSubmatch(responseTitle.Title.Required)
			// cases like "Fort. Def/Res 2" need special treatment because the "Required" field actually uses the WikiName, not the real name
			// so we split the string where the stats need a slash
			// and then manually add the slash

			var patchedName = responseTitle.Title.Required

			if len(matches) > 0 {
				var firstStringHalf = matches[wikiNameReplacementRegex.SubexpIndex("stat1")]
				var secondStringHalf = matches[wikiNameReplacementRegex.SubexpIndex("stat2")]
				patchedName = firstStringHalf + "/" + secondStringHalf
			}

			currentLearners, requiredSkillExists := parsedResponse.Skills[patchedName]

			if requiredSkillExists && array.Equals(currentLearners.Ids, parsedResponse.Skills[responseTitle.Title.Name].Ids) {
				delete(parsedResponse.Skills, patchedName)
			}

			_, unitOk := parsedResponse.Units[conv]

			if !unitOk {
				parsedResponse.Units[conv] = responseTitle.Title.Unit
			}
		}

		stringified, _ := json.Marshal(parsedResponse)

		return stringified
	}

	return []byte("")
}

func GetHeroes(searchQuery string, idsToOmit []string, page int, pageSize int) []int {
	var query = url.Values{}
	query.Add("action", "cargoquery")
	query.Add("format", "json")
	query.Add("tables", "Units")
	query.Add("limit", strconv.Itoa(pageSize))
	query.Add("fields", "IntID")
	query.Add("order_by", "ReleaseDate DESC")
	query.Add("offset", strconv.Itoa(page*pageSize))

	var where []string = []string{}

	if len(idsToOmit) > 0 {
		where = append(where, "Properties holds not \"enemy\" and IntID not in ("+strings.Join(idsToOmit, ",")+")")
	}

	if searchQuery != "" {
		where = append(where, "(lower(Units._pageName) like \""+searchQuery+"%\" or lower(WikiName) like \""+searchQuery+"%\")")
	}

	query.Add("where", strings.Join(where, " and "))

	resp, e := http.Get("https://feheroes.fandom.com/api.php?" + query.Encode())

	if e != nil {
		fmt.Println("error with query")
		fmt.Println(query)
		var empty []int = []int{}

		return empty
	}

	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	var unmarshaled structs.SearchUnitsWikiResponse = structs.SearchUnitsWikiResponse{}
	json.Unmarshal(data, &unmarshaled)

	searchResponse := make([]int, len(unmarshaled.CargoQuery))

	for i, entry := range unmarshaled.CargoQuery {
		integerId, _ := strconv.Atoi(entry.Title.IntID)
		searchResponse[i] = integerId
	}

	return searchResponse
}
