package client

import (
	"os"

	mwclient "cgt.name/pkg/go-mwclient"
)

var BotClient *mwclient.Client

func Login() error {
	BotClient, _ = mwclient.New("https://feheroes.fandom.com/api.php", "feh-inheritance.tonion-the-onion.com (Discord: N_tonio36)")
	err := BotClient.Login(os.Getenv("FEH_USERNAME"), os.Getenv("FEH_PASSWORD"))
	if err != nil {
		return err
	}
	return nil
}
