const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()
const port = 3001

app.use(cors())

const pool = new Pool({
	user: 'postgres',
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

app.listen(port, () => {
	console.log(`Cервер запустился на порту ${port}`)
})
