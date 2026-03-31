import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import TestWord from './TestWord'

function App() {

  return (
    <>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<TestWord/>} />
      </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
