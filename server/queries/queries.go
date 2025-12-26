package queries

import (
	"encoding/json"
	"fmt"
	"inheritance/array"
	"inheritance/client"
	"inheritance/common"
	"inheritance/structs"
	"inheritance/utils"
	"log"
	"regexp"
	"slices"
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
	case "X":
		return "passivex"
	default:
		return slot
	}
}

func convertToDecimal(hexArray []string) []string {
	var arr = make([]string, len(hexArray))
	for i, el := range hexArray {
		dec, _ := strconv.ParseInt(el, 16, 64)
		stringDecimal := strconv.Itoa(int(dec))
		arr[i] = stringDecimal
	}

	return arr
}

func GetInheritableSkills(intIDs []string, searchedIntID string, slot string) structs.SearchSkillsResponse {
	var query = map[string]string{
		"action":   "cargoquery",
		"format":   "json",
		"tables":   "Units",
		"where":    "Properties holds not \"enemy\" and IntID = " + searchedIntID,
		"fields":   "MoveType, WeaponType, Units._pageName=Unit",
		"group_by": "Unit",
	}

	resp, e := client.RunBotRequest(query)

	if e != nil {
		log.Fatalln(e)
	}

	var singleUnitData = structs.SingleUnitWikiResponse{}
	var marshaled, _ = resp.Value.Marshal()
	json.Unmarshal(marshaled, &singleUnitData)

	var arrayIntIds = convertToDecimal(strings.Split(intIDs[0], ","))

	var moveType = singleUnitData.CargoQuery[0].Title.MoveType
	var weaponType = singleUnitData.CargoQuery[0].Title.WeaponType
	var withoutSelf = array.FilterOut(arrayIntIds, searchedIntID)

	var conditions = []string{"Next is null", "Units.Properties holds not \"story\"", "CanUseMove holds \"" + moveType + "\"", "CanUseWeapon holds \"" + weaponType + "\"", "Exclusive = false", "Units.Properties holds not \"enemy\"", "Scategory = \"" + convertSlotName(slot) + "\"", "IntID in (" + strings.Join(withoutSelf, ",") + ")"}

	var skillMap = map[string]structs.SkillInfos{}

	var parsedResponse = structs.SearchSkillsResponse{
		Skills:   "",
		Units:    map[int]string{},
		Searched: singleUnitData.CargoQuery[0].Title.Unit,
	}

	if len(singleUnitData.CargoQuery) > 0 {
		query["tables"] = "Units, UnitSkills, Skills"
		query["fields"] = "Skills.Name, Skills.Icon, Units._pageName=Unit, IntID, Required, SP"
		query["join_on"] = "UnitSkills._pageName = Units._pageName, UnitSkills.skill = Skills.WikiName"
		query["order_by"] = "Skills.Name ASC, Unit ASC"
		query["limit"] = "500"
		query["where"] = strings.Join(conditions, " and ")
		fmt.Println(query["where"])
		delete(query, "group_by")

		var offset int = 0
		var requests = 0

		for {
			requests++
			query["offset"] = strconv.Itoa(offset)
			resp, e := client.RunBotRequest(query)

			if e != nil {
				log.Fatalln(e)
			}

			data, _ := resp.Value.Marshal()

			var skillResponse structs.SearchSkillsWikiResponse = structs.SearchSkillsWikiResponse{}
			json.Unmarshal(data, &skillResponse)

			for _, responseTitle := range skillResponse.CargoQuery {
				_, ok := skillMap[responseTitle.Title.Name]
				var intSP, _ = strconv.ParseFloat(responseTitle.Title.SP, 32)
				if !ok {
					skillMap[responseTitle.Title.Name] = structs.SkillInfos{
						Ids:  []int{},
						Icon: strings.Replace(responseTitle.Title.Icon, ".png", "", 1),
						SP:   int(intSP * 1.5),
					}
				}

				conv, _ := strconv.Atoi(responseTitle.Title.IntID)

				skillDictIds := skillMap[responseTitle.Title.Name]
				if !array.Includes(skillDictIds.Ids, conv) {
					skillDictIds.Ids = append(skillDictIds.Ids, conv)
				}

				skillMap[responseTitle.Title.Name] = skillDictIds

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

				currentLearners, requiredSkillExists := skillMap[patchedName]

				if requiredSkillExists && array.Equals(currentLearners.Ids, skillMap[responseTitle.Title.Name].Ids) {
					delete(skillMap, patchedName)
				}

				_, unitOk := parsedResponse.Units[conv]

				if !unitOk {
					parsedResponse.Units[conv] = strings.Replace(responseTitle.Title.Unit, ": ", ":", 1)
				}
			}

			if len(skillResponse.CargoQuery) == 500 {
				offset += 500
				query["offset"] = strconv.Itoa(offset)
			} else {
				break
			}
		}

		fmt.Println("REQUEST:")
		fmt.Println("SELECT " + query["fields"])
		fmt.Println("FROM " + query["tables"])
		fmt.Println("WHERE " + query["where"])
		fmt.Println("JOIN ON " + query["join_on"])
		fmt.Println("ORDER BY " + query["order_by"])
		fmt.Printf("Request count: %d\n", requests)
		parsedResponse.Skills, _ = utils.JsonToToon(skillMap)
		return parsedResponse
	}

	return parsedResponse
}

func GetHeroes(searchQuery string, ids []string, page int, pageSize int) []string {
	var where []string = []string{}

	if len(ids) > 0 {
		var splitIds = strings.Split(ids[0], ",")
		where = append(where, "Properties holds not \"story\" and Properties holds not \"enemy\" and IntID not in ("+strings.Join(convertToDecimal(splitIds), ",")+")")
	}

	if searchQuery != "" {
		where = append(where, "(lower(Units._pageName) like \""+searchQuery+"%\" or lower(WikiName) like \""+searchQuery+"%\")")
	}

	var query = map[string]string{
		"action":   "cargoquery",
		"format":   "json",
		"tables":   "Units",
		"limit":    "500",
		"offset":   strconv.Itoa(page * pageSize),
		"where":    strings.Join(where, " and "),
		"fields":   "IntID, WeaponType, MoveType, _pageName=Page",
		"order_by": "ReleaseDate DESC",
	}

	var r, _ = client.RunBotRequest(query)

	var marshaled, _ = r.Value.Marshal()
	var unmarshaled = structs.SearchUnitsWikiResponse{}
	json.Unmarshal(marshaled, &unmarshaled)
	var searchResponse = make([]string, len(unmarshaled.CargoQuery))

	for i, entry := range unmarshaled.CargoQuery {
		var movementTypeString = strconv.Itoa(common.MOVEMENT_TYPES[entry.Title.MovementType])
		var weaponTypeString = strconv.Itoa(common.WEAPON_TYPES[entry.Title.WeaponType])
		var returnedString = entry.Title.IntID + "-" + movementTypeString + "-" + weaponTypeString + "-" + entry.Title.Page

		searchResponse[i] = returnedString
	}

	return searchResponse
}

func GetBarracksHeroes(ids []string) []string {
	var dec = convertToDecimal(ids)
	var query = map[string]string{
		"action": "cargoquery",
		"format": "json",
		"tables": "Units",
		"fields": "_pageName=Page, IntID",
		"limit":  "500",
		"where":  "Properties holds not \"story\" and Properties holds not \"enemy\" and IntID in (" + strings.Join(dec, ",") + ")",
	}
	var offset int = 0

	var arr []string = make([]string, len(ids))
	for {
		query["offset"] = strconv.Itoa(offset)
		resp, _ := client.RunBotRequest(query)
		var data, _ = resp.Marshal()
		var unmarshaled structs.SearchUnitsWikiResponse = structs.SearchUnitsWikiResponse{}
		json.Unmarshal(data, &unmarshaled)

		for _, hero := range unmarshaled.CargoQuery {
			var index = slices.Index(dec, hero.Title.IntID)
			arr[index] = hero.Title.Page
		}

		if len(unmarshaled.CargoQuery) == 500 {
			offset += 500
		} else {
			break
		}
	}

	return arr
}
