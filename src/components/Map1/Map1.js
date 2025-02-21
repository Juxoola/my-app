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
import './Map1.css'

const createWMSLayer = (layerName, visible) => {
	return new TileLayer({
		source: new TileWMS({
			url:
				'http://localhost:8080/geoserver/wms',
			params: { LAYERS: layerName, TILED: true },
			serverType: 'geoserver',
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

	const [statesChecked, setStatesChecked] = useState(false)
	const [roadsChecked, setRoadsChecked] = useState(false)
	const [pointsChecked, setPointsChecked] = useState(true)

	useEffect(() => {
		const osmLayer = new TileLayer({
			source: new OSM(),
		})

		statesLayerRef.current = createWMSLayer('topp:states', statesChecked)
		roadsLayerRef.current = createWMSLayer('topp:tasmania_roads', roadsChecked)

		pointsLayerRef.current = new VectorLayer({
			source: new VectorSource(),
			visible: pointsChecked,
		})

		const map = new Map({
			target: mapContainerRef.current,
			layers: [
				osmLayer,
				statesLayerRef.current,
				roadsLayerRef.current,
				pointsLayerRef.current,
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
		if (pointsLayerRef.current) {
			pointsLayerRef.current.setVisible(pointsChecked)
		}
	}, [statesChecked, roadsChecked, pointsChecked])

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

	const handleLogin = () => {
		navigate('/login')
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
				</div>
				<button className='login-button2' onClick={handleLogin}>
					Войти
				</button>
			</div>
			<div ref={mapContainerRef} className='map1'></div>
		</div>
	)
}

export default Map1
