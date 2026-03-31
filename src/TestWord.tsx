import { useState } from "react"


interface Word {
    word: string,
    size: number
}


function TestWord() {
    const [word, setWord] = useState<Word>({word: "", size: 0})
    const [text, setText] = useState<string>("")
    
    const handleSubmit = async () => {
        const temp_size = text.length
        const payload = { word: text, size: temp_size }
        setWord(payload)
        await fetch('http://localhost:3000/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }) .then(response => { 
                if (response.ok) {
                    console.log('Question submitted successfully!')
                    setWord({word: "", size: 0})
                    setText("")
                }
            })
}

    return (
        <>
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
            <button onClick={handleSubmit}>Submit</button>
        </>
    )
}

export default TestWord