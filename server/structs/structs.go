package structs

type SkillResponseTitle struct {
	Name     string `json:"Name"`
	Unit     string `json:"Unit"`
	IntID    string `json:"IntID"`
	Required string `json:"Required"`
	Icon     string `json:"icon"`
}

type SearchSkillsWikiResponse struct {
	CargoQuery []struct {
		Title SkillResponseTitle `json:"title"`
	} `json:"cargoquery"`
}

type SkillInfos struct {
	Ids  []int  `json:"ids"`
	Icon string `json:"icon,omitempty"`
}

type SearchSkillsResponse struct {
	Skills   map[string]SkillInfos
	Units    map[int]string `json:"units"`
	Searched string         `json:"searched"`
}

type SingleUnitWikiResponse struct {
	CargoQuery []struct {
		Title struct {
			MoveType   string `json:"MoveType"`
			WeaponType string `json:"WeaponType"`
			Unit       string `json:"Unit"`
		} `json:"title"`
	} `json:"cargoquery"`
}

type SearchUnitsWikiResponse struct {
	CargoQuery []struct {
		Title struct {
			IntID        string `json:"IntID"`
			Page         string `json:"Page"`
			WeaponType   string `json:"WeaponType"`
			MovementType string `json:"MoveType"`
		} `json:"title"`
	} `json:"cargoquery"`
}

type SearchUnitsResponse struct {
	MovementType int    `json:"mvt"`
	WeaponType   int    `json:"wpn"`
	ID           int    `json:"id"`
	Name         string `json:"name"`
}
