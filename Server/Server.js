const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const archiver = require('archiver')

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

const pool = new Pool({
	user: 'postgres',
	//host: 'host.docker.internal',
	//host: 'localhost',
	host: 'postgres',
	database: 'demo',
	password: '123321',
	port: 5432,
})

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const tempDir = path.join(__dirname, 'temp_inputs')
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true })
		}
		cb(null, tempDir)
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname)
	},
})

const upload = multer({ storage: storage })

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

app.post('/api/merge-tiff', (req, res) => {
	try {
		const { layers, polygon_coords } = req.body

		if (!layers || !Array.isArray(layers) || layers.length === 0) {
			return res
				.status(400)
				.json({ error: 'Необходимо указать список слоев для объединения' })
		}

		// Преобразуем данные в JSON-строку для передачи скрипту
		const dataJson = JSON.stringify({
			layers,
			polygon_coords,
		})

		console.log('Запуск Python-скрипта с данными:', dataJson)

		// Запускаем Python скрипт с явным указанием пути
		exec(
			`python3 ${__dirname}/merge_tiff.py '${dataJson}'`,
			{ maxBuffer: 5 * 1024 * 1024 }, // Increase buffer size
			(error, stdout, stderr) => {
				if (error) {
					console.error('Ошибка выполнения Python-скрипта:', error)
					console.error('STDERR:', stderr)
					return res.status(500).json({
						error: 'Ошибка при обработке слоев',
						details: stderr || error.message,
					})
				}

				if (stderr) {
					console.log('Отладочная информация Python-скрипта:', stderr)
				}

				console.log('Python stdout:', stdout.substring(0, 500) + '...')

				try {
					// Парсим JSON-вывод от Python-скрипта
					const result = JSON.parse(stdout)

					if (result.status === 'success') {
						const downloadableFiles = [
							...result.geotiff_layers.map(layer => ({
								filename: layer.filename,
								url: `/api/download/${layer.filename}`,
								description: layer.description,
							})),
							{
								filename: 'merged_composite_geo.tif',
								url: `/api/download/merged_composite_geo.tif`,
								description: 'Геопривязанное композитное изображение',
							},
							{
								filename: 'merged_layers.tif',
								url: `/api/download/merged_layers.tif`,
								description: 'Объединенные слои',
							},
						]
						if (result.polygon_json_file) {
							downloadableFiles.push({
								filename: 'polygon_coords.json',
								url: `/api/download/polygon_coords.json`,
								description: 'Координаты полигона (JSON)',
							})
						}

						res.json({
							message: 'Слои успешно объединены',
							files: downloadableFiles,
						})
					} else {
						res.status(500).json({
							error: 'Ошибка при обработке слоев',
							details: result.message,
						})
					}
				} catch (parseError) {
					res.json({
						message:
							'Слои объединены, но возникла ошибка при обработке результата',
						rawOutput: stdout,
					})
				}
			}
		)
	} catch (error) {
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

//Маршрут для загрузки TIFF файлов
app.post('/api/upload-tiff', upload.array('tiffFiles'), (req, res) => {
	try {
		const files = req.files

		if (!files || files.length === 0) {
			return res.status(400).json({ error: 'Файлы не загружены' })
		}

		const fileList = files.map(file => ({
			filename: file.originalname,
			path: file.path,
		}))

		res.json({ success: true, files: fileList })
	} catch (error) {
		res.status(500).json({ error: 'Ошибка сервера при загрузке файлов' })
	}
})

// Маршрут для скачивания результирующих файлов
app.get('/api/download/:filename', (req, res) => {
	try {
		const { filename } = req.params
		const filePath = path.join(__dirname, 'outputs', filename)

		if (!fs.existsSync(filePath)) {
			return res.status(404).json({ error: 'Файл не найден' })
		}

		res.download(filePath)
	} catch (error) {
		console.error('Ошибка при скачивании файла:', error)
		res.status(500).json({ error: 'Ошибка сервера при скачивании файла' })
	}
})

// Обновление обработчика для скачивания архива
app.post('/api/download-all-zip', (req, res) => {
	try {
		const { filenames, deleteAfterDownload } = req.body

		if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
			return res
				.status(400)
				.json({ error: 'Необходимо указать список файлов для архивации' })
		}

		const outputDir = path.join(__dirname, 'outputs')

		res.setHeader('Content-Type', 'application/zip')
		res.setHeader('Content-Disposition', 'attachment; filename=all_layers.zip')

		// Создаем архив
		const archive = archiver('zip', {
			zlib: { level: 9 },
		})

		archive.on('error', err => {
			res.status(500).end()
		})

		archive.pipe(res)

		const requiredFiles = [
			'merged_composite_geo.tif',
			'merged_layers.tif',
			'polygon_coords.json',
		]

		const filesToDelete = []

		requiredFiles.forEach(filename => {
			const filePath = path.join(outputDir, filename)
			if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
				archive.file(filePath, { name: filename })
				filesToDelete.push(filePath)
			}
		})

		fs.readdirSync(outputDir).forEach(filename => {
			if (filename.startsWith('geo_')) {
				const filePath = path.join(outputDir, filename)
				if (fs.statSync(filePath).isFile()) {
					archive.file(filePath, { name: filename })
					filesToDelete.push(filePath)
				}
			}
		})

		archive.on('end', () => {
			if (deleteAfterDownload) {
				setTimeout(() => {
					deleteAllWorkingFiles()
				}, 1000)
			}
		})

		archive.finalize()
	} catch (error) {
		console.error('Ошибка при создании zip-архива:', error)
		res.status(500).json({ error: 'Ошибка сервера при создании архива' })
	}
})

function deleteFilesInDirectory(directory) {
	try {
		if (fs.existsSync(directory)) {
			const files = fs.readdirSync(directory)

			files.forEach(file => {
				const filePath = path.join(directory, file)
				if (fs.statSync(filePath).isFile()) {
					fs.unlinkSync(filePath)
				}
			})
		}
	} catch (error) {
		console.error(`Ошибка при удалении файлов из ${directory}:`, error)
	}
}

function deleteAllWorkingFiles() {
	const outputDir = path.join(__dirname, 'outputs')
	const inputDir = path.join(__dirname, 'temp_inputs')

	deleteFilesInDirectory(outputDir)
	deleteFilesInDirectory(inputDir)
}

// Новый маршрут для удаления файлов
app.post('/api/delete-files', (req, res) => {
	try {
		deleteAllWorkingFiles()
		res.json({ success: true, message: 'Файлы успешно удалены' })
	} catch (error) {
		console.error('Ошибка при удалении файлов:', error)
		res.status(500).json({ error: 'Ошибка сервера при удалении файлов' })
	}
})

app.listen(port, () => {
	console.log(`Сервер запустился на порту ${port}`)
})
