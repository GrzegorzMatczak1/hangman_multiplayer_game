import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import stage0 from './assets/stage0.png';
import stage1 from './assets/stage1.png';
import stage2 from './assets/stage2.png';
import stage3 from './assets/stage3.png';
import stage4 from './assets/stage4.png';
import stage5 from './assets/stage5.png';
import stage6 from './assets/stage6.png';
import stage7 from './assets/stage7.png';
import stage8 from './assets/stage8.png';
import stage9 from './assets/stage9.png';
import stage10 from './assets/stage10.png';

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
    const image_sources = [stage10, stage9, stage8, stage7, stage6, stage5, stage4, stage3, stage2, stage1, stage0]
    const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const scheduleNextGuess = () => Date.now() + getRandomInt(5000, 15000);
    const areAllPlayersFinished = (allPlayers: Player[]) => allPlayers.length > 0 && allPlayers.every((p) => p.finished);
    const [imageSource, SetImageSource] = useState("");
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
                <span key={i} className={`dot ${guessed ? 'filled' : ''}`} />
            );
        });
    };

    if (!user || !round) {
        return (
            <div className="screen-center">
                <div className="glass p-4 text-center">
                    <div className="spinner-border text-secondary mb-3" role="status" />
                    <p className="mb-0 brand-muted">Loading round...</p>
                </div>
            </div>
        );
    }

    if (!round.started) {
        // Pre-game lobby
        return (
            <main className="app-shell page-enter">
                <section className="glass p-4">
                    <h1 className="brand-title mb-1">Round #{roundId}</h1>
                    <p className="brand-muted mb-3">Host: {round.host_username}</p>
                    <h3 className="h5 brand-title">Players</h3>
                    <ul className="players-list mb-3">
                    {players.map(player => (
                        <li key={player.userid} className="player-card">
                            <span className="fw-semibold">{player.username}{player.userid === round.host ? <b> H</b> : ''}</span>
                        </li>
                    ))}
                </ul>
                {user.userId === round.host && (
                    <div className="d-grid gap-2" style={{ maxWidth: '500px' }}>
                        {user.admin && (
                            <div className="d-flex flex-wrap gap-2 align-items-center">
                                <input
                                    className="form-control"
                                    type="number"
                                    placeholder="Number of bots"
                                    value={botCount}
                                    onChange={(e) => setBotCount(parseInt(e.target.value) || 0)}
                                    min="0"
                                    max="10"
                                    style={{ maxWidth: '150px' }}
                                />
                                {!round.started && (
                                    <button className="btn btn-outline-light" onClick={handleLeaveLobby}>Leave Lobby</button>
                                )}
                                <button className="btn btn-secondary" onClick={handleAddBots}>Add Bots</button>
                                {botPlayers.length > 0 && (
                                    <small className="brand-muted">{botPlayers.length} bot(s) added to this round.</small>
                                )}
                            </div>
                        )}
                        {roundError && <div className="alert alert-danger mb-0 py-2">{roundError}</div>}
                        <button className="btn btn-primary" onClick={handleStartRound}>Start Round</button>
                    </div>
                )}
                </section>
            </main>
        );
    }

    // Game in progress
    return (
        <main className="app-shell page-enter">
            <div className="main-grid">
                <section className="glass p-4">
                <h1 className="brand-title mb-2">Hangman Game</h1>
                <div className="mono-word fs-3 mb-3">
                    {renderWord()}
                </div>

                <div className="mb-3">
                    <div className="glass p-3 text-center">
                        <div className="brand-muted mb-2">Hangman board</div>
                        <div className="border border-secondary rounded p-3 bg-dark-subtle text-dark-emphasis">
                            {
                                <img src={image_sources[currentPlayer ? currentPlayer?.lives : 0]} alt={"Player has: " + currentPlayer?.lives + " lives left"}></img>
                            }
                        </div>
                        <div className="small brand-muted mt-2">
                            Wrong guesses: {currentPlayer ? getWrongGuesses(currentPlayer).join(', ') || 'None' : 'None'}
                        </div>
                    </div>
                </div>

                {currentPlayer?.finished ? (
                    <div className="alert alert-info mb-0">
                        Waiting for other players to finish the round...
                    </div>
                ) : (
                    <div className="d-flex flex-wrap gap-2">
                        <input
                            className="form-control"
                            type="text"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            placeholder="Guess a letter or word"
                            maxLength={round.wordsize}
                            style={{ maxWidth: '280px' }}
                        />
                        <button className="btn btn-primary" onClick={handleGuess}>Submit</button>
                        <button className="btn btn-danger" onClick={handleGiveUp}>Give Up</button>
                    </div>
                )}

                </section>

                <aside className="glass p-3">
                <h3 className="h5 brand-title mb-3">Players</h3>
                <ul className="players-list">
                    {players.map(player => (
                        <li key={player.userid} className="player-card">
                            <div className="fw-semibold">{player.username}{player.userid === round.host ? <b> H</b> : ''}</div>
                            <div className="small brand-muted">Lives: {player.lives}</div>
                            <div className="small brand-muted d-flex align-items-center gap-2">
                                Progress:
                                <span className="d-inline-flex flex-wrap gap-1">{renderPlayerProgress(player)}</span>
                            </div>
                        </li>
                    ))}
                </ul>
                </aside>
            </div>
        </main>
    );
}

export default Round;