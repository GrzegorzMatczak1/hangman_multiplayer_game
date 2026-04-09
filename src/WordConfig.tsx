// WordConfig menu for the hangman game
// When this component is accesed it check if the jtw token has the admin privilege. If the user has admin privileges display input and submit button for adding words to the database, under that there is a list of all words with an x button that deletes the word and updates the list. When delete button is pressed it will prompt for confirmation. Before adding a new word check if it exists in the databse. If the user does not have admin privileges it will display a header saying that you shouldnt be here with a button showing go back. Under that is an input field and a submit button. If the imput is right it modifies the jtw token value admin to true and reloades the page. If the input is wrong it redirects the user to the home page.

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