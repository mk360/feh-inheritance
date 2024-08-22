package structs

type SearchSkillsWikiResponse struct {
	CargoQuery []struct {
		Title struct {
			Name     string `json:"Name"`
			Unit     string `json:"Unit"`
			IntID    string `json:"IntID"`
			Required string `json:"Required"`
			Icon     string `json:"icon"`
		} `json:"title"`
	} `json:"cargoquery"`
}

type SkillInfos struct {
	Ids  []int  `json:"ids"`
	Icon string `json:"icon"`
}

type SearchSkillsResponse struct {
	Skills map[string]SkillInfos
	Units  map[int]string `json:"units"`
}

type SingleUnitWikiResponse struct {
	CargoQuery []struct {
		Title struct {
			MoveType   string `json:"MoveType"`
			WeaponType string `json:"WeaponType"`
		} `json:"title"`
	} `json:"cargoquery"`
}

type SearchUnitsWikiResponse struct {
	CargoQuery []struct {
		Title struct {
			IntID string `json:"IntID"`
			Page  string `json:"Page"`
		} `json:"title"`
	} `json:"cargoquery"`
}

type SearchUnitsResponse struct {
	MovementType int    `json:"mvt"`
	WeaponType   int    `json:"wpn"`
	ID           int    `json:"id"`
	Name         string `json:"name"`
}
