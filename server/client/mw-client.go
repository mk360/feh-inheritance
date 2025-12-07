package client

import (
	"encoding/json"
	"fmt"
	"os"

	mwclient "cgt.name/pkg/go-mwclient"
	"github.com/antonholmquist/jason"
)

type BotCredentialPair struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

var BotClients []*mwclient.Client

func SetupBots() {
	var botCredentials = []BotCredentialPair{}
	var f, _ = os.Open("bots.json")
	var credentialsDecoder = json.NewDecoder(f)
	credentialsDecoder.Decode(&botCredentials)
	for _, pair := range botCredentials {
		var client, _ = mwclient.New("https://feheroes.fandom.com/api.php", "feh-inheritance.tonion-the-onion.com (Discord: N_tonio36)")
		client.Login(pair.Username, pair.Password)
		BotClients = append(BotClients, client)
	}
	fmt.Println("logins initiated")
}

func RunBotRequest(query map[string]string) (*jason.Object, error) {
	for i, bot := range BotClients {
		resp, e := bot.Get(query)
		if e == nil {
			return resp, e
		}
		fmt.Printf("unable to make a request with bot #%d:\n", i+1)
		fmt.Println(e)
	}
	fmt.Println("both bots failed to process the request, trying again")
	return RunBotRequest(query)
}
