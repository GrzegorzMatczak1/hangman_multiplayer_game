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

    if (admin === null) {
        return (
            <div className="screen-center">
                <div className="glass p-4 text-center">
                    <div className="spinner-border text-secondary mb-3" role="status" />
                    <p className="mb-0 brand-muted">Loading settings...</p>
                </div>
            </div>
        );
    }

    if (admin) {
        return (
            <main className="app-shell page-enter">
                <div className="app-header">
                    <div>
                        <h1 className="brand-title mb-1">Word Configuration</h1>
                        <p className="brand-muted mb-0">Zarządzaj słowami i botami systemowymi.</p>
                    </div>
                    <button className="btn btn-outline-light" onClick={() => navigate('/')}>Back to Lobby</button>
                </div>

                <div className="row g-3">
                    <div className="col-12 col-lg-8">
                        <section className="glass p-3 h-100">
                            <h3 className="h5 brand-title mb-3">Words</h3>
                            <div className="d-flex gap-2 mb-3">
                                <input
                                    className="form-control"
                                    type="text"
                                    value={newWord}
                                    onChange={(e) => setNewWord(e.target.value)}
                                    placeholder="Enter new word"
                                />
                                <button className="btn btn-primary" onClick={handleAddWord}>Add Word</button>
                            </div>
                            <div className="d-flex flex-wrap gap-2 mb-3">
                                <button className="btn btn-secondary" onClick={handleLoadWords}>Load Words from JSON</button>
                            </div>

                            <ul className="word-list mb-0">
                                {words.map(w => (
                                    <li className="word-list-item d-flex justify-content-between align-items-center" key={w.id}>
                                        <span>{w.word} <small className="brand-muted">({w.size})</small></span>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteWord(w.id)}>Delete</button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    <div className="col-12 col-lg-4">
                        <section className="glass p-3">
                            <h3 className="h5 brand-title mb-3">Create Bot Accounts</h3>
                            <div className="d-flex gap-2 align-items-center">
                                <input
                                    className="form-control"
                                    type="number"
                                    value={botCount}
                                    min={1}
                                    max={50}
                                    onChange={(e) => setBotCount(parseInt(e.target.value) || 1)}
                                />
                                <button className="btn btn-primary" onClick={handleCreateBots}>Create</button>
                            </div>
                            {botMessage && <div className="alert alert-success mt-3 mb-0 py-2">{botMessage}</div>}
                        </section>
                    </div>
                </div>

                {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
            </main>
        );
    } else {
        return (
            <main className="app-shell page-enter">
                <section className="glass p-4" style={{ maxWidth: '620px', margin: '0 auto' }}>
                    <h2 className="brand-title">You shouldn't be here</h2>
                    <p className="brand-muted">Jeśli masz kod administracyjny, możesz podnieść uprawnienia.</p>
                    <div className="d-flex gap-2 mb-3">
                        <input
                            className="form-control"
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            placeholder="Enter secret"
                        />
                        <button className="btn btn-primary" onClick={handlePromote}>Submit</button>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-light" onClick={() => navigate('/')}>Go back</button>
                    </div>
                    {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
                </section>
            </main>
        );
    }
}

export default WordConfig;