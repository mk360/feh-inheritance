package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

type passwordStruct struct {
	Batchcomplete string `json:"batchcomplete"`
	Query         struct {
		Tokens struct {
			Logintoken string `json:"logintoken"`
		} `json:"tokens"`
	} `json:"query"`
}

var httpClient = http.Client{}
var CurrentToken = ""

func Login() {
	var body = map[string]string{
		"lgname":     os.Getenv("FEH_USERNAME"),
		"lgpassword": os.Getenv("FEH_PASSWORD"),
	}
	bodyStr := []byte("action=" + body["action"] + "&username=" + body["username"] + "&password=" + body["password"])

	var response, er = httpClient.Post("https://feheroes.fandom.com/api.php?action=query&format=json&meta=tokens&type=login", "application/json", bytes.NewBuffer(bodyStr))
	if er != nil {
		log.Fatalln(er)
	}
	var s, _ = io.ReadAll(response.Body)
	fmt.Println(string(s))
	var password = passwordStruct{}
	json.Unmarshal(s, &password)
	CurrentToken = password.Query.Tokens.Logintoken
}
