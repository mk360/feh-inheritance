package structs

type SearchSkillsWikiResponse struct {
	CargoQuery []struct {
		Title struct {
			Name     string `json:"Name"`
			Unit     string `json:"Unit"`
			IntID    string `json:"IntID"`
			Required string `json:"Required"`
		} `json:"title"`
	} `json:"cargoquery"`
}

type SearchSkillsResponse struct {
	Skills map[string][]int `json:"skills"`
	Units  map[int]string
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
