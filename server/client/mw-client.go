package client

import (
	"fmt"
	"log"
	"os"

	mwclient "cgt.name/pkg/go-mwclient"
)

var BotClient *mwclient.Client

func Login() {
	BotClient, _ = mwclient.New("https://feheroes.fandom.com/api.php", "feh-inheritance.tonion-the-onion.com (Discord: N_tonio36)")
	err := BotClient.Login(os.Getenv("FEH_USERNAME"), os.Getenv("FEH_PASSWORD"))
	if err != nil {
		log.Fatalln(err)
	}
	fmt.Println("login initiated")
}
