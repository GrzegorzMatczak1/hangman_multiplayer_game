// On the results page it will display the word, the host and the winner of the round. If the user is the host of the round it will also display a button to start a new round. When new round is started every user (up to 10 individual users) is redirected to a new round
// On the results page it will display the word, on the left will be displayed the same list as with the starting round page (remember to limit the ammount of users to 10), but users will be sorted by ammount of guesses left and by time. display "-- : --" in place of time when user hasnt finished yet, once the user finished the time will be displayed, or it will display "DNF" when the host ended the round. The list will be updated every 10 seconds. If the user is the host of the round it will also display a button to end the round. When the host has ended the round or the round ended by everyone finishing, the host has the option to start a new round or to end the room. When the host starts a new round every user is redirected to a new round, when the host ends the room all users are redirected to the lobby.
// There is an option to specate the round. The spectating user will see the same thing as players who have finished, but they will be marked as spectators and they will be sorted in the bottom of the list with a ligher text color. Each user will also have a button to leave the spectating and go back to the lobby. When the host starts a new round take first all participating players who are still in the results screen, then add spectators up to 10 total players. The rest of the spectators are transfered to the results of the new round as spectators.
// An admin has the same privlages as an host but also has an option to fill the results with bots with a input field and a submit button. Every bot from this menu will be added as a spectator. If they get teaken the next round behave as a bot, the rest of bots are transfered to the results of the new round as spectators. If all real players leave then all the bots leave the room. Bots are not real players, they get generated from a json file named spiffing_bots.json and do not affect the database in any way
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

function Results() {
    const { id } = useParams<{ id: string }>();
    const roundId = parseInt(id!);
    const [user, setUser] = useState<{ userId: number; admin: boolean } | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [round, setRound] = useState<Round | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [spectators, setSpectators] = useState<Player[]>([]);
    const [storedBots, setStoredBots] = useState<Player[]>([]);
    const [botCount, setBotCount] = useState(0);
    const [hostLeftNotified, setHostLeftNotified] = useState(false);
    const navigate = useNavigate();
    const shuffle = <T,>(array: T[]) => [...array].sort(() => Math.random() - 0.5);
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const getRandomId = () => -(Date.now() + Math.floor(Math.random() * 1000000));

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        let interval: number | undefined;

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
                loadResults(data.userId);
                interval = window.setInterval(() => loadResults(data.userId), 10000); // Update every 10 seconds
            } else {
                localStorage.removeItem('token');
                navigate('/login');
            }
        });

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, []);

    const loadResults = async (tokenUserId?: number) => {
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

                const wasInactive = !roundData.active;
                if (wasInactive) {
                    roundData.started = true;
                    roundData.finished = true;
                }
               

                setRound(roundData);

                const storedBots = JSON.parse(localStorage.getItem(`bots_${roundId}`) || '[]');
                setStoredBots(storedBots);

                const allParticipants = [...playersData, ...storedBots].map((p: Player) => {
                    if (!roundData.active && !p.finished) {
                        return { 
                            ...p, 
                            finished: true, 
                            time: -1,
                            lives: 10
                        };
                    }
                    return p;
                });
                const activeParticipants = allParticipants.slice(0, 10);
                const overflowSpectators = allParticipants.slice(10);

                const finishedPlayers = activeParticipants.filter((p: Player) => p.finished);
                const unfinishedPlayers = activeParticipants.filter((p: Player) => !p.finished);

                finishedPlayers.sort((a: Player, b: Player) => {
                    if (a.lives !== b.lives) return b.lives - a.lives;
                    return a.time - b.time;
                });

                setPlayers(finishedPlayers);
                setSpectators([...unfinishedPlayers, ...overflowSpectators]);
            }
        } catch (error) {
            console.error('Error loading results:', error);
        }
    };

    const formatTime = (time: number) => {
        if (time === 0) return '-- : --';
        if (time === -1) return 'DNF'; // Did not finish
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const getWinner = () => {
        if (players.length === 0) return null;
        return players[0]; // First in sorted list
    };

    const renderProgress = (player: Player) => {
        if (!round) return null;
        const word = round.word.toLowerCase();
        const allLettersGuessed = word.split('').every((letter) => player.guesses.includes(letter));
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {word.split('').map((letter, index) => {
                    const guessed = player.foundword || allLettersGuessed || player.guesses.includes(letter);
                    return (
                        <span
                            key={index}
                            style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: '1.5px solid black',
                                backgroundColor: guessed ? 'green' : 'white',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                color: guessed ? 'white' : 'black'
                            }}
                        />
                    );
                })}
            </div>
        );
    };

    const handleStartNewRound = async () => {
        if (!user || !round || !round.finished) return;

        const token = localStorage.getItem('token')!;
        const allRealPlayers = [...players, ...spectators].filter((p) => p.userid > 0);
        const uniquePlayerIds = Array.from(new Set(allRealPlayers.map((p) => p.userid)));

        try {
            // Reset all real player stats before starting the new round.
            await Promise.all(uniquePlayerIds.map((playerId) =>
                fetch(`http://localhost:3000/user/resetall/${playerId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            ));

            const res = await fetch(`http://localhost:3000/round/create/${user.userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Could not create new round');
            }

            const data = await res.json();
            const newRoundId = data.roundId;

            await Promise.all(uniquePlayerIds.map((playerId) =>
                fetch(`http://localhost:3000/roundinfo/create/${newRoundId}/${playerId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            ));

            const nextBots = shuffle([...storedBots]);
            localStorage.setItem(`bots_${newRoundId}`, JSON.stringify(nextBots));

            navigate(`/round/${newRoundId}`);
        } catch (error) {
            console.error('Error starting new round:', error);
        }
    };

    const handleEndRound = async () => {
        if (!round) return;

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

            setStoredBots((prev) => {
                const updated = prev.map((bot) =>
                    bot.finished ? bot : { ...bot, finished: true, time: bot.time || -1 }
                );
                localStorage.setItem(`bots_${roundId}`, JSON.stringify(updated));
                return updated;
            });

            setRound((prev) => (prev ? { ...prev, finished: true } : prev));
            loadResults();
        } catch (error) {
            console.error('Error ending round:', error);
        }
    };

    const handleEndRoom = async () => {
        if (!round) return;

        try {
            await fetch('http://localhost:3000/round/changeactive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                },
                body: JSON.stringify({ roundId })
            });
        } catch (error) {
            console.error('Error ending room:', error);
        } finally {
            navigate('/');
        }
    };

    const handleAddBots = async () => {
        if (!user || !round || !user.admin || user.userId !== round.host) return;
        if (botCount <= 0) return;

        try {
            const res = await fetch('/spiffing_bots.json');
            if (!res.ok) {
                throw new Error('Unable to load bot names');
            }
            const availableNames: string[] = await res.json();
            const usedNames = new Set([
                ...players.map((p) => p.username),
                ...spectators.map((p) => p.username),
                ...storedBots.map((bot) => bot.username)
            ]);
            let available = availableNames.filter((name) => !usedNames.has(name));
            const addCount = Math.min(botCount, available.length);

            if (available.length === 0) {
                return;
            }

            for (let i = 0; i < addCount; i += 1) {
                await sleep(1000);
                const index = Date.now() % available.length;
                const name = available[index];
                available = available.filter((botName) => botName !== name);

                const newBot: Player = {
                    userid: getRandomId(),
                    username: name,
                    lives: 10,
                    guesses: [],
                    time: 0,
                    finished: false,
                    foundword: false
                };

                setStoredBots((prev) => {
                    const updated = [...prev, newBot];
                    localStorage.setItem(`bots_${roundId}`, JSON.stringify(updated));
                    return updated;
                });
                setBotCount((prev) => Math.max(prev - 1, 0));
            }

            loadResults();
        } catch (error) {
            console.error('Error adding bots:', error);
        }
    };

    const handleLeaveRoom = async () => {
        navigate('/');
    };

    if (!user || !round) return <div>Loading...</div>;

    const winner = getWinner();

    return (
        <div>
            <h1>Round {roundId} Results</h1>
            <div style={{ marginBottom: '20px' }}>
                <p><strong>Word:</strong> {round.word}</p>
                <p><strong>Host:</strong> {round.host_username}</p>
                {winner && <p><strong>Winner:</strong> {winner.username}</p>}
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                    <h3>Players:</h3>
                    <ul>
                        {players.map(player => (
                            <li key={player.userid} style={{ marginBottom: '10px' }}>
                                <strong>{player.username}{player.userid === round.host ? <b> H</b> : ''}</strong>
                                <div>Lives: {player.lives}, Time: {formatTime(player.time)}</div>
                                <div style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>
                                    {renderProgress(player)}
                                </div>
                            </li>
                        ))}
                    </ul>

                    {spectators.length > 0 && (
                        <>
                            <h3>Spectators:</h3>
                            <ul>
                                {spectators.map(player => (
                                    <li key={player.userid} style={{ marginBottom: '10px', color: '#666' }}>
                                        <strong>{player.username}{player.userid === round.host ? <b> H</b> : ''}</strong> (Spectating)
                                        <div>Lives: {player.lives}, Time: {formatTime(player.time)}</div>
                                        <div style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>
                                            {renderProgress(player)}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>

                <div style={{ width: '300px' }}>
                    {user.userId === round.host && (
                        <div style={{ marginBottom: '20px', padding: 20, border: '1px solid #ddd', borderRadius: 10, backgroundColor: '#fafafa' }}>
                            <h3>Host Controls:</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {user.admin && (
                                    <>
                                        <input
                                            type="number"
                                            placeholder="Number of bots"
                                            value={botCount}
                                            onChange={(e) => setBotCount(parseInt(e.target.value) || 0)}
                                            min="0"
                                            max="10"
                                            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
                                        />
                                        <button onClick={handleAddBots} style={{ width: '100%', padding: '12px 16px' }}>
                                            Add Bots
                                        </button>
                                    </>
                                )}
                                {!round.finished && (
                                    <button 
                                        onClick={handleEndRound} 
                                        style={{ width: '100%', padding: '12px 16px' }}
                                        disabled={!round.active}
                                    >
                                        End Round
                                    </button>
                                )}
                                <button
                                    onClick={handleStartNewRound}
                                    style={{ width: '100%', padding: '12px 16px' }}
                                    disabled={!round.active}
                                >
                                    Start New Round
                                </button>
                                <button onClick={handleEndRoom} style={{ width: '100%', padding: '12px 16px', backgroundColor: '#dc3545', color: 'white' }}>
                                    Leave Room
                                </button>
                            </div>
                        </div>
                    )}
                    <div style={{ padding: 20, border: '1px solid #ddd', borderRadius: 10, backgroundColor: '#f9f9f9' }}>
                        <h3>Actions:</h3>
                        <button onClick={handleLeaveRoom} style={{ width: '100%', padding: '12px 16px' }}>
                            Leave Room
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Results;