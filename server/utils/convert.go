package utils

import (
	"inheritance/structs"
	"strconv"
	"strings"
)

func JsonToToon(skillsMap map[string]structs.SkillInfos) (string, error) {
	var sb strings.Builder
	sb.WriteString("Skills{ids36,icon,SP}:")

	for key, val := range skillsMap {
		sb.WriteString("\n")
		rawIds := val.Ids
		var ids36 []string
		for _, id := range rawIds {
			ids36 = append(ids36, strconv.FormatInt(int64(id), 36))
		}

		sb.WriteString(key)
		sb.WriteString(":")
		sb.WriteString(strings.Join(ids36, "|"))
		sb.WriteString("," + val.Icon)
		sb.WriteString("," + strconv.FormatInt(int64(val.SP), 36))
	}
	return sb.String(), nil
}
