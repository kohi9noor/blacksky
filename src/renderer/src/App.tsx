import { Route, Routes } from 'react-router-dom'
import Home from './pages/home'

function App(): JSX.Element {
  return (
    <div className=" min-h-screen bg-zinc-950 font-mono text-white">
      <Routes>
        <Route element={<Home />} path="/"></Route>
      </Routes>
    </div>
  )
}

export default App
