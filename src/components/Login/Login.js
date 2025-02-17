import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
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
			<div className='login-paper'>
				<h1>Вход в систему</h1>
				<div className='login-form'>
					<div className='input-group'>
						<span className='input-icon'>
							<PersonOutlineIcon />
						</span>
						<input
							type='text'
							placeholder='Логин'
							value={username}
							onChange={e => setUsername(e.target.value)}
						/>
					</div>
					<div className='input-group'>
						<span className='input-icon'>
							<LockOutlinedIcon />
						</span>
						<input
							type='password'
							placeholder='Пароль'
							value={password}
							onChange={e => setPassword(e.target.value)}
						/>
					</div>
					{error && <div className='error-text'>{error}</div>}
					<button type='button' className='login-button' onClick={handleLogin}>
						Войти
					</button>
				</div>
			</div>
		</div>
	)
}

export default Login
