import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './Login'
import Register from './Register'
import Lobby from './Lobby'
import WordConfig from './WordConfig'

function App() {

  return (
    <>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/wordconfig" element={<WordConfig/>} />
      </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
