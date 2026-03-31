import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"


interface Word {
    word: string,
    size: number
}


function TestWord() {
    const location = useLocation()
    const [word, setWord] = useState<Word>({word: "", size: 0})
    
    const handleSubmit = async () => {
        const temp_size = word.word.length
        setWord({...word, size: temp_size})
        await fetch('http://localhost:3000/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(word)
        }) .then(response => { 
                if (response.ok) {
                    console.log('Question submitted successfully!')
                    setWord({word: "", size: 0})
                }
            })
}

    return (
        <>
            <input type="text" value={word.word} onChange={(e) => setWord({...word, word: e.target.value})} />
            <button onClick={handleSubmit}>Submit</button>
        </>
    )
}

export default TestWord