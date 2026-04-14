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
- jsonwebtoken
- bcrypt
```


Tables in db:
```
- Words (id, word, size)
- User (id, username, password{hashed}, lives, guesses{string list}, timeteaken{seconds}, finished{bool}, foundword{bool})
- Round (id, host {int / foreign key user}, chosenword {int foreign key words}, wordsize, active {bool}, started{bool}, finished{bool})
- Roundinfo (id, roundid {foreign key round}, userid{foreign key user}, livesleft, timeteaken)
```


Endpoints for API:
```
- /lobby
- /round/:id
- /round/:id/results
- /login
- /register
- /wordconfig
```
