package client

import (
	"fmt"
	"os"

	mwclient "cgt.name/pkg/go-mwclient"
	cron "github.com/robfig/cron/v3"
)

var BotClient *mwclient.Client

func Login() {
	BotClient, _ = mwclient.New("https://feheroes.fandom.com/api.php", "feh-inheritance.tonion-the-onion.com (Discord: N_tonio36)")
	BotClient.Login(os.Getenv("FEH_USERNAME"), os.Getenv("FEH_PASSWORD"))
	loginCron := cron.New()
	loginCron.AddFunc("@every 20m", func() {
		BotClient.Login(os.Getenv("FEH_USERNAME"), os.Getenv("FEH_PASSWORD"))
		fmt.Println("login initiated")
	})
	loginCron.Start()
}
