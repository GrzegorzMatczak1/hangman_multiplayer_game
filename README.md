# hangman_multiplayer_game
When the round start the word is generated automatically. Each player on them own guesses the generated word. The player who guessed in the shortest amount of guesses wins.

Run project:
terminal 1:
```
npm run dev
```

```
node server.js
```

Technologies: 
```
- React(Typescript)
- PostgreSQL
- Bootstrap
- react-router-dom
```


Tables in db:
```
- Words (id, word, size)
- User (id, username, password{hashed}, lifes, guesses{string list}, timeteaken{seconds}, finished{bool}, foundword{bool})
- Round (id, host {int / foreign key user}, users {int list / max 10 / foreign key user}, chosenword {int foreign key words}, wordsize, active {bool}, started{bool}, finished{bool})
- Results (id, roundid {foreign key round}, users {int list / max 10 / foreign key user / guessing for finished == false / sort by lifes, timeteaken})
```


Endpoints for API:
```
- /lobby
- /round/:id
- /round/:id/results
- /login
- /register
```
