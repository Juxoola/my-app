import React, { useEffect, useRef, useState } from 'react'
import 'ol/ol.css'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import TileWMS from 'ol/source/TileWMS'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import LineString from 'ol/geom/LineString'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style'
import { useNavigate } from 'react-router-dom'
import AddLocationIcon from '@mui/icons-material/AddLocation'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import StraightenIcon from '@mui/icons-material/Straighten'
import CropFreeIcon from '@mui/icons-material/CropFree'
import './Map1.css'
import { getDistance } from 'geolib'
import { Permutation } from 'js-combinatorics'
import { Polygon } from 'ol/geom'
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom'
import UTIF from 'utif'

const createWMSLayer = (layerName, visible) => {
	return new TileLayer({
		source: new TileWMS({
			url: 'http://localhost:8080/geoserver/wms',
			params: { LAYERS: layerName, TILED: true },
			serverType: 'geoserver',
			crossOrigin: 'anonymous',
		}),
		visible: visible,
	})
}

const Map1 = () => {
	const navigate = useNavigate()

	const mapContainerRef = useRef(null)
	const mapRef = useRef(null)

	const statesLayerRef = useRef(null)
	const roadsLayerRef = useRef(null)
	const pointsLayerRef = useRef(null)
	const manualPointsLayerRef = useRef(null)
	const routeLayerRef = useRef(null)
	const polygonLayerRef = useRef(null)

	const [statesChecked, setStatesChecked] = useState(false)
	const [roadsChecked, setRoadsChecked] = useState(false)
	const [pointsChecked, setPointsChecked] = useState(true)
	const [manualPointsChecked, setManualPointsChecked] = useState(true)

	const [isAddingPoint, setIsAddingPoint] = useState(false)
	const [isDeletingPoint, setIsDeletingPoint] = useState(false)

	const [isSelectingAirports, setIsSelectingAirports] = useState(false)
	const [selectedAirports, setSelectedAirports] = useState([])
	const [routeDistance, setRouteDistance] = useState(null)

	const [isSelectingPolygon, setIsSelectingPolygon] = useState(false)
	const [polygonPoints, setPolygonPoints] = useState([])

	const [isShowingSaveMenu, setIsShowingSaveMenu] = useState(false)
	const [saveLayerOptions, setSaveLayerOptions] = useState({
		osm: true,
		states: true,
		roads: true,
		airports: true,
		manual: true,
		route: true,
		polygon: true,
	})

	const clickTimeoutRef = useRef(null)

	const [mergeStatus, setMergeStatus] = useState(null)

	const [exportScale, setExportScale] = useState('1.0')
	const [isExporting, setIsExporting] = useState(false)

	const handleLogin = () => {
		navigate('/login')
	}

	useEffect(() => {
		const osmLayer = new TileLayer({
			source: new OSM({
				crossOrigin: 'anonymous',
			}),
		})

		statesLayerRef.current = createWMSLayer('topp:states', statesChecked)
		roadsLayerRef.current = createWMSLayer('topp:tasmania_roads', roadsChecked)

		pointsLayerRef.current = new VectorLayer({
			source: new VectorSource(),
			visible: pointsChecked,
		})

		manualPointsLayerRef.current = new VectorLayer({
			source: new VectorSource(),
			visible: manualPointsChecked,
		})

		routeLayerRef.current = new VectorLayer({
			source: new VectorSource(),
			visible: pointsChecked,
		})

		polygonLayerRef.current = new VectorLayer({
			source: new VectorSource(),
			visible: true,
		})

		const map = new Map({
			target: mapContainerRef.current,
			layers: [
				osmLayer,
				statesLayerRef.current,
				roadsLayerRef.current,
				pointsLayerRef.current,
				manualPointsLayerRef.current,
				routeLayerRef.current,
				polygonLayerRef.current,
			],
			view: new View({
				center: [0, 0],
				zoom: 2,
			}),
		})
		mapRef.current = map

		map.getInteractions().forEach(interaction => {
			if (interaction instanceof DoubleClickZoom) {
				map.removeInteraction(interaction)
			}
		})

		return () => map.setTarget(null)
	}, [])

	useEffect(() => {
		if (statesLayerRef.current) {
			statesLayerRef.current.setVisible(statesChecked)
		}
		if (roadsLayerRef.current) {
			roadsLayerRef.current.setVisible(roadsChecked)
		}
		if (pointsLayerRef.current) {
			pointsLayerRef.current.setVisible(pointsChecked)
		}
		if (manualPointsLayerRef.current) {
			manualPointsLayerRef.current.setVisible(manualPointsChecked)
		}
		if (routeLayerRef.current) {
			routeLayerRef.current.setVisible(pointsChecked)
		}
	}, [statesChecked, roadsChecked, pointsChecked, manualPointsChecked])

	// Загружаем данные о рейсах
	useEffect(() => {
		if (!mapRef.current) return

		fetch('http://localhost:3001/api/flights')
			.then(response => response.json())
			.then(data => {
				const features = []

				data.forEach(flight => {
					if (
						flight.departure_coords &&
						typeof flight.departure_coords === 'object' &&
						flight.departure_coords.x != null &&
						flight.departure_coords.y != null
					) {
						const departureFeature = new Feature({
							geometry: new Point(
								fromLonLat([
									flight.departure_coords.x,
									flight.departure_coords.y,
								])
							),
						})
						departureFeature.setStyle(
							new Style({
								image: new CircleStyle({
									radius: 7,
									fill: new Fill({ color: 'blue' }),
									stroke: new Stroke({ color: 'black', width: 1 }),
								}),
								text: new Text({
									text: flight.departure_airport,
									offsetX: 10,
									offsetY: -10,
									font: '12px sans-serif',
									fill: new Fill({ color: 'black' }),
									stroke: new Stroke({ color: 'white', width: 2 }),
								}),
							})
						)
						features.push(departureFeature)
					}
					if (
						flight.arrival_coords &&
						typeof flight.arrival_coords === 'object' &&
						flight.arrival_coords.x != null &&
						flight.arrival_coords.y != null
					) {
						const arrivalFeature = new Feature({
							geometry: new Point(
								fromLonLat([flight.arrival_coords.x, flight.arrival_coords.y])
							),
						})
						arrivalFeature.setStyle(
							new Style({
								image: new CircleStyle({
									radius: 7,
									fill: new Fill({ color: 'red' }),
									stroke: new Stroke({ color: 'black', width: 1 }),
								}),
								text: new Text({
									text: flight.arrival_airport,
									offsetX: 10,
									offsetY: 10,
									font: '12px sans-serif',
									fill: new Fill({ color: 'black' }),
									stroke: new Stroke({ color: 'white', width: 2 }),
								}),
							})
						)
						features.push(arrivalFeature)
					}
				})

				if (pointsLayerRef.current) {
					const source = pointsLayerRef.current.getSource()
					source.clear()
					source.addFeatures(features)
				}
			})
			.catch(error => console.error('Ошибка загрузки данных полетов:', error))
	}, [])

	// Загружаем точки из базы данных (добавленные вручную)
	useEffect(() => {
		if (!mapRef.current) return
		fetch('http://localhost:3001/api/points')
			.then(response => response.json())
			.then(data => {
				const features = data.map(point => {
					const feature = new Feature({
						geometry: new Point(fromLonLat([point.x, point.y])),
					})
					feature.setStyle(
						new Style({
							image: new CircleStyle({
								radius: 7,
								fill: new Fill({ color: 'green' }),
								stroke: new Stroke({ color: 'black', width: 1 }),
							}),
						})
					)
					feature.setId(point.id)
					return feature
				})
				if (manualPointsLayerRef.current) {
					const source = manualPointsLayerRef.current.getSource()
					source.addFeatures(features)
				}
			})
			.catch(error =>
				console.error('Ошибка загрузки точек из базы данных:', error)
			)
	}, [])

	// Режим добавления точки
	useEffect(() => {
		if (!isAddingPoint || !mapRef.current) return

		const handleMapClick = event => {
			const coordinate = event.coordinate
			const lonLatCoord = toLonLat(coordinate)
			const payload = { x: lonLatCoord[0], y: lonLatCoord[1] }

			fetch('http://localhost:3001/api/points', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
				.then(response => response.json())
				.then(data => {
					const newFeature = new Feature({
						geometry: new Point(fromLonLat([payload.x, payload.y])),
					})
					newFeature.setStyle(
						new Style({
							image: new CircleStyle({
								radius: 7,
								fill: new Fill({ color: 'green' }),
								stroke: new Stroke({ color: 'black', width: 1 }),
							}),
						})
					)
					newFeature.setId(data.id)
					if (manualPointsLayerRef.current) {
						manualPointsLayerRef.current.getSource().addFeature(newFeature)
					}
				})
				.catch(error =>
					console.error('Ошибка добавления точки в базу данных:', error)
				)

			setIsAddingPoint(false)
		}

		mapRef.current.once('click', handleMapClick)

		return () => {
			mapRef.current.un('click', handleMapClick)
		}
	}, [isAddingPoint])

	// Режим удаления точки
	useEffect(() => {
		if (!isDeletingPoint || !mapRef.current) return

		const handleMapClickForDeletion = event => {
			let deleted = false
			mapRef.current.forEachFeatureAtPixel(event.pixel, feature => {
				const source = manualPointsLayerRef.current.getSource()
				if (source.hasFeature(feature)) {
					const pointId = feature.getId()
					if (pointId) {
						fetch(`http://localhost:3001/api/points/${pointId}`, {
							method: 'DELETE',
						})
							.then(response => {
								if (!response.ok) {
									console.error('Ошибка удаления точки из базы данных')
								} else {
									console.log('Точка успешно удалена из базы данных')
								}
							})
							.catch(error =>
								console.error('Ошибка при удалении точки:', error)
							)
					}
					source.removeFeature(feature)
					deleted = true
					return true
				}
			})
			if (!deleted) {
				console.log('Точка не найдена по месту клика.')
			}
			setIsDeletingPoint(false)
		}

		mapRef.current.once('click', handleMapClickForDeletion)

		return () => {
			mapRef.current.un('click', handleMapClickForDeletion)
		}
	}, [isDeletingPoint])

	//Выделение точек
	useEffect(() => {
		if (!isSelectingAirports || !mapRef.current) return

		const handleAirportSelection = event => {
			let clickedFeature = null
			let max = 5

			mapRef.current.forEachFeatureAtPixel(event.pixel, feature => {
				if (
					pointsLayerRef.current &&
					pointsLayerRef.current.getSource().hasFeature(feature)
				) {
					clickedFeature = feature
					return true
				}
			})

			if (clickedFeature) {
				const alreadyIndex = selectedAirports.indexOf(clickedFeature)
				if (alreadyIndex >= 0) {
					unhighlightFeature(clickedFeature)
					const newSelected = selectedAirports.filter(f => f !== clickedFeature)
					setSelectedAirports(newSelected)
				} else {
					if (selectedAirports.length < max) {
						highlightFeature(clickedFeature)
						setSelectedAirports([...selectedAirports, clickedFeature])
					} else {
						console.log(
							`Максимальное количество выбранных точек ${max} уже достигнуто`
						)
					}
				}
			}
		}

		mapRef.current.on('click', handleAirportSelection)
		return () => {
			if (mapRef.current) {
				mapRef.current.un('click', handleAirportSelection)
			}
		}
	}, [isSelectingAirports, selectedAirports])

	//Построение линий и вычисление расстояния
	useEffect(() => {
		if (selectedAirports.length >= 2) {
			const points = selectedAirports.map(feature =>
				feature.getGeometry().getCoordinates()
			)
			const pointsLonLat = points.map(coord => toLonLat(coord))
			const n = pointsLonLat.length
			let bestOrder = []
			let bestDistance = Infinity

			if (n === 2) {
				bestOrder = [0, 1]
				bestDistance = calculateDistance(pointsLonLat[0], pointsLonLat[1])
			} else {
				const index = []
				for (let i = 1; i < n - 1; i++) {
					index.push(i)
				}
				const permutations = new Permutation(index).toArray()
				for (const perm of permutations) {
					const routeOrder = [0, ...perm, n - 1]
					let distance = 0
					for (let i = 0; i < routeOrder.length - 1; i++) {
						distance += calculateDistance(
							pointsLonLat[routeOrder[i]],
							pointsLonLat[routeOrder[i + 1]]
						)
					}
					if (distance < bestDistance) {
						bestDistance = distance
						bestOrder = routeOrder
					}
				}
			}
			const routeCoords = bestOrder.map(idx => points[idx])

			if (routeLayerRef.current) {
				const source = routeLayerRef.current.getSource()
				source.clear()
				const routeFeature = new Feature({
					geometry: new LineString(routeCoords),
				})
				routeFeature.setStyle(
					new Style({
						stroke: new Stroke({
							color: 'orange',
							width: 3,
						}),
					})
				)
				source.addFeature(routeFeature)

				// Точка начала
				const startFeature = new Feature({
					geometry: new Point(routeCoords[0]),
				})
				startFeature.setStyle(
					new Style({
						image: new CircleStyle({
							radius: 8,
							fill: new Fill({ color: 'green' }),
							stroke: new Stroke({ color: 'black', width: 2 }),
						}),
					})
				)
				source.addFeature(startFeature)

				// Точка конца
				const endFeature = new Feature({
					geometry: new Point(routeCoords[routeCoords.length - 1]),
				})
				endFeature.setStyle(
					new Style({
						image: new CircleStyle({
							radius: 8,
							fill: new Fill({ color: 'purple' }),
							stroke: new Stroke({ color: 'black', width: 2 }),
						}),
					})
				)
				source.addFeature(endFeature)
			}
			setRouteDistance(bestDistance)
		} else {
			if (routeLayerRef.current) {
				routeLayerRef.current.getSource().clear()
			}
			setRouteDistance(null)
		}
	}, [selectedAirports])

	const highlightFeature = feature => {
		if (!feature.get('originalStyle')) {
			feature.set('originalStyle', feature.getStyle())
		}
		feature.setStyle(
			new Style({
				image: new CircleStyle({
					radius: 10,
					fill: new Fill({ color: 'yellow' }),
					stroke: new Stroke({ color: 'red', width: 2 }),
				}),
				text:
					feature.getStyle() && feature.getStyle().getText
						? feature.getStyle().getText()
						: undefined,
			})
		)
	}

	const unhighlightFeature = feature => {
		const originalStyle = feature.get('originalStyle')
		if (originalStyle) {
			feature.setStyle(originalStyle)
			feature.set('originalStyle', null)
		}
	}

	const calculateDistance = ([lon1, lat1], [lon2, lat2]) => {
		const meters = getDistance(
			{ latitude: lat1, longitude: lon1 },
			{ latitude: lat2, longitude: lon2 }
		)
		return meters / 1000
	}

	const handleToggleSelectAirports = () => {
		if (isSelectingAirports) {
			selectedAirports.forEach(feature => {
				unhighlightFeature(feature)
			})
			setSelectedAirports([])
			if (routeLayerRef.current) {
				routeLayerRef.current.getSource().clear()
			}
			setRouteDistance(null)
		}
		setIsSelectingAirports(!isSelectingAirports)
	}

	//Выделение полигона
	useEffect(() => {
		if (!isSelectingPolygon || !mapRef.current) return

		const handleMapClick = event => {
			if (clickTimeoutRef.current !== null) {
				clearTimeout(clickTimeoutRef.current)
			}
			clickTimeoutRef.current = setTimeout(() => {
				const coordinate = event.coordinate
				setPolygonPoints(prev => {
					const newPoints = [...prev, coordinate]
					if (newPoints.length >= 3) {
						const polygonFeature = new Feature({
							geometry: new Polygon([newPoints]),
						})
						polygonFeature.setStyle(
							new Style({
								stroke: new Stroke({
									color: 'blue',
									width: 2,
								}),
								fill: new Fill({
									color: 'rgba(0, 0, 255, 0.2)',
								}),
							})
						)
						if (polygonLayerRef.current) {
							polygonLayerRef.current.getSource().clear()
							polygonLayerRef.current.getSource().addFeature(polygonFeature)
						}
					}
					return newPoints
				})
				clickTimeoutRef.current = null
			}, 200)
		}

		mapRef.current.on('click', handleMapClick)
		return () => {
			if (clickTimeoutRef.current !== null) {
				clearTimeout(clickTimeoutRef.current)
			}
			mapRef.current.un('click', handleMapClick)
		}
	}, [isSelectingPolygon])

	useEffect(() => {
		if (!isSelectingPolygon || !mapRef.current) return

		const handlePolygonDoubleClick = event => {
			event.preventDefault()
			event.stopPropagation()
			if (clickTimeoutRef.current !== null) {
				clearTimeout(clickTimeoutRef.current)
				clickTimeoutRef.current = null
			}
			if (polygonPoints.length >= 3) {
				setIsShowingSaveMenu(true)
			}
		}

		mapRef.current.on('dblclick', handlePolygonDoubleClick)
		return () => {
			mapRef.current.un('dblclick', handlePolygonDoubleClick)
		}
	}, [isSelectingPolygon, polygonPoints])

	const cloneVectorSource = source => {
		const newSource = new VectorSource()
		source.getFeatures().forEach(feature => {
			newSource.addFeature(feature.clone())
		})
		return newSource
	}

	const saveLayerToTiff = (layer, filename, mapSize) => {
		const scale = parseFloat(exportScale)
		const dimensionScale = Math.sqrt(scale)
		const scaledWidth = Math.floor(mapSize[0] * dimensionScale)
		const scaledHeight = Math.floor(mapSize[1] * dimensionScale)

		return new Promise((resolve, reject) => {
			try {
				// Создаём временный контейнер для карты с масштабированным размером
				const tempContainer = document.createElement('div')
				tempContainer.style.position = 'absolute'
				tempContainer.style.top = '-10000px'
				tempContainer.style.left = '-10000px'
				tempContainer.style.width = `${scaledWidth}px`
				tempContainer.style.height = `${scaledHeight}px`
				document.body.appendChild(tempContainer)

				const currentView = mapRef.current.getView()
				const extent = currentView.calculateExtent(mapSize)
				const projection = currentView.getProjection()

				// Временная карта с масштабированным размером 
				const tempMap = new Map({
					target: tempContainer,
					layers: [layer],
					view: new View({
						projection: projection,
						extent: extent,
					}),
				})

				tempMap.getView().fit(extent, {
					size: [scaledWidth, scaledHeight],
					padding: [0, 0, 0, 0],
				})

				tempMap.once('rendercomplete', () => {
					try {
						const tempViewport = tempMap.getViewport()
						const canvases = tempViewport.querySelectorAll('canvas')
						const compositeCanvas = document.createElement('canvas')
						compositeCanvas.width = scaledWidth
						compositeCanvas.height = scaledHeight
						const compositeCtx = compositeCanvas.getContext('2d')

						canvases.forEach(canvas => {
							if (canvas.width > 0) {
								const opacity = canvas.parentNode.style.opacity
								compositeCtx.globalAlpha = opacity === '' ? 1 : Number(opacity)
								compositeCtx.drawImage(canvas, 0, 0)
							}
						})

						const scaledPolygonPoints = polygonPoints.map(coord =>
							tempMap.getPixelFromCoordinate(coord)
						)
						const xs = scaledPolygonPoints.map(p => p[0])
						const ys = scaledPolygonPoints.map(p => p[1])
						const minX = Math.min(...xs)
						const minY = Math.min(...ys)
						const maxX = Math.max(...xs)
						const maxY = Math.max(...ys)
						const width = maxX - minX
						const height = maxY - minY

						if (width < 1 || height < 1) {
							throw new Error('Полигон слишком мал после масштабирования')
						}

						const clippedCanvas = document.createElement('canvas')
						clippedCanvas.width = width
						clippedCanvas.height = height
						const clippedCtx = clippedCanvas.getContext('2d')

						clippedCtx.beginPath()
						clippedCtx.moveTo(
							scaledPolygonPoints[0][0] - minX,
							scaledPolygonPoints[0][1] - minY
						)
						for (let i = 1; i < scaledPolygonPoints.length; i++) {
							clippedCtx.lineTo(
								scaledPolygonPoints[i][0] - minX,
								scaledPolygonPoints[i][1] - minY
							)
						}
						clippedCtx.closePath()
						clippedCtx.clip()
						clippedCtx.drawImage(
							compositeCanvas,
							minX,
							minY,
							width,
							height,
							0,
							0,
							width,
							height
						)

						const imageData = clippedCtx.getImageData(0, 0, width, height)
						const tiffBuffer = UTIF.encodeImage(imageData.data, width, height)
						const tiffBlob = new Blob([tiffBuffer], { type: 'image/tiff' })

						console.log(
							`Создан TIFF-blob для ${filename}, размер: ${tiffBuffer.byteLength} байт, масштаб: ${scale}x, размеры: ${width}x${height}`
						)

						tempMap.setTarget(null)
						document.body.removeChild(tempContainer)

						resolve({
							blob: tiffBlob,
							filename: filename,
						})
					} catch (error) {
						console.error('Ошибка при создании TIFF:', error)
						reject(error)
					}
				})

				tempMap.renderSync()
			} catch (error) {
				console.error('Ошибка при настройке карты:', error)
				reject(error)
			}
		})
	}

	const handleSave = async () => {
		if (!mapRef.current) return

		setIsExporting(true)

		try {
			await fetch('http://localhost:3001/api/delete-files', {
				method: 'POST',
			})
			console.log('Предыдущие файлы удалены')

			const mapSize = mapRef.current.getSize()

			const layersToSave = []

			// Добавляем выбранные слои в массив
			if (saveLayerOptions.osm) {
				layersToSave.push({
					layer: new TileLayer({
						source: new OSM({ crossOrigin: 'anonymous' }),
						visible: true,
					}),
					filename: 'osm.tiff',
					description: 'OSM',
				})
			}
			if (saveLayerOptions.states) {
				layersToSave.push({
					layer: createWMSLayer('topp:states', true),
					filename: 'states.tiff',
					description: 'States',
				})
			}
			if (saveLayerOptions.roads) {
				layersToSave.push({
					layer: createWMSLayer('topp:tasmania_roads', true),
					filename: 'roads.tiff',
					description: 'Roads',
				})
			}
			if (saveLayerOptions.airports) {
				layersToSave.push({
					layer: new VectorLayer({
						source: cloneVectorSource(pointsLayerRef.current.getSource()),
						visible: true,
					}),
					filename: 'airports.tiff',
					description: 'Airports',
				})
			}
			if (saveLayerOptions.manual) {
				layersToSave.push({
					layer: new VectorLayer({
						source: cloneVectorSource(manualPointsLayerRef.current.getSource()),
						visible: true,
					}),
					filename: 'manual.tiff',
					description: 'Manual Points',
				})
			}
			if (saveLayerOptions.route) {
				layersToSave.push({
					layer: new VectorLayer({
						source: cloneVectorSource(routeLayerRef.current.getSource()),
						visible: true,
					}),
					filename: 'route.tiff',
					description: 'Route',
				})
			}
			if (saveLayerOptions.polygon) {
				layersToSave.push({
					layer: new VectorLayer({
						source: cloneVectorSource(polygonLayerRef.current.getSource()),
						visible: true,
					}),
					filename: 'polygon.tiff',
					description: 'Polygon',
				})
			}

			const selectedLayers = []
			layersToSave.forEach(item => {
				selectedLayers.push({
					filename: item.filename,
					description: item.description,
				})
			})

			const uploadTiffFiles = async () => {
				try {
					setMergeStatus({
						success: true,
						message: 'Подготовка файлов...',
					})

					const tiffPromises = layersToSave.map(item =>
						saveLayerToTiff(item.layer, item.filename, mapSize)
					)

					const tiffFilesToUpload = await Promise.all(tiffPromises)

					console.log(
						`Создано файлов для загрузки: ${tiffFilesToUpload.length}`
					)

					if (tiffFilesToUpload.length === 0) {
						throw new Error('Нет файлов для отправки на сервер')
					}

					setMergeStatus({
						success: true,
						message: 'Загрузка файлов на сервер...',
					})

					const formData = new FormData()

					tiffFilesToUpload.forEach((file, index) => {
						console.log(`Добавление файла в formData: ${file.filename}`)
						formData.append(
							'tiffFiles',
							new Blob([file.blob], { type: 'image/tiff' }),
							file.filename
						)
					})

					// Загружаем файлы на сервер
					console.log('Отправка запроса на сервер...')
					const uploadResponse = await fetch(
						'http://localhost:3001/api/upload-tiff',
						{
							method: 'POST',
							body: formData,
						}
					)

					console.log('Статус ответа:', uploadResponse.status)

					if (!uploadResponse.ok) {
						const errorText = await uploadResponse.text()
						console.error('Ошибка ответа сервера:', errorText)
						throw new Error(
							`Ошибка при загрузке файлов на сервер (${uploadResponse.status})`
						)
					}

					const responseData = await uploadResponse.json()
					console.log('Ответ от сервера:', responseData)

					setMergeStatus({
						success: true,
						message: 'Обработка файлов...',
					})

					const geographicCoords = polygonPoints.map(coord => toLonLat(coord))

					const mergeRequest = {
						layers: selectedLayers,
						polygon_coords: geographicCoords,
					}

					const mergeResponse = await fetch(
						'http://localhost:3001/api/merge-tiff',
						{
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(mergeRequest),
						}
					)

					if (!mergeResponse.ok) {
						throw new Error('Ошибка при объединении слоев')
					}

					const mergeResult = await mergeResponse.json()

					setMergeStatus({
						success: true,
						message: `Слои успешно объединены (масштаб: ${exportScale}x)`,
						downloadFiles: mergeResult.files,
					})

				} catch (error) {
					console.error('Ошибка:', error)
					setMergeStatus({
						success: false,
						message: `Ошибка: ${error.message}`,
					})
					setTimeout(() => setMergeStatus(null), 5000)
				} finally {
					setIsExporting(false)
				}
			}

			uploadTiffFiles()
		} catch (error) {
			console.error('Ошибка:', error)
			setMergeStatus({
				success: false,
				message: `Ошибка при сохранении: ${error.message}`,
			})
			setTimeout(() => setMergeStatus(null), 5000)
		}
	}

	const downloadAllFilesAsZip = async files => {
		try {
			setMergeStatus({
				...mergeStatus,
				message: 'Подготовка архива для скачивания...',
			})

			const filenames = files.map(file => file.filename)

			// Отправляем запрос на скачивание архива
			const response = await fetch(
				'http://localhost:3001/api/download-all-zip',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ filenames, deleteAfterDownload: true }),
				}
			)

			if (!response.ok) {
				throw new Error('Ошибка при создании архива')
			}

			const blob = await response.blob()

			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.style.display = 'none'
			a.href = url
			a.download = 'all_layers.zip'
			document.body.appendChild(a)
			a.click()

			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)

			// Задержка перед закрытием меню, чтобы пользователь понял что файл скачивается
			setTimeout(() => {
				setMergeStatus(null)
			}, 1500)
		} catch (error) {
			console.error('Ошибка при скачивании архива:', error)
			setMergeStatus({
				...mergeStatus,
				message: `Ошибка при скачивании архива: ${error.message}`,
			})
		}
	}

	const handleCloseMenu = async () => {
		try {
			await fetch('http://localhost:3001/api/delete-files', {
				method: 'POST',
			})
			setMergeStatus(null)
		} catch (error) {
			console.error('Ошибка при закрытии и очистке файлов:', error)
			setMergeStatus(null)
		}
	}

	return (
		<div className='map1-container'>
			<div className='map1-menu'>
				<div className='checkbox-group'>
					<label>
						<input
							type='checkbox'
							checked={statesChecked}
							onChange={e => setStatesChecked(e.target.checked)}
						/>
						<span>topp:states</span>
					</label>
					<label>
						<input
							type='checkbox'
							checked={roadsChecked}
							onChange={e => setRoadsChecked(e.target.checked)}
						/>
						<span>topp:tasmania_roads</span>
					</label>
					<label>
						<input
							type='checkbox'
							checked={pointsChecked}
							onChange={e => setPointsChecked(e.target.checked)}
						/>
						<span>Аэропорты</span>
					</label>
					<label>
						<input
							type='checkbox'
							checked={manualPointsChecked}
							onChange={e => setManualPointsChecked(e.target.checked)}
						/>
						<span>Точки</span>
					</label>
				</div>

				<button className='login-button2' onClick={handleLogin}>
					Войти
				</button>
			</div>
			<div ref={mapContainerRef} className='map1'></div>
			<button
				className={`add-point-button ${isAddingPoint ? 'active' : ''}`}
				onClick={e => {
					setIsAddingPoint(prev => !prev)
					e.currentTarget.blur()
				}}
			>
				<AddLocationIcon fontSize='medium' />
			</button>
			<button
				className={`delete-point-button ${isDeletingPoint ? 'active' : ''}`}
				onClick={e => {
					setIsDeletingPoint(prev => !prev)
					e.currentTarget.blur()
				}}
			>
				<DeleteOutlineIcon fontSize='medium' />
			</button>
			<button
				className={`select-airports-button ${
					isSelectingAirports ? 'active' : ''
				}`}
				onClick={e => {
					selectedAirports.forEach(feature => {
						unhighlightFeature(feature)
					})
					setSelectedAirports([])
					if (routeLayerRef.current) {
						routeLayerRef.current.getSource().clear()
					}
					setRouteDistance(null)
					setIsSelectingAirports(!isSelectingAirports)
					e.currentTarget.blur()
				}}
			>
				<StraightenIcon fontSize='medium' />
			</button>
			<button
				className={`select-polygon-button ${
					isSelectingPolygon ? 'active' : ''
				}`}
				onClick={e => {
					if (isSelectingPolygon) {
						setPolygonPoints([])
						if (polygonLayerRef.current) {
							polygonLayerRef.current.getSource().clear()
						}
					}
					setIsSelectingPolygon(!isSelectingPolygon)
					e.currentTarget.blur()
				}}
			>
				<CropFreeIcon fontSize='medium' />
			</button>
			{routeDistance !== null && (
				<div className='route-distance'>
					Расстояние: {routeDistance.toFixed(2)} км
				</div>
			)}

			{isShowingSaveMenu && (
				<div className='save-menu'>
					<h3>Сохранить область</h3>
					<div className='scale-selector'>
						<label>Масштаб экспорта:</label>
						<select
							value={exportScale}
							onChange={e => setExportScale(e.target.value)}
						>
							<option value='0.5'>0.5x (Уменьшенное разрешение)</option>
							<option value='1.0'>1.0x (Стандартное разрешение)</option>
							<option value='1.5'>1.5x (Повышенное разрешение)</option>
							<option value='2.0'>2.0x (Высокое разрешение)</option>
							<option value='2.5'>2.5x (Очень высокое разрешение)</option>
							<option value='3.0'>3.0x (Сверхвысокое разрешение)</option>
							<option value='3.5'>3.5x (Максимальное разрешение)</option>
							<option value='4.0'>4.0x (Наивысшее разрешение)</option>
						</select>
						<small className='scale-hint'>
							Чем выше масштаб, тем детальнее изображение, но больше время
							обработки.
						</small>
					</div>

					<p>Выберите слои для сохранения:</p>
					<div>
						<label>
							<input
								type='checkbox'
								checked={saveLayerOptions.osm}
								onChange={e =>
									setSaveLayerOptions({
										...saveLayerOptions,
										osm: e.target.checked,
									})
								}
							/>
							Base Map (OSM)
						</label>
						<label>
							<input
								type='checkbox'
								checked={saveLayerOptions.states}
								onChange={e =>
									setSaveLayerOptions({
										...saveLayerOptions,
										states: e.target.checked,
									})
								}
							/>
							topp:states
						</label>
						<label>
							<input
								type='checkbox'
								checked={saveLayerOptions.roads}
								onChange={e =>
									setSaveLayerOptions({
										...saveLayerOptions,
										roads: e.target.checked,
									})
								}
							/>
							topp:tasmania_roads
						</label>
						<label>
							<input
								type='checkbox'
								checked={saveLayerOptions.airports}
								onChange={e =>
									setSaveLayerOptions({
										...saveLayerOptions,
										airports: e.target.checked,
									})
								}
							/>
							Аэропорты
						</label>
						<label>
							<input
								type='checkbox'
								checked={saveLayerOptions.manual}
								onChange={e =>
									setSaveLayerOptions({
										...saveLayerOptions,
										manual: e.target.checked,
									})
								}
							/>
							Точки
						</label>
						<label>
							<input
								type='checkbox'
								checked={saveLayerOptions.route}
								onChange={e =>
									setSaveLayerOptions({
										...saveLayerOptions,
										route: e.target.checked,
									})
								}
							/>
							Маршрут
						</label>
						<label>
							<input
								type='checkbox'
								checked={saveLayerOptions.polygon}
								onChange={e =>
									setSaveLayerOptions({
										...saveLayerOptions,
										polygon: e.target.checked,
									})
								}
							/>
							Полигон
						</label>
					</div>
					<div className='buttons'>
						<button onClick={handleSave} disabled={isExporting}>
							{isExporting ? 'Сохранение...' : 'Сохранить'}
						</button>
						<button
							onClick={() => setIsShowingSaveMenu(false)}
							disabled={isExporting}
						>
							Отмена
						</button>
					</div>
				</div>
			)}
			{mergeStatus && (
				<div
					className={`merge-notification ${
						mergeStatus.success ? 'success' : 'error'
					}`}
				>
					<div className='merge-notification-header'>
						<p>{mergeStatus.message}</p>
						<button className='close-button' onClick={handleCloseMenu}>
							✕
						</button>
					</div>
					{mergeStatus.downloadFiles && (
						<div className='download-links'>
							<div className='download-options'>
								<button
									className='download-all-button'
									onClick={() =>
										downloadAllFilesAsZip(mergeStatus.downloadFiles)
									}
								>
									Скачать все файлы архивом
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export default Map1
