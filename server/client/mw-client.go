package client

import (
	"fmt"
	"log"
	"os"

	mwclient "cgt.name/pkg/go-mwclient"
	cron "github.com/robfig/cron/v3"
)

var BotClient *mwclient.Client

func Login() {
	BotClient, _ = mwclient.New("https://feheroes.fandom.com/api.php", "feh-inheritance.tonion-the-onion.com (Discord: N_tonio36)")
	err := BotClient.Login(os.Getenv("FEH_USERNAME"), os.Getenv("FEH_PASSWORD"))
	if err != nil {
		log.Fatalln(err)
	}
	loginCron := cron.New()
	loginCron.AddFunc("@every 4h", func() {
		err := BotClient.Login(os.Getenv("FEH_USERNAME"), os.Getenv("FEH_PASSWORD"))
		if err != nil {
			log.Fatalln(err)
		}
		fmt.Println("login initiated")
	})
	loginCron.Start()
}
