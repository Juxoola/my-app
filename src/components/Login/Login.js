import React, { useState } from 'react'
import { TextField, Button, Paper, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const Login = () => {
	const navigate = useNavigate()
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')

	const USERNAME = 'admin'
	const PASSWORD = '123'

	const handleLogin = () => {
		if (username === USERNAME && password === PASSWORD) {
			navigate('/map2')
		} else {
			setError('Неверный логин или пароль')
		}
	}

	return (
		<div className='login-container'>
			<Paper elevation={3} className='login-paper'>
				<Typography variant='h5' component='h1' gutterBottom>
					Авторизация
				</Typography>
				<TextField
					label='Логин'
					variant='outlined'
					fullWidth
					margin='normal'
					value={username}
					onChange={e => setUsername(e.target.value)}
				/>
				<TextField
					label='Пароль'
					variant='outlined'
					fullWidth
					margin='normal'
					type='password'
					value={password}
					onChange={e => setPassword(e.target.value)}
				/>
				{error && (
					<Typography variant='body2' color='error'>
						{error}
					</Typography>
				)}
				<Button
					variant='contained'
					color='primary'
					onClick={handleLogin}
					className='login-button'
					style={{ marginTop: '10px' }}
				>
					Войти
				</Button>
			</Paper>
		</div>
	)
}

export default Login
