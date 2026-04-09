// When round hasnt started it will display the users in a list, with the top user being the host, the word host is displayed next to the host. In this menu the host also has acces to the start round button.
// When the round starts start a local timer for each user it will display: "Hanman Game" as a header. Under it there will be a hidden word with "_" replacing each letter. Under the word there will be an image that swiches with each word (the man getting hanged), with the number of remaining guesses displayed under it. On the left of that image is a list of letters or words that the user has already guessed. Under that there will be an input field, submit button and give up button for the user to guess a letter or a word. When the user guesses the word, runs out of guesses or gives up, the user is redirected to the results page of that round. The round ends when all the users have either finished, lost or given up or when the host presses the end button from the results menu. When the round ends it will redirect all users in the round to the results page of that round.
// On the left there will be a list of users displaying their username and the number of guesses. The board will update every 10 seconds. Where the user hasnt guessed the letter put a white circle with a black border. Where the user guessed the letter put a green circle with a white border. Example of how it should look ( O - white circle, Q - green circle ): User_Example: O O Q O Q. These circles the same size as text.
// When a user joins the round while it has already started or when the round is finished, they will get redirected to the results page of that round as spectators.
// An admin has the same privlages as an host but also has an option to fill the round with bots with a input field and a submit button. When the host starts a new round with bots, fill the round with bots up to 10 total bots. The rest are transfered to be spectators Bots have a random word and a random time between 10 and 60 seconds. When the bot finishes it will display the time it took for the bot to finish and the word it guessed. The bot has a 50% chance to guess the word right. If the bot guesses wrong it will display "DNF" as the time and the word it guessed. When the host starts a new round with bots, all users are redirected to the new round, and all spectators are transfered to the results of the new round as spectators. Bots are not real players, they get generated from a json file named spiffing_bots.json and do not affect the database in any way
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface Player {
    userid: number;
    username: string;
    lives: number;
    guesses: string[];
    time: number;
    finished: boolean;
    foundword: boolean;
}

type BotPlayer = Player & {
    nextGuessAt: number;
    startedAt: number;
};

interface Round {
    id: number;
    host: number;
    word: string;
    wordsize: number;
    active: boolean;
    started: boolean;
    finished: boolean;
    host_username: string;
}

function Round() {
    const { id } = useParams<{ id: string }>();
    const roundId = parseInt(id!);
    const [user, setUser] = useState<{ userId: number; admin: boolean } | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [round, setRound] = useState<Round | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [serverPlayers, setServerPlayers] = useState<Player[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [guess, setGuess] = useState('');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [botCount, setBotCount] = useState(0);
    const [botPlayers, setBotPlayers] = useState<BotPlayer[]>([]);
    const [roundError, setRoundError] = useState('');
    const navigate = useNavigate();
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const scheduleNextGuess = () => Date.now() + getRandomInt(5000, 15000);
    const areAllPlayersFinished = (allPlayers: Player[]) => allPlayers.length > 0 && allPlayers.every((p) => p.finished);
    const getWrongGuesses = (player: Player) => {
        if (!round) return [];
        const word = round.word.toLowerCase();
        return player.guesses.filter((guess) => {
            if (guess.length === 1) {
                return !word.includes(guess);
            }
            return guess !== word;
        });
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetch('http://localhost:3000/user/validateToken', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.valid) {
                setUser({ userId: data.userId, admin: data.admin });
                setCurrentUserId(data.userId);
                loadRound(data.userId);
            } else {
                localStorage.removeItem('token');
                navigate('/login');
            }
        });
    }, []);

    useEffect(() => {
        const storedBots = JSON.parse(localStorage.getItem(`bots_${roundId}`) || '[]');
        if (Array.isArray(storedBots) && storedBots.length > 0) {
            setBotPlayers(storedBots.map((bot: any) => ({
                ...bot,
                nextGuessAt: bot.nextGuessAt || scheduleNextGuess(),
                startedAt: bot.startedAt || Date.now(),
                time: bot.time || 0
            })));
        }
    }, [roundId]);

    const handleLeaveLobby = async () => {
    if (!round || !user) return;

    try {
        // if host leaves before start -> cancel round
        if (user.userId === round.host && !round.started) {
            await fetch('http://localhost:3000/round/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                },
                body: JSON.stringify({ roundId })
            });
        }

        navigate('/');
    } catch (error) {
        console.error('Error leaving lobby:', error);
    }
    };

    const loadRound = async (tokenUserId?: number) => {
        try {
            const effectiveUserId = tokenUserId ?? currentUserId ?? user?.userId;
            const [roundRes, playersRes] = await Promise.all([
                fetch(`http://localhost:3000/round/${roundId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    }
                }),
                fetch(`http://localhost:3000/round/${roundId}/players`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    }
                })
            ]);

            if (roundRes.ok && playersRes.ok) {
                const roundData = await roundRes.json();
                const playersData = await playersRes.json();

                if (!roundData.active) {
                    roundData.started = true;
                    roundData.finished = true;
                }
                

                setRound(roundData);
                setServerPlayers(playersData);
                const mergedPlayers = mergePlayers(playersData);
                setPlayers(mergedPlayers);

                const userPlayer = mergedPlayers.find((p: Player) => p.userid === effectiveUserId);
                if (userPlayer) {
                    setCurrentPlayer(userPlayer);
                }

                //const isSpectator = !userPlayer && roundData.started;
                //const allFinished = areAllPlayersFinished(mergedPlayers);
                if (!roundData.active) {
                    navigate(`/results/${roundId}`);
                    return;
                }

                if (roundData.started) {
                    setStartTime(Date.now());
                    const interval = setInterval(() => {
                        loadPlayers(effectiveUserId);
                    }, 10000);
                    return () => clearInterval(interval);
                }
            }
        } catch (error) {
            console.error('Error loading round:', error);
        }
    };

    const loadPlayers = async (tokenUserId?: number) => {
        try {
            const effectiveUserId = tokenUserId ?? currentUserId ?? user?.userId;
            const [roundRes, playersRes] = await Promise.all([
                fetch(`http://localhost:3000/round/${roundId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    }
                }),
                fetch(`http://localhost:3000/round/${roundId}/players`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    }
                })
            ]);

            if (roundRes.ok && playersRes.ok) {
                const roundData = await roundRes.json();
                const playersData = await playersRes.json();

                if (!roundData.active) {
                    roundData.started = true;
                    roundData.finished = true;
                }
                if (!roundData.active && effectiveUserId !== roundData.host) {
                    alert('Host left the game. Returning to lobby.');
                    navigate('/');
                    return;
                }

                setRound(roundData);
                setServerPlayers(playersData);
                const mergedPlayers = mergePlayers(playersData);
                setPlayers(mergedPlayers);

                const userPlayer = mergedPlayers.find((p: Player) => p.userid === effectiveUserId);
                if (userPlayer) {
                    setCurrentPlayer(userPlayer);
                }

                const isSpectator = !userPlayer && roundData.started;
                const allFinished = areAllPlayersFinished(mergedPlayers);
                if (roundData.finished || isSpectator || allFinished) {
                    navigate(`/results/${roundId}`);
                }
            }
        } catch (error) {
            console.error('Error loading players:', error);
        }
    };

    const mergePlayers = (serverPlayers: Player[]) => {
        const serverIds = new Set(serverPlayers.map((p) => p.userid));
        const extraBots = botPlayers.filter((bot) => !serverIds.has(bot.userid));
        const allPlayers = [...serverPlayers, ...extraBots];
        return allPlayers.slice(0, 10);
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const handleAddBots = async () => {
        if (!user || !round || !user.admin || user.userId !== round.host) return;
        setRoundError('');

        const availableSlots = Math.max(0, 10 - players.length);
        if (botCount <= 0 || availableSlots === 0) {
            setRoundError('Enter a valid number of bots and make sure there is room.');
            return;
        }

        try {
            const res = await fetch('/spiffing_bots.json');
            if (!res.ok) {
                throw new Error('Unable to load bot names');
            }
            const allBotNames: string[] = await res.json();
            const existingNames = new Set([
                ...players.map((p) => p.username),
                ...botPlayers.map((bot) => bot.username)
            ]);
            let availableNames = allBotNames.filter((name) => !existingNames.has(name));
            const addCount = Math.min(botCount, availableSlots);

            if (availableNames.length === 0) {
                setRoundError('No bot names available to add.');
                return;
            }

            for (let i = 0; i < addCount && availableNames.length > 0; i += 1) {
                await sleep(1000);
                const index = Date.now() % availableNames.length;
                const name = availableNames[index];
                availableNames = availableNames.filter((botName) => botName !== name);

                const newBot: BotPlayer = {
                    userid: -(Date.now() + i + Math.floor(Math.random() * 1000)),
                    username: name,
                    lives: 10,
                    guesses: [],
                    time: 0,
                    finished: false,
                    foundword: false,
                    startedAt: Date.now(),
                    nextGuessAt: scheduleNextGuess()
                };

                setBotPlayers((prev) => [...prev, newBot]);
                setPlayers((prev) => [...prev, newBot]);
                setBotCount((prev) => Math.max(prev - 1, 0));

                const existingBots = JSON.parse(localStorage.getItem(`bots_${roundId}`) || '[]');
                localStorage.setItem(`bots_${roundId}`, JSON.stringify([...existingBots, newBot]));
            }
        } catch (error) {
            console.error('Error adding bots:', error);
            setRoundError('Unable to add bots at this time.');
        }
    };

    const handleStartRound = async () => {
        if (!user || !round) return;

        try {
            const playersToReset = serverPlayers.filter((player) => player.userid > 0 && player.guesses && player.guesses.length > 0);
            await Promise.all(playersToReset.map((player) =>
                fetch(`http://localhost:3000/user/resetguesses/${player.userid}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    }
                })
            ));

            await fetch('http://localhost:3000/round/changestarted', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                },
                body: JSON.stringify({ roundId })
            });

            setStartTime(Date.now());
            loadRound();
        } catch (error) {
            console.error('Error starting round:', error);
        }
    };

    useEffect(() => {
        if (!round?.started || botPlayers.length === 0) return;

        const interval = setInterval(() => {
            setBotPlayers((bots) => {
                return bots.map((bot) => {
                    const elapsed = Math.floor((Date.now() - bot.startedAt) / 1000);
                    if (bot.finished) {
                        if (bot.foundword && bot.time === 0) {
                            return { ...bot, time: elapsed };
                        }
                        return bot;
                    }

                    if (Date.now() < bot.nextGuessAt) {
                        return { ...bot, time: elapsed };
                    }

                    const unusedLetters = alphabet.filter((letter) => !bot.guesses.includes(letter));
                    if (unusedLetters.length === 0) {
                        return { ...bot, time: elapsed, nextGuessAt: scheduleNextGuess() };
                    }

                    const guess = unusedLetters[Math.floor(Math.random() * unusedLetters.length)];
                    const updatedGuesses = [...bot.guesses, guess];
                    const word = round.word.toLowerCase();
                    const correct = word.includes(guess);
                    const lives = correct ? bot.lives : Math.max(bot.lives - 1, 0);
                    const foundword = word.split('').every((letter) => updatedGuesses.includes(letter));
                    const finished = foundword || lives === 0;
                    const time = finished ? (foundword ? elapsed : -1) : elapsed;

                    return {
                        ...bot,
                        guesses: updatedGuesses,
                        lives,
                        foundword,
                        finished,
                        time,
                        nextGuessAt: finished ? bot.nextGuessAt : scheduleNextGuess()
                    };
                });
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [round?.started, botPlayers.length]);

    useEffect(() => {
        if (!round?.started || round.finished || botPlayers.length === 0) return;
        if (botPlayers.every((bot) => bot.lives === 0)) {
            const finishRound = async () => {
                try {
                    await fetch('http://localhost:3000/round/changefinished', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')!}`
                        },
                        body: JSON.stringify({ roundId })
                    });
                    await fetch('http://localhost:3000/round/changeactive', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')!}`
                        },
                        body: JSON.stringify({ roundId })
                    });
                    setRound((prev) => prev ? { ...prev, finished: true, active: false, started: true } : prev);
                } catch (error) {
                    console.error('Error finishing round after bots lost lives:', error);
                } finally {
                    navigate(`/results/${roundId}`);
                }
            };
            finishRound();
        }
    }, [botPlayers, round, round?.started, round?.finished, roundId, navigate]);

    useEffect(() => {
        setPlayers(mergePlayers(serverPlayers));
    }, [serverPlayers, botPlayers]);

    useEffect(() => {
        localStorage.setItem(`bots_${roundId}`, JSON.stringify(botPlayers));
    }, [botPlayers, roundId]);

    const handleGuess = async () => {
        if (!currentPlayer || !round || !guess.trim()) return;

        const guessValue = guess.toLowerCase().trim();
        setGuess('');

        try {
            // Add guess to player's guesses
            const word = round.word.toLowerCase();
            const isFullWordGuess = guessValue.length > 1;
            const alreadyGuessed = currentPlayer.guesses.includes(guessValue);
            const updatedGuesses = alreadyGuessed ? currentPlayer.guesses : [...currentPlayer.guesses, guessValue];
            const guessCorrect = isFullWordGuess ? guessValue === word : word.includes(guessValue);
            const livesAfterGuess = guessCorrect ? currentPlayer.lives : Math.max(currentPlayer.lives - 1, 0);
            const wordGuessed = isFullWordGuess ? guessCorrect : word.split('').every((letter) => updatedGuesses.includes(letter));

            if (!isFullWordGuess || !alreadyGuessed) {
                await fetch(`http://localhost:3000/user/addguess/${currentPlayer.userid}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    },
                    body: JSON.stringify({ guess: guessValue })
                });
            }

            if (!guessCorrect) {
                await fetch(`http://localhost:3000/user/removelive/${currentPlayer.userid}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    }
                });
            }

            if (wordGuessed) {
                await fetch(`http://localhost:3000/user/setfoundword/${currentPlayer.userid}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    },
                    body: JSON.stringify({ foundword: true })
                });
            }

            if (wordGuessed || livesAfterGuess === 0) {
                const endTime = Date.now();
                const timeTaken = startTime ? Math.floor((endTime - startTime) / 1000) : 0;

                await fetch(`http://localhost:3000/user/settime/${currentPlayer.userid}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    },
                    body: JSON.stringify({ time: timeTaken })
                });

                await fetch(`http://localhost:3000/user/setfinished/${currentPlayer.userid}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')!}`
                    }
                });
            }

            await loadPlayers();
        } catch (error) {
            console.error('Error making guess:', error);
        }
    };

    const handleGiveUp = async () => {
        if (!currentPlayer) return;

        try {
            await fetch(`http://localhost:3000/user/setfinished/${currentPlayer.userid}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                }
            });

            await loadPlayers();
        } catch (error) {
            console.error('Error giving up:', error);
        }
    };

    const renderWord = () => {
        if (!round || !currentPlayer) return '';
        const word = round.word.toLowerCase();
        return word.split('').map((letter) => (
            currentPlayer.guesses.includes(letter) ? letter : '_'
        )).join(' ');
    };

    const renderPlayerProgress = (player: Player) => {
        if (!round) return null;
        const word = round.word.toLowerCase();
        const allLettersGuessed = word.split('').every((letter) => player.guesses.includes(letter));
        return word.split('').map((letter, i) => {
            const guessed = player.foundword || allLettersGuessed || player.guesses.includes(letter);
            return (
                <span
                    key={i}
                    style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '1.5px solid black',
                        backgroundColor: guessed ? 'green' : 'white',
                        margin: '1px',
                        textAlign: 'center',
                        lineHeight: '14px',
                        fontSize: '10px',
                        color: guessed ? 'white' : 'black'
                    }}
                />
            );
        });
    };

    if (!user || !round) return <div>Loading...</div>;

    if (!round.started) {
        // Pre-game lobby
        return (
            <div>
                <h1>Round {roundId}</h1>
                <h2>Host: {round.host_username}</h2>
                <h3>Players:</h3>
                <ul>
                    {players.map(player => (
                        <li key={player.userid}>
                            {player.username}{player.userid === round.host ? <b> H</b> : ''}
                        </li>
                    ))}
                </ul>
                {user.userId === round.host && (
                    <div>
                        {user.admin && (
                            <div style={{ marginBottom: '10px' }}>
                                <input
                                    type="number"
                                    placeholder="Number of bots"
                                    value={botCount}
                                    onChange={(e) => setBotCount(parseInt(e.target.value) || 0)}
                                    min="0"
                                    max="10"
                                    style={{ width: '120px', marginRight: '10px' }}
                                />
                                {!round.started && (
                                    <button onClick={handleLeaveLobby}>Leave Lobby</button>
                                )}
                                <button onClick={handleAddBots}>Add Bots</button>
                                {botPlayers.length > 0 && (
                                    <p style={{ marginTop: '10px' }}>{botPlayers.length} bot(s) added to this round.</p>
                                )}
                            </div>
                        )}
                        {roundError && <p style={{ color: 'red' }}>{roundError}</p>}
                        <button onClick={handleStartRound}>Start Round</button>
                    </div>
                )}
            </div>
        );
    }

    // Game in progress
    return (
        <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
                <h1>Hangman Game</h1>
                <div style={{ fontSize: '24px', margin: '20px 0' }}>
                    {renderWord()}
                </div>
                <div style={{ margin: '20px 0', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '200px', height: '200px', border: '2px solid black', marginBottom: '10px' }}>
                            Hangman Image ({currentPlayer ? 10 - currentPlayer.lives : 0} wrong guesses)
                        </div>
                        <div style={{ fontSize: '14px', color: '#333' }}>
                            Wrong guesses: {currentPlayer ? getWrongGuesses(currentPlayer).join(', ') || 'None' : 'None'}
                        </div>
                    </div>
                </div>
                {currentPlayer?.finished ? (
                    <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f4f4f4', borderRadius: '8px' }}>
                        Waiting for other players to finish the round...
                    </div>
                ) : (
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            placeholder="Guess a letter or word"
                            maxLength={round.wordsize}
                        />
                        <button onClick={handleGuess}>Submit</button>
                        <button onClick={handleGiveUp} style={{ marginLeft: '10px', backgroundColor: '#ff6b6b' }}>Give Up</button>
                    </div>
                )}
            </div>
            <div style={{ width: '300px' }}>
                <h3>Players:</h3>
                <ul>
                    {players.map(player => (
                        <li key={player.userid} style={{ marginBottom: '12px' }}>
                            <strong>{player.username}{player.userid === round.host ? <b> H</b> : ''}</strong>
                            <div>Lives: {player.lives}</div>
                            <div style={{ fontSize: '12px', color: '#444' }}>
                                Progress: <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '2px', verticalAlign: 'middle' }}>{renderPlayerProgress(player)}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default Round;