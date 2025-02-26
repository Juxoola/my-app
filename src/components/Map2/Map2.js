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
import { getDistance } from 'geolib'
import { Permutation } from 'js-combinatorics'
import './Map2.css'


const createWMSLayer = (layerName, visible) => {
	return new TileLayer({
		source: new TileWMS({
			url: 'http://localhost:8080/geoserver/wms',
			params: { LAYERS: layerName, TILED: true },
			serverType: 'geoserver',
		}),
		visible: visible,
	})
}
const Map2 = () => {
	const mapContainerRef = useRef(null)
	const mapRef = useRef(null)

	const statesLayerRef = useRef(null)
	const roadsLayerRef = useRef(null)
	const waterLayerRef = useRef(null)
	const worldLayerRef = useRef(null)

	const pointsLayerRef = useRef(null)
	const manualPointsLayerRef = useRef(null)
	const routeLayerRef = useRef(null)

	const [statesChecked, setStatesChecked] = useState(false)
	const [roadsChecked, setRoadsChecked] = useState(false)
	const [waterChecked, setWaterChecked] = useState(false)
	const [worldChecked, setWorldChecked] = useState(false)

	const [pointsChecked, setPointsChecked] = useState(true)
	const [manualPointsChecked, setManualPointsChecked] = useState(true)

	const [isAddingPoint, setIsAddingPoint] = useState(false)
	const [isDeletingPoint, setIsDeletingPoint] = useState(false)

	const [isSelectingAirports, setIsSelectingAirports] = useState(false)
	const [selectedAirports, setSelectedAirports] = useState([])
	const [routeDistance, setRouteDistance] = useState(null)

	useEffect(() => {
		const osmLayer = new TileLayer({
			source: new OSM(),
		})

		statesLayerRef.current = createWMSLayer('topp:states', statesChecked)
		roadsLayerRef.current = createWMSLayer('topp:tasmania_roads', roadsChecked)
		waterLayerRef.current = createWMSLayer(
			'topp:tasmania_water_bodies',
			waterChecked
		)
		worldLayerRef.current = createWMSLayer('ne:world', worldChecked)

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

		const map = new Map({
			target: mapContainerRef.current,
			layers: [
				osmLayer,
				worldLayerRef.current,
				statesLayerRef.current,
				roadsLayerRef.current,
				waterLayerRef.current,
				pointsLayerRef.current,
				manualPointsLayerRef.current,
				routeLayerRef.current,
			],
			view: new View({
				center: [0, 0],
				zoom: 2,
			}),
		})

		mapRef.current = map

		return () => map.setTarget(null)
	}, [])

	useEffect(() => {
		if (statesLayerRef.current) {
			statesLayerRef.current.setVisible(statesChecked)
		}
		if (roadsLayerRef.current) {
			roadsLayerRef.current.setVisible(roadsChecked)
		}
		if (waterLayerRef.current) {
			waterLayerRef.current.setVisible(waterChecked)
		}
		if (worldLayerRef.current) {
			worldLayerRef.current.setVisible(worldChecked)
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
	}, [
		statesChecked,
		roadsChecked,
		waterChecked,
		worldChecked,
		pointsChecked,
		manualPointsChecked,
	])

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
					// if (
					// 	flight.departure_coords &&
					// 	typeof flight.departure_coords === 'object' &&
					// 	flight.departure_coords.x != null &&
					// 	flight.departure_coords.y != null &&
					// 	flight.arrival_coords &&
					// 	typeof flight.arrival_coords === 'object' &&
					// 	flight.arrival_coords.x != null &&
					// 	flight.arrival_coords.y != null
					// ) {
					// 	const lineFeature = new Feature({
					// 		geometry: new LineString([
					// 			fromLonLat([
					// 				flight.departure_coords.x,
					// 				flight.departure_coords.y,
					// 			]),
					// 			fromLonLat([flight.arrival_coords.x, flight.arrival_coords.y]),
					// 		]),
					// 	})
					// 	lineFeature.setStyle(
					// 		new Style({
					// 			stroke: new Stroke({
					// 				color: 'rgba(0, 0, 0, 0.8)',
					// 				width: 2,
					// 			}),
					// 		})
					// 	)
					// 	features.push(lineFeature)
					// }
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
			let max = 4

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

	return (
		<div className='map2-container'>
			<div className='map2-menu'>
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
							checked={waterChecked}
							onChange={e => setWaterChecked(e.target.checked)}
						/>
						<span>topp:tasmania_water_bodies</span>
					</label>
					<label>
						<input
							type='checkbox'
							checked={worldChecked}
							onChange={e => setWorldChecked(e.target.checked)}
						/>
						<span>ne:world</span>
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
			</div>
			<div ref={mapContainerRef} className='map2'></div>
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
					handleToggleSelectAirports()
					e.currentTarget.blur()
				}}
			>
				<StraightenIcon fontSize='medium' />
			</button>
			{routeDistance !== null && (
				<div className='route-distance'>
					Расстояние: {routeDistance.toFixed(2)} км
				</div>
			)}
		</div>
	)
}

export default Map2
