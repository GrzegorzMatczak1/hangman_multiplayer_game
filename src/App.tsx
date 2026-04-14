import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './Login'
import Register from './Register'
import Lobby from './Lobby'
import WordConfig from './WordConfig'
import Round from './Round'
import Results from './Results'

function App() {

  return (
    <>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/wordconfig" element={<WordConfig/>} />
        <Route path="/round/:id" element={<Round/>} />
        <Route path="/results/:id" element={<Results/>} />
      </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
