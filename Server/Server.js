const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

const pool = new Pool({
	user: 'postgres',
	//host: 'host.docker.internal',
	host: 'localhost',
	database: 'demo',
	password: '123321',
	port: 5432,
})

app.get('/api/flights', async (req, res) => {
	try {
		const query = `
      SELECT
        f.flight_id,
        f.departure_airport,
        dep.coordinates AS departure_coords,
        f.arrival_airport,
        arr.coordinates AS arrival_coords
      FROM flights f
      JOIN airports_data dep ON f.departure_airport = dep.airport_code
      JOIN airports_data arr ON f.arrival_airport = arr.airport_code
      LIMIT 10;
    `
		const result = await pool.query(query)
		res.json(result.rows)
	} catch (error) {
		console.error(error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

app.get('/api/points', async (req, res) => {
	try {
		const query = 'SELECT * FROM points ORDER BY id'
		const result = await pool.query(query)
		res.json(result.rows)
	} catch (error) {
		console.error('Ошибка при получении точек:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

app.post('/api/points', async (req, res) => {
	try {
		const { x, y } = req.body
		if (x === undefined || y === undefined) {
			return res
				.status(400)
				.json({ error: 'Неверные данные. Требуются координаты x и y.' })
		}
		const query = 'INSERT INTO points (x, y) VALUES ($1, $2) RETURNING *'
		const result = await pool.query(query, [x, y])
		res.json(result.rows[0])
	} catch (error) {
		console.error('Ошибка при добавлении точки:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

app.delete('/api/points/:id', async (req, res) => {
	try {
		const { id } = req.params
		const query = 'DELETE FROM points WHERE id = $1 RETURNING *'
		const result = await pool.query(query, [id])
		if (result.rowCount === 0) {
			return res.status(404).json({ error: 'Точка не найдена' })
		}
		res.json({ message: 'Точка успешно удалена' })
	} catch (error) {
		console.error('Ошибка при удалении точки:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

app.listen(port, () => {
	console.log(`Сервер запустился на порту ${port}`)
})
