import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Word {
    id: number;
    word: string;
    size: number;
}

function WordConfig() {
    const [admin, setAdmin] = useState<boolean | null>(null);
    const [words, setWords] = useState<Word[]>([]);
    const [newWord, setNewWord] = useState('');
    const [secret, setSecret] = useState('');
    const [error, setError] = useState('');
    const [botCount, setBotCount] = useState(10);
    const [botMessage, setBotMessage] = useState('');
    const navigate = useNavigate();

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
                setAdmin(data.admin);
                if (data.admin) {
                    fetchWords();
                }
            } else {
                localStorage.removeItem('token');
                navigate('/login');
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            navigate('/login');
        });
    }, [navigate]);

    const fetchWords = () => {
        const token = localStorage.getItem('token')!;
        fetch('http://localhost:3000/words/getall', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(data => setWords(data))
        .catch(console.error);
    };

    const handleAddWord = async () => {
        setError('');
        const token = localStorage.getItem('token')!;
        try {
            const res = await fetch('http://localhost:3000/words/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ word: newWord })
            });
            if (res.ok) {
                setNewWord('');
                fetchWords();
            } else {
                setError(await res.text());
            }
        } catch (err) {
            setError('Network error');
        }
    };

    const handleDeleteWord = async (id: number) => {
        if (!confirm('Are you sure you want to delete this word?')) return;
        const token = localStorage.getItem('token')!;
        try {
            const res = await fetch(`http://localhost:3000/words/delete/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                fetchWords();
            } else {
                setError(await res.text());
            }
        } catch (err) {
            setError('Network error');
        }
    };

    const handleLoadWords = async () => {
        setError('');
        const token = localStorage.getItem('token')!;
        try {
            // Fetch words from JSON file
            const response = await fetch('/words.json');
            if (!response.ok) {
                throw new Error('Failed to load words.json');
            }
            const words = await response.json();
            
            // Send to backend
            const res = await fetch('http://localhost:3000/words/loadfromjson', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ words })
            });
            
            if (res.ok) {
                const result = await res.json();
                alert(result.message);
                fetchWords(); // Refresh the list
            } else {
                setError(await res.text());
            }
        } catch (err) {
            setError('Network error or failed to load JSON file');
        }
    };

    const handleCreateBots = async () => {
        setError('');
        setBotMessage('');
        const token = localStorage.getItem('token')!;
        try {
            const res = await fetch('http://localhost:3000/bots/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ count: botCount })
            });
            if (res.ok) {
                const data = await res.json();
                setBotMessage(`Created ${data.count} bot user${data.count === 1 ? '' : 's'}.`);
            } else {
                setError(await res.text());
            }
        } catch (err) {
            setError('Network error while creating bot users');
        }
    };

    const handlePromote = async () => {
        setError('');
        const token = localStorage.getItem('token')!;
        try {
            const res = await fetch('http://localhost:3000/user/generateToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ secret })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                window.location.reload();
            } else {
                const errorText = await res.text();
                if (res.status === 401) {
                    navigate('/');
                } else {
                    setError(errorText);
                }
            }
        } catch (err) {
            setError('Network error');
        }
    };

    if (admin === null) return <div>Loading...</div>;

    if (admin) {
        return (
            <div>
                <h2>Word Configuration</h2>
                <div>
                    <input
                        type="text"
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                        placeholder="Enter new word"
                    />
                    <button onClick={handleAddWord}>Add Word</button>
                </div>
                <div style={{ marginTop: 20 }}>
                    <button onClick={handleLoadWords}>Load Words from JSON</button>
                </div>
                <div style={{ marginTop: 12 }}>
                    <button onClick={() => navigate('/')}>Back to Lobby</button>
                </div>
                <div style={{ marginTop: 20, padding: 16, border: '1px solid #ddd', borderRadius: 10, backgroundColor: '#fafafa' }}>
                    <h3>Create Bot Accounts</h3>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                            type="number"
                            value={botCount}
                            min={1}
                            max={50}
                            onChange={(e) => setBotCount(parseInt(e.target.value) || 1)}
                            style={{ width: 100, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                        />
                        <button onClick={handleCreateBots}>Create Bot Users</button>
                    </div>
                    {botMessage && <p style={{ marginTop: 10, color: 'green' }}>{botMessage}</p>}
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <ul>
                    {words.map(w => (
                        <li key={w.id}>
                            {w.word} ({w.size}) <button onClick={() => handleDeleteWord(w.id)}>X</button>
                        </li>
                    ))}
                </ul>
            </div>
        );
    } else {
        return (
            <div>
                <h2>You shouldn't be here</h2>
                <button onClick={() => navigate('/')}>Go back</button>
                <div>
                    <input
                        type="password"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        placeholder="Enter secret"
                    />
                    <button onClick={handlePromote}>Submit</button>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>
        );
    }
}

export default WordConfig;