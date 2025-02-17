import React, { useEffect, useRef, useState } from 'react'
import 'ol/ol.css'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import TileWMS from 'ol/source/TileWMS'
import { useNavigate } from 'react-router-dom'
import './Map1.css'

const createWMSLayer = (layerName, visible) => {
	return new TileLayer({
		source: new TileWMS({
			url:
				process.env.REACT_APP_GEOSERVER_URL ||
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

	const [statesChecked, setStatesChecked] = useState(false)
	const [roadsChecked, setRoadsChecked] = useState(false)

	useEffect(() => {
		const osmLayer = new TileLayer({
			source: new OSM(),
		})

		statesLayerRef.current = createWMSLayer('topp:states', statesChecked)
		roadsLayerRef.current = createWMSLayer('topp:tasmania_roads', roadsChecked)

		const map = new Map({
			target: mapContainerRef.current,
			layers: [osmLayer, statesLayerRef.current, roadsLayerRef.current],
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
	}, [statesChecked, roadsChecked])

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
				</div>
				<button type='button' onClick={handleLogin} className='login-button2'>
					Вход
				</button>
			</div>
			<div ref={mapContainerRef} className='map1'></div>
		</div>
	)
}

export default Map1
