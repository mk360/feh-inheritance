package utils

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
)

func GetCharacterAssetPath(filename string) string {
	hash := md5.Sum([]byte(filename))
	stringHash := hex.EncodeToString(hash[:])
	firstFolder := stringHash[0]
	secondFolder := stringHash[0:2]
	fullURL := fmt.Sprintf("https://static.wikia.nocookie.net/feheroes_gamepedia_en/images/%c/%s/%s", firstFolder, secondFolder, filename)

	return fullURL
}
