import React, { useState } from 'react'
import {
	TextField,
	Button,
	Paper,
	Typography,
	InputAdornment,
} from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
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
					Вход в систему
				</Typography>
				<TextField
					label='Логин'
					variant='outlined'
					fullWidth
					margin='normal'
					value={username}
					onChange={e => setUsername(e.target.value)}
					InputProps={{
						startAdornment: (
							<InputAdornment position='start'>
								<EmailIcon />
							</InputAdornment>
						),
					}}
					InputLabelProps={{
						shrink: !!username,
					}}
					className='login-input'
				/>
				<TextField
					label='Пароль'
					variant='outlined'
					fullWidth
					margin='normal'
					type='password'
					value={password}
					onChange={e => setPassword(e.target.value)}
					InputProps={{
						startAdornment: (
							<InputAdornment position='start'>
								<LockIcon />
							</InputAdornment>
						),
					}}
					InputLabelProps={{
						shrink: !!password,
					}}
					className='login-input'
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
					fullWidth
				>
					Войти
				</Button>
			</Paper>
		</div>
	)
}

export default Login
