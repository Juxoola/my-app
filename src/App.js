import React from 'react'
import {Routes, Route } from 'react-router-dom'
import './App.css'
import Map1 from './components/Map1/Map1'
import Login from './components/Login/Login'
import Map2 from './components/Map2/Map2'

function App() {
	return (
		<Routes>
			<Route path='/' element={<Map1 />} />
			<Route path='/login' element={<Login />} />
			<Route path='/map2' element={<Map2 />} />
		</Routes>
	)
}

export default App
