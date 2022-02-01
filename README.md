# Botxus - Discord Amazon Auto-buy

This application scans alerts from a specified discord alert channel and would use that to try and auto buy. On load of the application it would login to the specified amazon's given such as amazon.co.uk, amazon.fr and etc.

I would like to make it clear that this is project is overall not good in terms of structure and practices being used. It was one of the early projects I worked on and had little to no skill as a developer. This worked on my machine for my use, so cannot guarantee it will do the same for you. You would have to adjust this so it work for your use case, so it likely wont work out of the box but at least it might help someone.

There are part of this code taken from other projects, but as I did this ages ago, I do not remember from where and/or who. If you see any of your work here, please contact me and I am more than willing to cooperate on a solution.



## Instructions

1. Rename `.env.example` → `.env`

2. Open .env & change the DISCORD_TOKEN value to your own discord token

3. Open config.json & add your keywords & negative keywords

4. Run `npm install`

5. Run `npm start`

*You might need to install some additional libraries

## LICENSE

[MIT](LICENSE)
